"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { notifications, type NewNotification } from "../schemas/notifications";
import { users } from "../schemas/users";
import { orders } from "../schemas/orders";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendEmail } from "./email";

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

export type RecipientGroup = "all_users" | "customers_with_orders";

// Get all users
export async function getAllUsers() {
  await requireAdmin();

  return db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
    },
  });
}

// Get users who have placed orders
export async function getUsersWithOrders() {
  await requireAdmin();

  // Get unique user IDs from orders
  const ordersWithUsers = await db
    .selectDistinct({ userId: orders.userId })
    .from(orders);

  const userIds = ordersWithUsers.map((o) => o.userId);

  if (userIds.length === 0) {
    return [];
  }

  return db.query.users.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
    },
    where: inArray(users.id, userIds),
  });
}

// Send in-app notification to multiple users
export async function sendBulkInAppNotification({
  title,
  message,
  recipientGroup,
  link,
}: {
  title: string;
  message: string;
  recipientGroup: RecipientGroup;
  link?: string;
}) {
  await requireAdmin();

  if (!title.trim() || !message.trim()) {
    return { success: false, error: "Title and message are required" };
  }

  // Get recipients based on group
  const recipients =
    recipientGroup === "all_users"
      ? await getAllUsers()
      : await getUsersWithOrders();

  if (recipients.length === 0) {
    return { success: false, error: "No recipients found" };
  }

  // Create notifications for all recipients
  const notificationsToInsert: NewNotification[] = recipients.map((user) => ({
    userId: user.id,
    type: "promotion" as const,
    title: title.trim(),
    message: message.trim(),
    link: link?.trim() || null,
    read: false,
    emailSent: false,
  }));

  await db.insert(notifications).values(notificationsToInsert);

  revalidatePath("/dashboard/notifications");

  return {
    success: true,
    recipientCount: recipients.length,
    message: `Notification sent to ${recipients.length} user${
      recipients.length === 1 ? "" : "s"
    }`,
  };
}

// Send email notification to multiple users
export async function sendBulkEmailNotification({
  title,
  message,
  recipientGroup,
}: {
  title: string;
  message: string;
  recipientGroup: RecipientGroup;
}) {
  await requireAdmin();

  if (!title.trim() || !message.trim()) {
    return { success: false, error: "Title and message are required" };
  }

  // Get recipients based on group
  const recipients =
    recipientGroup === "all_users"
      ? await getAllUsers()
      : await getUsersWithOrders();

  if (recipients.length === 0) {
    return { success: false, error: "No recipients found" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";

  // Send emails to all recipients
  const results = await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        subject: title.trim(),
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">${title.trim()}</h1>
                  <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0; white-space: pre-wrap;">
                    ${message.trim()}
                  </p>
                  <a href="${appUrl}" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                    Visit Subtex
                  </a>
                  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
                  <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                    Subtex<br>
                    16 Brewer Rd, Canning Vale, Perth, WA, 6155
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `${title.trim()}\n\n${message.trim()}\n\nVisit us at ${appUrl}`,
      })
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Also create in-app notifications to track that email was sent
  const notificationsToInsert: NewNotification[] = recipients.map((user) => ({
    userId: user.id,
    type: "promotion" as const,
    title: title.trim(),
    message: message.trim(),
    read: false,
    emailSent: true,
  }));

  await db.insert(notifications).values(notificationsToInsert);

  revalidatePath("/dashboard/notifications");

  if (failed > 0) {
    return {
      success: true,
      recipientCount: successful,
      message: `Email sent to ${successful} user${
        successful === 1 ? "" : "s"
      }. ${failed} failed.`,
    };
  }

  return {
    success: true,
    recipientCount: successful,
    message: `Email sent to ${successful} user${successful === 1 ? "" : "s"}`,
  };
}

// Get notification history (recent sent notifications grouped)
export async function getNotificationHistory() {
  await requireAdmin();

  // Get recent notifications grouped by title and createdAt (within same minute)
  const recentNotifications = await db.query.notifications.findMany({
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 100,
  });

  // Group notifications by title + approximate time (within 1 minute)
  const grouped = new Map<
    string,
    {
      id: string;
      type: string;
      title: string;
      recipients: number;
      sentAt: Date;
      emailSent: boolean;
    }
  >();

  for (const notification of recentNotifications) {
    // Create a key based on title and time rounded to nearest minute
    const timeKey = new Date(notification.createdAt);
    timeKey.setSeconds(0, 0);
    const key = `${notification.title}-${timeKey.toISOString()}`;

    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.recipients += 1;
    } else {
      grouped.set(key, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        recipients: 1,
        sentAt: notification.createdAt,
        emailSent: notification.emailSent,
      });
    }
  }

  return Array.from(grouped.values()).slice(0, 20);
}

// Get recipient counts for display
export async function getRecipientCounts() {
  await requireAdmin();

  const allUsers = await getAllUsers();
  const usersWithOrders = await getUsersWithOrders();

  return {
    allUsers: allUsers.length,
    customersWithOrders: usersWithOrders.length,
  };
}

// ============ USER-FACING NOTIFICATION FUNCTIONS ============

// Get unread notification count for current user (for navbar badge)
export async function getUnreadNotificationCount() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return 0;
  }

  const unreadNotifications = await db.query.notifications.findMany({
    where: (n, { and, eq }) =>
      and(eq(n.userId, session.user.id), eq(n.read, false)),
    columns: { id: true },
  });

  return unreadNotifications.length;
}

// Get all notifications for current user
export async function getUserNotifications() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return [];
  }

  return db.query.notifications.findMany({
    where: eq(notifications.userId, session.user.id),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit: 50,
  });
}

// Mark a single notification as read
export async function markNotificationAsRead(notificationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify the notification belongs to the user
  const notification = await db.query.notifications.findFirst({
    where: (n, { and, eq }) =>
      and(eq(n.id, notificationId), eq(n.userId, session.user.id)),
  });

  if (!notification) {
    return { success: false, error: "Notification not found" };
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, notificationId));

  revalidatePath("/notifications");

  return { success: true };
}

// Mark all notifications as read for current user
export async function markAllNotificationsAsRead() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, session.user.id));

  revalidatePath("/notifications");

  return { success: true };
}
