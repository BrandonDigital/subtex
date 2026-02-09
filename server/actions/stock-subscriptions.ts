"use server";

import { db } from "@/server/db";
import { stockSubscriptions, products } from "@/server/schemas/products";
import { users } from "@/server/schemas/users";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { eq, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const subscribeSchema = z.object({
  productId: z.string().uuid(),
  email: z.string().email("Please enter a valid email address"),
});

// Subscribe to stock notifications for a product
export async function subscribeToStockNotification(productId: string, email?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userEmail = email || session?.user?.email;
    
    if (!userEmail) {
      return { success: false, error: "Email is required" };
    }
    
    // Validate input
    const result = subscribeSchema.safeParse({ productId, email: userEmail });
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message };
    }
    
    const normalizedEmail = userEmail.toLowerCase().trim();
    
    // Check if product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    
    // Check if already subscribed (and not yet notified)
    const existing = await db
      .select()
      .from(stockSubscriptions)
      .where(
        and(
          eq(stockSubscriptions.productId, productId),
          eq(stockSubscriptions.email, normalizedEmail),
          eq(stockSubscriptions.notified, false)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      return { success: true, message: "You're already on the notification list!" };
    }
    
    // Insert new subscription
    await db.insert(stockSubscriptions).values({
      userId: session?.user?.id || null,
      productId,
      email: normalizedEmail,
    });
    
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/dashboard/notifications");
    
    return {
      success: true,
      message: "We'll notify you when this product is back in stock!",
    };
  } catch (error) {
    console.error("Stock subscription error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// Check if user is subscribed to a product's stock notifications
export async function isSubscribedToStock(productId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user?.email) {
    return false;
  }
  
  const subscription = await db
    .select()
    .from(stockSubscriptions)
    .where(
      and(
        eq(stockSubscriptions.productId, productId),
        eq(stockSubscriptions.email, session.user.email.toLowerCase()),
        eq(stockSubscriptions.notified, false)
      )
    )
    .limit(1);
  
  return subscription.length > 0;
}

// Get stock subscribers grouped by product (for admin dashboard)
export async function getStockSubscribersByProduct() {
  // Group subscriptions by product with counts
  const result = await db
    .select({
      productId: stockSubscriptions.productId,
      productName: products.name,
      partNumber: products.partNumber,
      stock: products.stock,
      subscriberCount: count(stockSubscriptions.id),
    })
    .from(stockSubscriptions)
    .innerJoin(products, eq(stockSubscriptions.productId, products.id))
    .where(eq(stockSubscriptions.notified, false))
    .groupBy(
      stockSubscriptions.productId,
      products.name,
      products.partNumber,
      products.stock
    );
  
  return result;
}

// Get detailed subscribers for a specific product (for admin)
export async function getProductStockSubscribers(productId: string) {
  const subscriptions = await db
    .select({
      id: stockSubscriptions.id,
      email: stockSubscriptions.email,
      userId: stockSubscriptions.userId,
      createdAt: stockSubscriptions.createdAt,
      userName: users.name,
    })
    .from(stockSubscriptions)
    .leftJoin(users, eq(stockSubscriptions.userId, users.id))
    .where(
      and(
        eq(stockSubscriptions.productId, productId),
        eq(stockSubscriptions.notified, false)
      )
    );
  
  return subscriptions;
}

// Mark subscribers as notified (when product back in stock)
export async function notifyStockSubscribers(productId: string) {
  // TODO: Implement actual email sending here
  await db
    .update(stockSubscriptions)
    .set({ notified: true })
    .where(
      and(
        eq(stockSubscriptions.productId, productId),
        eq(stockSubscriptions.notified, false)
      )
    );
  
  revalidatePath("/dashboard/notifications");
  
  return { success: true };
}

// Unsubscribe from stock notifications
export async function unsubscribeFromStock(productId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session?.user?.email) {
    return { success: false, error: "Not authenticated" };
  }
  
  await db
    .delete(stockSubscriptions)
    .where(
      and(
        eq(stockSubscriptions.productId, productId),
        eq(stockSubscriptions.email, session.user.email.toLowerCase())
      )
    );
  
  revalidatePath("/dashboard/notifications");
  
  return { success: true };
}
