"use server";

import { signIn, signOut, hashPassword } from "../auth";
import { db } from "../db";
import { users, passwordResetTokens, emailVerificationCodes } from "../schemas/users";
import { notificationPreferences } from "../schemas/notifications";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { sendWelcomeEmail, sendVerificationCodeEmail, sendPasswordResetEmail } from "./email";
import crypto from "crypto";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  emailNotifications: z.boolean().optional().default(true),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AuthState = {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  userId?: string;
};

// Generate 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate secure token for password reset
function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ============ SIGN UP ============

export async function signUpAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  try {
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      emailNotifications: formData.get("emailNotifications") === "on",
    };

    const parsed = signUpSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        success: false,
        error: firstError?.message || "Invalid input",
      };
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (existingUser) {
      // If user exists but email not verified, resend code
      if (!existingUser.emailVerified) {
        await sendVerificationCode(existingUser.id, existingUser.email);
        return {
          success: true,
          requiresVerification: true,
          userId: existingUser.id,
        };
      }
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }

    // Hash password and create user (email not verified yet)
    const passwordHash = await hashPassword(parsed.data.password);
    
    const [newUser] = await db.insert(users).values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "user",
      // emailVerified is null by default
    }).returning();

    if (newUser) {
      // Create default notification preferences
      await db.insert(notificationPreferences).values({
        userId: newUser.id,
        emailOrderUpdates: true,
        emailStockAlerts: parsed.data.emailNotifications,
        emailQuoteReady: true,
        emailPromotions: false,
      });

      // Send verification code
      await sendVerificationCode(newUser.id, newUser.email);

      return {
        success: true,
        requiresVerification: true,
        userId: newUser.id,
      };
    }

    return { success: false, error: "Failed to create account" };
  } catch (error) {
    console.error("Sign up error:", error);
    return {
      success: false,
      error: "Failed to create account. Please try again.",
    };
  }
}

// ============ EMAIL VERIFICATION ============

async function sendVerificationCode(userId: string, email: string) {
  // Delete any existing codes for this user
  await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId));

  // Generate new code
  const code = generateVerificationCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store code
  await db.insert(emailVerificationCodes).values({
    userId,
    code,
    expires,
  });

  // Send email
  await sendVerificationCodeEmail(email, code);
}

export async function verifyEmailAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  try {
    const userId = formData.get("userId") as string;
    const code = formData.get("code") as string;

    if (!userId || !code) {
      return { success: false, error: "Missing verification data" };
    }

    // Find valid code
    const verificationCode = await db.query.emailVerificationCodes.findFirst({
      where: and(
        eq(emailVerificationCodes.userId, userId),
        eq(emailVerificationCodes.code, code),
        gt(emailVerificationCodes.expires, new Date())
      ),
    });

    if (!verificationCode) {
      return { success: false, error: "Invalid or expired verification code" };
    }

    // Mark email as verified
    await db.update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, userId));

    // Delete used code
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId));

    // Get user for welcome email
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user) {
      // Send welcome email
      sendWelcomeEmail(user.email, user.name || "there").catch(console.error);
    }

    return { success: true };
  } catch (error) {
    console.error("Verification error:", error);
    return { success: false, error: "Verification failed. Please try again." };
  }
}

export async function resendVerificationCodeAction(userId: string): Promise<AuthState> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.emailVerified) {
      return { success: false, error: "Email already verified" };
    }

    await sendVerificationCode(user.id, user.email);
    return { success: true };
  } catch (error) {
    console.error("Resend code error:", error);
    return { success: false, error: "Failed to resend code" };
  }
}

// ============ SIGN IN ============

export async function signInAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  try {
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const parsed = signInSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return {
        success: false,
        error: firstError?.message || "Invalid input",
      };
    }

    // Check if user exists and email is verified
    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (user && !user.emailVerified) {
      // Resend verification code
      await sendVerificationCode(user.id, user.email);
      return {
        success: false,
        requiresVerification: true,
        userId: user.id,
        error: "Please verify your email first",
      };
    }

    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (!result) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return {
      success: false,
      error: "Invalid email or password",
    };
  }
}

// ============ FORGOT PASSWORD ============

export async function forgotPasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  try {
    const email = formData.get("email") as string;

    if (!email || !z.string().email().safeParse(email).success) {
      return { success: false, error: "Please enter a valid email address" };
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true };
    }

    // Delete any existing tokens for this email
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

    // Generate token
    const token = generateResetToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await db.insert(passwordResetTokens).values({
      email,
      token,
      expires,
    });

    // Send email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    return { success: true };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { success: false, error: "Failed to send reset email. Please try again." };
  }
}

// ============ RESET PASSWORD ============

export async function resetPasswordAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  try {
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!token) {
      return { success: false, error: "Invalid reset link" };
    }

    if (!password || password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match" };
    }

    // Find valid token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expires, new Date())
      ),
    });

    if (!resetToken) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, resetToken.email));

    // Delete used token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, error: "Failed to reset password. Please try again." };
  }
}

// ============ SIGN OUT ============

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
