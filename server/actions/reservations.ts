"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import {
  reservations,
  products,
  type NewReservation,
} from "../schemas/products";
import { cartItems } from "../schemas/cart";
import { notifications, type NewNotification } from "../schemas/notifications";
import { eq, and, lt, gt, inArray, sql, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  pusher,
  getInventoryChannel,
  PUSHER_EVENTS,
  type StockReservedEvent,
  type StockReleasedEvent,
} from "@/lib/pusher";

// Reservation duration in minutes
const RESERVATION_DURATION_MINUTES = 5;

export interface ReservationItem {
  productId: string;
  quantity: number;
}

export interface CreateReservationResult {
  success: boolean;
  reservationIds?: string[];
  expiresAt?: Date;
  error?: string;
}

// Get the current user's session or return session ID for guests
async function getSessionInfo(): Promise<{
  userId?: string;
  sessionId?: string;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id) {
    return { userId: session.user.id };
  }
  return {};
}

// Create reservations for checkout items
export async function createReservationsForCheckout(
  items: ReservationItem[],
  guestSessionId?: string
): Promise<CreateReservationResult> {
  try {
    const { userId } = await getSessionInfo();
    const sessionId = userId ? undefined : guestSessionId;

    if (!userId && !sessionId) {
      return { success: false, error: "Session identification required" };
    }

    // First, cleanup any expired reservations
    await cleanupExpiredReservations();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_DURATION_MINUTES);

    // Release any existing reservations from this user/session
    if (userId) {
      await db
        .update(reservations)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(reservations.userId, userId),
            eq(reservations.status, "active")
          )
        );
    } else if (sessionId) {
      await db
        .update(reservations)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(reservations.sessionId, sessionId),
            eq(reservations.status, "active")
          )
        );
    }

    // Get product details for notifications
    const productIds = items.map((item) => item.productId);
    const productDetails = await db.query.products.findMany({
      where: inArray(products.id, productIds),
      columns: { id: true, name: true, stock: true, imageUrl: true },
    });

    const productMap = new Map(productDetails.map((p) => [p.id, p]));

    // Create new reservations
    const reservationsToInsert: NewReservation[] = items.map((item) => ({
      productId: item.productId,
      userId: userId || null,
      sessionId: sessionId || null,
      quantity: item.quantity,
      expiresAt,
      status: "active",
    }));

    const insertedReservations = await db
      .insert(reservations)
      .values(reservationsToInsert)
      .returning({ id: reservations.id });

    const reservationIds = insertedReservations.map((r) => r.id);

    // For each product, notify users who have it in their cart and trigger Pusher events
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      // Calculate available stock after this reservation
      const totalReserved = await getTotalReservedForProduct(item.productId);
      const availableStock = Math.max(0, product.stock - totalReserved);

      // Find users who have this product in their cart (excluding the reserving user)
      const usersWithProductInCart = await getUsersWithProductInCart(
        item.productId,
        userId
      );

      // Create notifications for those users
      if (usersWithProductInCart.length > 0) {
        const notificationsToInsert: NewNotification[] =
          usersWithProductInCart.map((cartUserId) => ({
            userId: cartUserId,
            type: "stock_reserved" as const,
            title: "Item in your cart is in demand!",
            message:
              availableStock > 0
                ? `Someone just reserved "${product.name}". Only ${availableStock} left in stock!`
                : `"${product.name}" in your cart has been reserved by another customer. Complete your checkout soon!`,
            link: "/checkout",
            imageUrl: product.imageUrl,
            read: false,
            emailSent: false,
          }));

        await db.insert(notifications).values(notificationsToInsert);
      }

      // Trigger Pusher event for real-time updates
      const event: StockReservedEvent = {
        productId: item.productId,
        productName: product.name,
        reservedQuantity: item.quantity,
        availableStock,
        reservedByUserId: userId,
        reservedBySessionId: sessionId,
      };

      await pusher.trigger(
        getInventoryChannel(item.productId),
        PUSHER_EVENTS.STOCK_RESERVED,
        event
      );
    }

    revalidatePath("/");

    return {
      success: true,
      reservationIds,
      expiresAt,
    };
  } catch (error) {
    console.error("Error creating reservations:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create reservations",
    };
  }
}

