"use server";

import { db } from "@/server/db";
import { subscribers } from "@/server/schemas/subscribers";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
        return { success: true, message: "Welcome back! You've been re-subscribed." };
      }
      return { success: true, message: "You're already on the list!" };
    }

    // Insert new subscriber
    await db.insert(subscribers).values({
      email: normalizedEmail,
    });

    return { success: true, message: "Thanks! We'll notify you when we launch." };
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
