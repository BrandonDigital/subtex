"use server";

import { db } from "../db";
import { auth } from "../auth";
import { 
  products, 
  productVariants, 
  bulkDiscounts,
  stockSubscriptions,
  type NewProduct,
  type NewProductVariant,
  type NewBulkDiscount,
} from "../schemas/products";
import { deliveryZones, type NewDeliveryZone } from "../schemas/deliveries";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendBackInStockEmail, sendLowStockAlertEmail } from "./email";

// Auth helper
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user;
}

// ============ PRODUCTS ============

export async function createProduct(data: Omit<NewProduct, "id" | "createdAt" | "updatedAt">) {
  await requireAdmin();
  
  const [product] = await db.insert(products).values(data).returning();
  revalidatePath("/dashboard/products");
  return product;
}

export async function updateProduct(id: string, data: Partial<NewProduct>) {
  await requireAdmin();
  
  const [product] = await db
    .update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  
  revalidatePath("/dashboard/products");
  return product;
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  
  await db.update(products).set({ active: false }).where(eq(products.id, id));
  revalidatePath("/dashboard/products");
}

// ============ VARIANTS ============

export async function createVariant(data: Omit<NewProductVariant, "id" | "createdAt" | "updatedAt">) {
  await requireAdmin();
  
  const [variant] = await db.insert(productVariants).values(data).returning();
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return variant;
}

export async function updateVariant(id: string, data: Partial<NewProductVariant>) {
  await requireAdmin();
  
  const [variant] = await db
    .update(productVariants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(productVariants.id, id))
    .returning();
  
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/");
  return variant;
}

export async function deleteVariant(id: string) {
  await requireAdmin();
  
  await db.update(productVariants).set({ active: false }).where(eq(productVariants.id, id));
  revalidatePath("/dashboard/products");
  revalidatePath("/");
}

// ============ INVENTORY ============

export async function updateStock(
  variantId: string, 
  newStock: number, 
  notifySubscribers: boolean = false
) {
  const admin = await requireAdmin();
  
  // Get current variant info
  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
  });

  if (!variant) throw new Error("Variant not found");

  const wasOutOfStock = variant.stock === 0;
  const isNowInStock = newStock > 0;

  // Update stock
  const [updated] = await db
    .update(productVariants)
    .set({ stock: newStock, updatedAt: new Date() })
    .where(eq(productVariants.id, variantId))
    .returning();

  // Check for low stock alert
  if (newStock <= variant.lowStockThreshold && newStock > 0) {
    // Send low stock alert to admin
    sendLowStockAlertEmail(
      admin.email || "",
      `${variant.color} ${variant.material} ${variant.size} ACM Sheet`,
      variant.sku,
      newStock
    ).catch(console.error);
  }

  // Notify subscribers if item is back in stock
  if (notifySubscribers && wasOutOfStock && isNowInStock) {
    const subscribers = await db.query.stockSubscriptions.findMany({
      where: and(
        eq(stockSubscriptions.variantId, variantId),
        eq(stockSubscriptions.notified, false)
      ),
    });

    const productName = `${variant.color} ${variant.material} ${variant.size} ACM Sheet`;
    const productUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";

    // Send emails to all subscribers
    for (const sub of subscribers) {
      sendBackInStockEmail(sub.email, productName, productUrl).catch(console.error);
    }

    // Mark as notified
    if (subscribers.length > 0) {
      await db
        .update(stockSubscriptions)
        .set({ notified: true })
        .where(eq(stockSubscriptions.variantId, variantId));
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/");
  return updated;
}

export async function updateHoldingFee(variantId: string, holdingFeeInCents: number) {
  await requireAdmin();
  
  const [variant] = await db
    .update(productVariants)
    .set({ holdingFeeInCents, updatedAt: new Date() })
    .where(eq(productVariants.id, variantId))
    .returning();
  
  revalidatePath("/dashboard/inventory");
  return variant;
}

export async function updateLowStockThreshold(variantId: string, threshold: number) {
  await requireAdmin();
  
  const [variant] = await db
    .update(productVariants)
    .set({ lowStockThreshold: threshold, updatedAt: new Date() })
    .where(eq(productVariants.id, variantId))
    .returning();
  
  revalidatePath("/dashboard/inventory");
  return variant;
}

// ============ BULK DISCOUNTS ============

export async function createBulkDiscount(data: Omit<NewBulkDiscount, "id" | "createdAt" | "updatedAt">) {
  await requireAdmin();
  
  const [discount] = await db.insert(bulkDiscounts).values(data).returning();
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return discount;
}

export async function updateBulkDiscount(id: string, data: Partial<NewBulkDiscount>) {
  await requireAdmin();
  
  const [discount] = await db
    .update(bulkDiscounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(bulkDiscounts.id, id))
    .returning();
  
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return discount;
}

export async function deleteBulkDiscount(id: string) {
  await requireAdmin();
  
  await db.update(bulkDiscounts).set({ active: false }).where(eq(bulkDiscounts.id, id));
  revalidatePath("/dashboard/products");
  revalidatePath("/");
}

// ============ DELIVERY ZONES ============

export async function getDeliveryZones() {
  return db.query.deliveryZones.findMany({
    where: eq(deliveryZones.active, true),
    orderBy: (zones, { asc }) => [asc(zones.radiusKm)],
  });
}

export async function createDeliveryZone(data: Omit<NewDeliveryZone, "id" | "createdAt" | "updatedAt">) {
  await requireAdmin();
  
  const [zone] = await db.insert(deliveryZones).values(data).returning();
  revalidatePath("/dashboard/deliveries");
  return zone;
}

export async function updateDeliveryZone(id: string, data: Partial<NewDeliveryZone>) {
  await requireAdmin();
  
  const [zone] = await db
    .update(deliveryZones)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deliveryZones.id, id))
    .returning();
  
  revalidatePath("/dashboard/deliveries");
  return zone;
}

export async function deleteDeliveryZone(id: string) {
  await requireAdmin();
  
  await db.update(deliveryZones).set({ active: false }).where(eq(deliveryZones.id, id));
  revalidatePath("/dashboard/deliveries");
}

// ============ STOCK SUBSCRIBERS ============

export async function getStockSubscribers(variantId: string) {
  await requireAdmin();
  
  return db.query.stockSubscriptions.findMany({
    where: and(
      eq(stockSubscriptions.variantId, variantId),
      eq(stockSubscriptions.notified, false)
    ),
  });
}

export async function getStockSubscriberCount(variantId: string) {
  const subscribers = await db.query.stockSubscriptions.findMany({
    where: and(
      eq(stockSubscriptions.variantId, variantId),
      eq(stockSubscriptions.notified, false)
    ),
  });
  return subscribers.length;
}
