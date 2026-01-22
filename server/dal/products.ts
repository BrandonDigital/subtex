import { db } from "../db";
import {
  products,
  productVariants,
  bulkDiscounts,
  stockSubscriptions,
  type NewProduct,
  type NewProductVariant,
  type NewBulkDiscount,
  type NewStockSubscription,
} from "../schemas/products";
import { eq, and, desc, asc } from "drizzle-orm";

// Products
export async function getAllProducts() {
  return db.query.products.findMany({
    where: eq(products.active, true),
    with: {
      variants: {
        where: eq(productVariants.active, true),
      },
      bulkDiscounts: {
        where: eq(bulkDiscounts.active, true),
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
    orderBy: desc(products.createdAt),
  });
}

export async function getProductById(id: string) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      variants: true,
      bulkDiscounts: {
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
  });
}

export async function createProduct(data: NewProduct) {
  const [product] = await db.insert(products).values(data).returning();
  return product;
}

export async function updateProduct(id: string, data: Partial<NewProduct>) {
  const [product] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return product;
}

export async function deleteProduct(id: string) {
  await db
    .update(products)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(products.id, id));
}

// Product Variants
export async function getAllVariants() {
  return db.query.productVariants.findMany({
    where: eq(productVariants.active, true),
    with: {
      product: true,
    },
    orderBy: [asc(productVariants.color), asc(productVariants.material), asc(productVariants.size)],
  });
}

export async function getVariantById(id: string) {
  return db.query.productVariants.findFirst({
    where: eq(productVariants.id, id),
    with: {
      product: true,
    },
  });
}

export async function getVariantBySku(sku: string) {
  return db.query.productVariants.findFirst({
    where: eq(productVariants.sku, sku),
    with: {
      product: true,
    },
  });
}

export async function createVariant(data: NewProductVariant) {
  const [variant] = await db.insert(productVariants).values(data).returning();
  return variant;
}

export async function updateVariant(id: string, data: Partial<NewProductVariant>) {
  const [variant] = await db
    .update(productVariants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(productVariants.id, id))
    .returning();
  return variant;
}

export async function updateVariantStock(id: string, stock: number) {
  const [variant] = await db
    .update(productVariants)
    .set({ stock, updatedAt: new Date() })
    .where(eq(productVariants.id, id))
    .returning();
  return variant;
}

export async function deleteVariant(id: string) {
  await db
    .update(productVariants)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(productVariants.id, id));
}

// Bulk Discounts
export async function getBulkDiscountsForProduct(productId: string) {
  return db.query.bulkDiscounts.findMany({
    where: and(
      eq(bulkDiscounts.productId, productId),
      eq(bulkDiscounts.active, true)
    ),
    orderBy: asc(bulkDiscounts.minQuantity),
  });
}

export async function createBulkDiscount(data: NewBulkDiscount) {
  const [discount] = await db.insert(bulkDiscounts).values(data).returning();
  return discount;
}

export async function updateBulkDiscount(
  id: string,
  data: Partial<NewBulkDiscount>
) {
  const [discount] = await db
    .update(bulkDiscounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bulkDiscounts.id, id))
    .returning();
  return discount;
}

export async function deleteBulkDiscount(id: string) {
  await db
    .update(bulkDiscounts)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(bulkDiscounts.id, id));
}

// Stock Subscriptions
export async function getStockSubscriptionsForVariant(variantId: string) {
  return db.query.stockSubscriptions.findMany({
    where: and(
      eq(stockSubscriptions.variantId, variantId),
      eq(stockSubscriptions.notified, false)
    ),
  });
}

export async function createStockSubscription(data: NewStockSubscription) {
  // Check if subscription already exists
  const existing = await db.query.stockSubscriptions.findFirst({
    where: and(
      eq(stockSubscriptions.variantId, data.variantId),
      eq(stockSubscriptions.email, data.email),
      eq(stockSubscriptions.notified, false)
    ),
  });

  if (existing) {
    return existing;
  }

  const [subscription] = await db
    .insert(stockSubscriptions)
    .values(data)
    .returning();
  return subscription;
}

export async function markSubscriptionsNotified(variantId: string) {
  await db
    .update(stockSubscriptions)
    .set({ notified: true })
    .where(eq(stockSubscriptions.variantId, variantId));
}
