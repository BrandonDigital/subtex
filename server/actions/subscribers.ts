"use server";

import { db } from "@/server/db";
import { subscribers } from "@/server/schemas/subscribers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  sendLaunchNotificationEmail,
  sendSubscriptionConfirmationEmail,
} from "./email";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function subscribeToLaunchNotification(email: string) {
  try {
    // Validate email
    const result = subscribeSchema.safeParse({ email });
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      // If they were previously unsubscribed, reactivate
      if (!existing[0].isActive) {
        await db
          .update(subscribers)
          .set({ isActive: true, unsubscribedAt: null })
          .where(eq(subscribers.email, normalizedEmail));

        // Send confirmation email
        await sendSubscriptionConfirmationEmail(normalizedEmail);

        return {
          success: true,
          message: "Welcome back! You've been re-subscribed.",
        };
      }
      return { success: true, message: "You're already on the list!" };
    }

    // Insert new subscriber
    await db.insert(subscribers).values({
      email: normalizedEmail,
    });

    // Send confirmation email
    await sendSubscriptionConfirmationEmail(normalizedEmail);

    return {
      success: true,
      message: "Thanks! We'll notify you when we launch.",
    };
  } catch (error) {
    console.error("Subscription error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Get all active subscribers (for admin use)
export async function getActiveSubscribers() {
  try {
    const activeSubscribers = await db
      .select()
      .from(subscribers)
      .where(eq(subscribers.isActive, true));

    return activeSubscribers;
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return [];
  }
}

// Get all active subscribers with details (for admin dashboard)
export async function getActiveSubscribersWithDetails() {
  try {
    const activeSubscribers = await db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        subscribedAt: subscribers.subscribedAt,
      })
      .from(subscribers)
      .where(eq(subscribers.isActive, true))
      .orderBy(subscribers.subscribedAt);

    return activeSubscribers;
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return [];
  }
}

// Send launch notification email to all active subscribers
export async function sendLaunchNotificationToAllSubscribers() {
  try {
    const activeSubscribers = await getActiveSubscribers();

    if (activeSubscribers.length === 0) {
      return {
        success: true,
        message: "No active subscribers to notify.",
        sent: 0,
        failed: 0,
      };
    }

    const results = await Promise.allSettled(
      activeSubscribers.map((subscriber) =>
        sendLaunchNotificationEmail(subscriber.email),
      ),
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = results.length - sent;

    // Log failed emails for debugging
    results.forEach((result, index) => {
      if (
        result.status === "rejected" ||
        (result.status === "fulfilled" && !result.value.success)
      ) {
        console.error(
          `Failed to send to ${activeSubscribers[index].email}:`,
          result.status === "rejected" ? result.reason : result.value.error,
        );
      }
    });

    return {
      success: true,
      message: `Launch notification sent to ${sent} subscriber${sent !== 1 ? "s" : ""}.${failed > 0 ? ` ${failed} failed.` : ""}`,
      sent,
      failed,
      total: activeSubscribers.length,
    };
  } catch (error) {
    console.error("Error sending launch notifications:", error);
    return {
      success: false,
      error: "Failed to send launch notifications.",
      sent: 0,
      failed: 0,
    };
  }
}
