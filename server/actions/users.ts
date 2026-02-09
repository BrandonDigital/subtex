"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { users, passwordResetTokens } from "../schemas/users";
import { orders } from "../schemas/orders";
import { eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendPasswordResetEmail, sendGeneratedPasswordEmail } from "./email";
import crypto from "crypto";

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

export type UserWithOrderCount = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  createdAt: Date;
  orderCount: number;
};

export async function getUsers(): Promise<UserWithOrderCount[]> {
  await requireAdmin();

  // Get users with order counts using a subquery
  const usersWithOrders = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      orderCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${orders} 
        WHERE ${orders.userId} = ${users.id}
      )`.as("order_count"),
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return usersWithOrders;
}

export async function getUserRoleStats() {
  await requireAdmin();

  const allUsers = await db.select({ role: users.role }).from(users);

  return {
    totalUsers: allUsers.length,
    adminCount: allUsers.filter((u) => u.role === "admin").length,
    userCount: allUsers.filter((u) => u.role === "user").length,
  };
}

export async function updateUserRole(
  userId: string,
  newRole: "user" | "admin"
) {
  const admin = await requireAdmin();

  // Prevent self-demotion
  if (admin.id === userId && newRole === "user") {
    throw new Error("You cannot remove your own admin privileges");
  }

  const [updatedUser] = await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/dashboard/users");
  return updatedUser;
}

export async function verifyUserEmail(userId: string) {
  await requireAdmin();

  const [updatedUser] = await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/dashboard/users");
  return updatedUser;
}

// Fix OAuth users who don't have emailVerified set
export async function fixOAuthUsersEmailVerification() {
  await requireAdmin();

  // Find users who signed in via OAuth (have accounts entry) but no emailVerified
  const oauthUsers = await db.execute(sql`
    SELECT DISTINCT u.id 
    FROM users u
    INNER JOIN accounts a ON a.user_id = u.id
    WHERE u.email_verified IS NULL
    AND a.provider IN ('google', 'github', 'facebook')
  `);

  const userIds = (oauthUsers.rows as { id: string }[]).map((r) => r.id);

  if (userIds.length > 0) {
    for (const userId of userIds) {
      await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, userId));
    }
  }

  revalidatePath("/dashboard/users");
  return { fixed: userIds.length };
}

// Get a single user by ID
export async function getUserById(userId: string) {
  await requireAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return user;
}

// Admin update user profile
export async function adminUpdateUser(
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string | null;
    role?: "user" | "admin";
  }
) {
  const admin = await requireAdmin();

  // Prevent self-demotion
  if (admin.id === userId && data.role === "user") {
    throw new Error("You cannot remove your own admin privileges");
  }

  // Check if email is being changed and if it's already taken
  if (data.email) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existingUser && existingUser.id !== userId) {
      throw new Error("This email is already in use by another account");
    }
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  revalidatePath("/dashboard/users");
  return updatedUser;
}

// Generate secure token for password reset
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Generate a random password
function generateRandomPassword(length: number = 12): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

// Send password reset link to user (admin initiated)
export async function adminSendPasswordResetLink(userId: string) {
  await requireAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Delete any existing tokens for this email
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.email, user.email));

  // Generate token
  const token = generateResetToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store token
  await db.insert(passwordResetTokens).values({
    email: user.email,
    token,
    expires,
  });

  // Send email
  const resetUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"
  }/reset-password?token=${token}`;
  const emailResult = await sendPasswordResetEmail(user.email, resetUrl);

  if (!emailResult.success) {
    throw new Error("Failed to send password reset email");
  }

  return { success: true };
}

// Generate new password and send reset link to user
// Note: Since BetterAuth handles password hashing internally, we now send a reset link
// This is more secure and follows best practices
export async function adminGeneratePassword(userId: string) {
  await requireAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Delete any existing tokens for this email
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.email, user.email));

  // Generate token
  const token = generateResetToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store token
  await db.insert(passwordResetTokens).values({
    email: user.email,
    token,
    expires,
  });

  // Send password reset email instead
  const resetUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"
  }/reset-password?token=${token}`;
  const emailResult = await sendPasswordResetEmail(user.email, resetUrl);

  if (!emailResult.success) {
    throw new Error("Failed to send password reset email");
  }

  revalidatePath("/dashboard/users");
  return { success: true };
}
