"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { cartItems } from "../schemas/cart";
import { users } from "../schemas/users";
import { products } from "../schemas/products";
import { eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Types for cart items from client
interface ClientCartItem {
  productId: string;
  partNumber: string;
  productName: string;
  color?: string;
  material?: string;
  size?: string;
  priceInCents: number;
  basePriceInCents: number;
  imageUrl?: string;
  quantity: number;
  holdingFeeInCents?: number;
  bulkDiscounts?: { minQuantity: number; discountPercent: number }[];
  appliedDiscountPercent?: number;
}

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// Sync client cart to server (for logged-in users)
export async function syncCart(clientItems: ClientCartItem[]) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "Not authenticated" };
  }

  const userId = session.user.id;

  try {
    // Delete existing cart items for this user
    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    // Insert new cart items
    if (clientItems.length > 0) {
      const itemsToInsert = clientItems.map((item) => ({
        userId,
        productId: item.productId,
        partNumber: item.partNumber,
        productName: item.productName,
        color: item.color,
        material: item.material,
        size: item.size,
        imageUrl: item.imageUrl,
        basePriceInCents: item.basePriceInCents,
        priceInCents: item.priceInCents,
        holdingFeeInCents: item.holdingFeeInCents,
        appliedDiscountPercent: item.appliedDiscountPercent || 0,
        bulkDiscounts: item.bulkDiscounts
          ? JSON.stringify(item.bulkDiscounts)
          : null,
        quantity: item.quantity,
      }));

      await db.insert(cartItems).values(itemsToInsert);
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing cart:", error);
    return { success: false, error: "Failed to sync cart" };
  }
}

// Get current user's cart from server
export async function getUserCart() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return [];
  }

  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.userId, session.user.id))
    .orderBy(desc(cartItems.createdAt));

  return items.map((item) => ({
    ...item,
    bulkDiscounts: item.bulkDiscounts ? JSON.parse(item.bulkDiscounts) : [],
  }));
}

// Clear user's server cart
export async function clearServerCart() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, error: "Not authenticated" };
  }

  await db.delete(cartItems).where(eq(cartItems.userId, session.user.id));
  return { success: true };
}

// Admin: Get all user carts
export type UserCartSummary = {
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  itemCount: number;
  totalItems: number;
  estimatedTotal: number;
  lastUpdated: Date | null;
};

export async function getAllUserCarts(): Promise<UserCartSummary[]> {
  await requireAdmin();

  // Get cart summaries grouped by user
  const cartsWithUsers = await db
    .select({
      userId: cartItems.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      itemCount: sql<number>`COUNT(*)::int`,
      totalItems: sql<number>`SUM(${cartItems.quantity})::int`,
      estimatedTotal: sql<number>`SUM(${cartItems.priceInCents} * ${cartItems.quantity})::int`,
      lastUpdated: sql<Date>`MAX(${cartItems.updatedAt})`,
    })
    .from(cartItems)
    .innerJoin(users, eq(cartItems.userId, users.id))
    .groupBy(cartItems.userId, users.name, users.email, users.image)
    .orderBy(desc(sql`MAX(${cartItems.updatedAt})`));

  return cartsWithUsers;
}

// Admin: Get a specific user's cart details
export type UserCartDetail = {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  items: {
    id: string;
    productId: string;
    partNumber: string | null;
    productName: string;
    color: string | null;
    material: string | null;
    size: string | null;
    imageUrl: string | null;
    basePriceInCents: number;
    priceInCents: number;
    holdingFeeInCents: number | null;
    appliedDiscountPercent: number | null;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    product: {
      id: string;
      name: string;
      stock: number;
      imageUrl: string | null;
    } | null;
  }[];
  totals: {
    itemCount: number;
    totalQuantity: number;
    subtotal: number;
  };
};

export async function getUserCartDetails(
  userId: string
): Promise<UserCartDetail | null> {
  await requireAdmin();

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return null;
  }

  // Get cart items with product info
  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      partNumber: cartItems.partNumber,
      productName: cartItems.productName,
      color: cartItems.color,
      material: cartItems.material,
      size: cartItems.size,
      imageUrl: cartItems.imageUrl,
      basePriceInCents: cartItems.basePriceInCents,
      priceInCents: cartItems.priceInCents,
      holdingFeeInCents: cartItems.holdingFeeInCents,
      appliedDiscountPercent: cartItems.appliedDiscountPercent,
      quantity: cartItems.quantity,
      createdAt: cartItems.createdAt,
      updatedAt: cartItems.updatedAt,
      product: {
        id: products.id,
        name: products.name,
        stock: products.stock,
        imageUrl: products.imageUrl,
      },
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(desc(cartItems.createdAt));

  // Calculate totals
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    items,
    totals: {
      itemCount: items.length,
      totalQuantity,
      subtotal,
    },
  };
}

// Admin: Get cart stats
export async function getCartStats() {
  await requireAdmin();

  const stats = await db
    .select({
      totalCarts: sql<number>`COUNT(DISTINCT ${cartItems.userId})::int`,
      totalItems: sql<number>`SUM(${cartItems.quantity})::int`,
      totalValue: sql<number>`SUM(${cartItems.priceInCents} * ${cartItems.quantity})::int`,
    })
    .from(cartItems);

  return {
    totalCarts: stats[0]?.totalCarts || 0,
    totalItems: stats[0]?.totalItems || 0,
    totalValue: stats[0]?.totalValue || 0,
  };
}
