"use server";

import { db } from "../db";
import { bulkDiscounts } from "../schemas/products";
import { eq, asc } from "drizzle-orm";
import {
  getAllProducts,
  getAllVariants,
  getVariantById,
  getBulkDiscountsForProduct,
  createStockSubscription,
} from "../dal/products";

export async function getProductsWithVariants() {
  return getAllProducts();
}

export async function getActiveVariants() {
  return getAllVariants();
}

export async function getVariant(id: string) {
  return getVariantById(id);
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

export async function subscribeToStockAlert(variantId: string, email: string) {
  return createStockSubscription({
    variantId,
    email,
    notified: false,
  });
}