// Get total reserved quantity for a product
export async function getTotalReservedForProduct(
  productId: string
): Promise<number> {
  const activeReservations = await db
    .select({
      totalQuantity: sql<number>`COALESCE(SUM(${reservations.quantity}), 0)`,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.productId, productId),
        eq(reservations.status, "active"),
        gt(reservations.expiresAt, new Date())
      )
    );

  return Number(activeReservations[0]?.totalQuantity || 0);
}

// Get users who have a specific product in their cart (server-side cart only)
async function getUsersWithProductInCart(
  productId: string,
  excludeUserId?: string
): Promise<string[]> {
  let query = db
    .selectDistinct({ userId: cartItems.userId })
    .from(cartItems)
    .where(eq(cartItems.productId, productId));

  const results = await query;

  // Filter out the user who made the reservation
  return results.map((r) => r.userId).filter((id) => id !== excludeUserId);
}

// Release reservations (when user cancels or times out)
export async function releaseReservations(
  reservationIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (reservationIds.length === 0) {
      return { success: true };
    }

    // Get reservation details before releasing
    const reservationsToRelease = await db.query.reservations.findMany({
      where: and(
        inArray(reservations.id, reservationIds),
        eq(reservations.status, "active")
      ),
    });

    if (reservationsToRelease.length === 0) {
      return { success: true };
    }

    // Update reservations to cancelled
    await db
      .update(reservations)
      .set({ status: "cancelled" })
      .where(inArray(reservations.id, reservationIds));

    // Trigger Pusher events for stock availability
    const productIds = [
      ...new Set(reservationsToRelease.map((r) => r.productId)),
    ];

    for (const productId of productIds) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
        columns: { id: true, name: true, stock: true },
      });

      if (!product) continue;

      const totalReserved = await getTotalReservedForProduct(productId);
      const availableStock = Math.max(0, product.stock - totalReserved);

      const releasedQuantity = reservationsToRelease
        .filter((r) => r.productId === productId)
        .reduce((sum, r) => sum + r.quantity, 0);

      const event: StockReleasedEvent = {
        productId,
        productName: product.name,
        releasedQuantity,
        availableStock,
      };

      await pusher.trigger(
        getInventoryChannel(productId),
        PUSHER_EVENTS.STOCK_RELEASED,
        event
      );
    }

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Error releasing reservations:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to release reservations",
    };
  }
}

// Release reservations by user/session (when user leaves checkout)
export async function releaseUserReservations(
  guestSessionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await getSessionInfo();
    const sessionId = userId ? undefined : guestSessionId;

    if (!userId && !sessionId) {
      return { success: false, error: "Session identification required" };
    }

    // Get active reservations for this user/session
    let activeReservations;
    if (userId) {
      activeReservations = await db.query.reservations.findMany({
        where: and(
          eq(reservations.userId, userId),
          eq(reservations.status, "active")
        ),
      });
    } else {
      activeReservations = await db.query.reservations.findMany({
        where: and(
          eq(reservations.sessionId, sessionId!),
          eq(reservations.status, "active")
        ),
      });
    }

    if (activeReservations.length === 0) {
      return { success: true };
    }

    return await releaseReservations(activeReservations.map((r) => r.id));
  } catch (error) {
    console.error("Error releasing user reservations:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to release reservations",
    };
  }
}

