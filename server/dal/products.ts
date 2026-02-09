import { db } from "../db";
import {
  products,
  bulkDiscounts,
  stockSubscriptions,
  reservations,
  type NewProduct,
  type NewBulkDiscount,
  type NewStockSubscription,
} from "../schemas/products";
import { eq, and, desc, asc, lt, gt, sql, inArray } from "drizzle-orm";

// Products
export async function getAllProducts() {
  return db.query.products.findMany({
    where: eq(products.active, true),
    with: {
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
      bulkDiscounts: {
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
  });
}

export async function getProductByPartNumber(partNumber: string) {
  return db.query.products.findFirst({
    where: eq(products.partNumber, partNumber),
    with: {
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

// Product Stock
export async function updateProductStock(id: string, stock: number) {
  const [product] = await db
    .update(products)
    .set({ stock, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  return product;
}

export async function getProductsWithStock() {
  return db.query.products.findMany({
    where: eq(products.active, true),
    orderBy: [asc(products.name)],
  });
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

// ACM Products
export async function getActiveAcmProducts() {
  return db.query.products.findMany({
    where: and(eq(products.isAcm, true), eq(products.status, "active")),
    with: {
      bulkDiscounts: {
        where: eq(bulkDiscounts.active, true),
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
    orderBy: [
      asc(products.acmColor),
      asc(products.acmMaterial),
      asc(products.acmSize),
    ],
  });
}

// Stock Subscriptions
export async function getStockSubscriptionsForProduct(productId: string) {
  return db.query.stockSubscriptions.findMany({
    where: and(
      eq(stockSubscriptions.productId, productId),
      eq(stockSubscriptions.notified, false)
    ),
  });
}

export async function createStockSubscription(data: NewStockSubscription) {
  // Check if subscription already exists
  const existing = await db.query.stockSubscriptions.findFirst({
    where: and(
      eq(stockSubscriptions.productId, data.productId),
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

export async function markSubscriptionsNotified(productId: string) {
  await db
    .update(stockSubscriptions)
    .set({ notified: true })
    .where(eq(stockSubscriptions.productId, productId));
}

// Available Stock (accounting for active reservations)
export async function getActiveReservationsForProduct(
  productId: string
): Promise<number> {
  const now = new Date();
  const result = await db
    .select({
      totalReserved: sql<number>`COALESCE(SUM(${reservations.quantity}), 0)`,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.productId, productId),
        eq(reservations.status, "active"),
        gt(reservations.expiresAt, now)
      )
    );

  return Number(result[0]?.totalReserved || 0);
}

export async function getAvailableStock(productId: string): Promise<number> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { stock: true },
  });

  if (!product) {
    return 0;
  }

  const reserved = await getActiveReservationsForProduct(productId);
  return Math.max(0, product.stock - reserved);
}

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

  const now = new Date();

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
        gt(reservations.expiresAt, now)
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

// Get product with available stock
export async function getProductWithAvailableStock(id: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      bulkDiscounts: {
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
  });

  if (!product) {
    return null;
  }

  const reserved = await getActiveReservationsForProduct(id);
  const availableStock = Math.max(0, product.stock - reserved);

  return {
    ...product,
    availableStock,
    reservedStock: reserved,
  };
}

// Get all ACM products with available stock
export async function getActiveAcmProductsWithAvailableStock() {
  const acmProducts = await db.query.products.findMany({
    where: and(eq(products.isAcm, true), eq(products.status, "active")),
    with: {
      bulkDiscounts: {
        where: eq(bulkDiscounts.active, true),
        orderBy: asc(bulkDiscounts.minQuantity),
      },
    },
    orderBy: [
      asc(products.acmColor),
      asc(products.acmMaterial),
      asc(products.acmSize),
    ],
  });

  if (acmProducts.length === 0) {
    return [];
  }

  // Get available stock for all products
  const productIds = acmProducts.map((p) => p.id);
  const availableStockMap = await getAvailableStockBulk(productIds);

  return acmProducts.map((product) => ({
    ...product,
    availableStock: availableStockMap.get(product.id) || product.stock,
    reservedStock:
      product.stock - (availableStockMap.get(product.id) || product.stock),
  }));
}
