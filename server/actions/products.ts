"use server";

import { db } from "../db";
import { products, bulkDiscounts } from "../schemas/products";
import { eq, asc, desc, and, or } from "drizzle-orm";
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