// Cleanup expired reservations (called by cron or on demand)
export async function cleanupExpiredReservations(): Promise<{
  success: boolean;
  releasedCount: number;
  error?: string;
}> {
  try {
    const now = new Date();

    // Find expired active reservations
    const expiredReservations = await db.query.reservations.findMany({
      where: and(
        eq(reservations.status, "active"),
        lt(reservations.expiresAt, now)
      ),
    });

    if (expiredReservations.length === 0) {
      return { success: true, releasedCount: 0 };
    }

    // Update to expired status
    await db
      .update(reservations)
      .set({ status: "expired" })
      .where(
        and(eq(reservations.status, "active"), lt(reservations.expiresAt, now))
      );

    // Trigger Pusher events for each product
    const productIds = [
      ...new Set(expiredReservations.map((r) => r.productId)),
    ];

    for (const productId of productIds) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
        columns: { id: true, name: true, stock: true },
      });

      if (!product) continue;

      const totalReserved = await getTotalReservedForProduct(productId);
      const availableStock = Math.max(0, product.stock - totalReserved);

      const releasedQuantity = expiredReservations
        .filter((r) => r.productId === productId)
        .reduce((sum, r) => sum + r.quantity, 0);

      const event: StockReleasedEvent = {
        productId,
        productName: product.name,
        releasedQuantity,
        availableStock,
      };

      await pusher.trigger(
        getInventoryChannel(productId),
        PUSHER_EVENTS.STOCK_RELEASED,
        event
      );
    }

    return { success: true, releasedCount: expiredReservations.length };
  } catch (error) {
    console.error("Error cleaning up expired reservations:", error);
    return {
      success: false,
      releasedCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cleanup reservations",
    };
  }
}

// Mark reservations as completed after successful payment
export async function completeReservations(
  checkoutSessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update the checkout session ID and mark as completed
    await db
      .update(reservations)
      .set({
        status: "completed",
        checkoutSessionId,
      })
      .where(eq(reservations.checkoutSessionId, checkoutSessionId));

    return { success: true };
  } catch (error) {
    console.error("Error completing reservations:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to complete reservations",
    };
  }
}

// Update reservations with Stripe checkout session ID
export async function linkReservationsToCheckout(
  reservationIds: string[],
  checkoutSessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(reservations)
      .set({ checkoutSessionId })
      .where(inArray(reservations.id, reservationIds));

    return { success: true };
  } catch (error) {
    console.error("Error linking reservations to checkout:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to link reservations",
    };
  }
}

// Get user's active reservation expiry time
export async function getUserReservationExpiry(
  guestSessionId?: string
): Promise<Date | null> {
  const { userId } = await getSessionInfo();
  const sessionId = userId ? undefined : guestSessionId;

  if (!userId && !sessionId) {
    return null;
  }

  let reservation;
  if (userId) {
    reservation = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.userId, userId),
        eq(reservations.status, "active")
      ),
      columns: { expiresAt: true },
      orderBy: (r, { asc }) => [asc(r.expiresAt)],
    });
  } else {
    reservation = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.sessionId, sessionId!),
        eq(reservations.status, "active")
      ),
      columns: { expiresAt: true },
      orderBy: (r, { asc }) => [asc(r.expiresAt)],
    });
  }

  return reservation?.expiresAt || null;
}

// Get available stock for a product (total stock - active reservations)
export async function getAvailableStock(productId: string): Promise<number> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { stock: true },
  });

  if (!product) {
    return 0;
  }

  const totalReserved = await getTotalReservedForProduct(productId);
  return Math.max(0, product.stock - totalReserved);
}

// Get available stock for multiple products
export async function getAvailableStockBulk(
  productIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  if (productIds.length === 0) {
    return result;
  }

  // Get all products
  const productsData = await db.query.products.findMany({
    where: inArray(products.id, productIds),
    columns: { id: true, stock: true },
  });

  // Get all active reservations for these products
  const activeReservations = await db
    .select({
      productId: reservations.productId,
      totalReserved: sql<number>`COALESCE(SUM(${reservations.quantity}), 0)`,
    })
    .from(reservations)
    .where(
      and(
        inArray(reservations.productId, productIds),
        eq(reservations.status, "active"),
        gt(reservations.expiresAt, new Date())
      )
    )
    .groupBy(reservations.productId);

  const reservedMap = new Map(
    activeReservations.map((r) => [r.productId, Number(r.totalReserved)])
  );

  // Calculate available stock for each product
  for (const product of productsData) {
    const reserved = reservedMap.get(product.id) || 0;
    result.set(product.id, Math.max(0, product.stock - reserved));
  }

  return result;
}
