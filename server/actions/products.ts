"use server";

import { db } from "../db";
import { products, bulkDiscounts, reservations } from "../schemas/products";
import { orders, orderItems } from "../schemas/orders";
import { eq, asc, desc, and, or, gt, sql, inArray, ne } from "drizzle-orm";
import {
  getAllProducts,
  getBulkDiscountsForProduct,
  createStockSubscription,
  getActiveAcmProducts,
  getActiveAcmProductsWithAvailableStock,
} from "../dal/products";

export async function getProductsWithBulkDiscounts() {
  return getAllProducts();
}

export async function getAllProductsForAdmin() {
  return db.query.products.findMany({
    with: {
      bulkDiscounts: true,
    },
    orderBy: desc(products.createdAt),
  });
}

export async function getActiveProductsWithStock() {
  return db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.status, "active")),
    orderBy: [asc(products.name)],
  });
}

export async function getBulkDiscounts(productId?: string) {
  if (productId) {
    return getBulkDiscountsForProduct(productId);
  }
  // Get global bulk discounts (not tied to a specific product)
  return db.query.bulkDiscounts.findMany({
    where: eq(bulkDiscounts.active, true),
    orderBy: asc(bulkDiscounts.minQuantity),
  });
}

export async function subscribeToStockAlert(productId: string, email: string) {
  return createStockSubscription({
    productId,
    email,
    notified: false,
  });
}

export async function getAcmProducts() {
  // Returns products with available stock (accounting for active reservations)
  const products = await getActiveAcmProductsWithAvailableStock();
  // Map availableStock to stock for compatibility with existing components
  return products.map((p) => ({
    ...p,
    stock: p.availableStock, // Use available stock instead of total stock
  }));
}

// Public products page - only active products
export async function getActiveProducts() {
  return db.query.products.findMany({
    where: eq(products.status, "active"),
    with: {
      bulkDiscounts: {
        where: eq(bulkDiscounts.active, true),
      },
    },
    orderBy: desc(products.createdAt),
  });
}

// Helper to check if a string is a valid UUID
function isValidUuid(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Get product by slug, ID, or part number for product detail page
export async function getProductBySlug(slugOrIdOrPartNumber: string) {
  // Build conditions - only include ID check if input is a valid UUID
  const conditions = [
    eq(products.slug, slugOrIdOrPartNumber),
    eq(products.partNumber, slugOrIdOrPartNumber),
  ];

  // Only compare against ID if the input is a valid UUID format
  if (isValidUuid(slugOrIdOrPartNumber)) {
    conditions.push(eq(products.id, slugOrIdOrPartNumber));
  }

  return db.query.products.findFirst({
    where: and(or(...conditions), eq(products.status, "active")),
    with: {
      bulkDiscounts: {
        where: eq(bulkDiscounts.active, true),
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
  });
}

// Get products without stock set (for inventory management)
export async function getProductsWithoutStock() {
  return db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.stock, 0)),
    orderBy: desc(products.createdAt),
  });
}

// Get inventory breakdown with reserved and sold quantities per product
export async function getInventoryBreakdown() {
  // Get all active products
  const allProducts = await db.query.products.findMany({
    where: and(eq(products.active, true), eq(products.status, "active")),
    orderBy: [asc(products.name)],
  });

  if (allProducts.length === 0) {
    return [];
  }

  const productIds = allProducts.map((p) => p.id);
  const now = new Date();

  // Get active reservations per product
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
        gt(reservations.expiresAt, now)
      )
    )
    .groupBy(reservations.productId);

  const reservedMap = new Map(
    activeReservations.map((r) => [r.productId, Number(r.totalReserved)])
  );

  // Get sold quantities per product (from paid/processing/shipped/delivered/collected orders — not cancelled/refunded)
  const soldQuantities = await db
    .select({
      productId: orderItems.productId,
      totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        inArray(orderItems.productId, productIds),
        inArray(orders.status, [
          "paid",
          "processing",
          "shipped",
          "delivered",
          "collected",
        ] as any)
      )
    )
    .groupBy(orderItems.productId);

  const soldMap = new Map(
    soldQuantities.map((s) => [s.productId, Number(s.totalSold)])
  );

  return allProducts.map((product) => {
    const reserved = reservedMap.get(product.id) || 0;
    const sold = soldMap.get(product.id) || 0;
    const available = Math.max(0, product.stock - reserved);

    return {
      ...product,
      reserved,
      sold,
      available,
    };
  });
}
