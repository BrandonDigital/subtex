"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import {
  products,
  bulkDiscounts,
  stockSubscriptions,
  type NewProduct,
  type NewBulkDiscount,
} from "../schemas/products";
import { deliveryZones, type NewDeliveryZone } from "../schemas/deliveries";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendBackInStockEmail, sendLowStockAlertEmail } from "./email";
import { notifyAllUsersOfPriceChange } from "./settings";

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | { id: string; email: string; role?: string }
    | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// ============ PRODUCTS ============

export async function createProduct(
  data: Omit<NewProduct, "id" | "createdAt" | "updatedAt">,
) {
  await requireAdmin();

  const [product] = await db.insert(products).values(data).returning();
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
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
  revalidatePath("/dashboard/inventory");
  revalidatePath("/products", "layout");
  revalidatePath("/");
  return product;
}

// Inline edit a single product field from the product page
const ALLOWED_INLINE_FIELDS = [
  "name",
  "description",
  "basePriceInCents",
  "imageUrl",
  "width",
  "height",
  "depth",
  "weight",
  "partNumber",
  "metaTitle",
  "metaDescription",
] as const;

type InlineField = (typeof ALLOWED_INLINE_FIELDS)[number];

export async function updateProductFieldInline(
  productId: string,
  field: string,
  value: string,
) {
  await requireAdmin();

  if (!ALLOWED_INLINE_FIELDS.includes(field as InlineField)) {
    throw new Error(`Field "${field}" is not editable inline`);
  }

  // Build the update data with proper type coercion
  const updateData: Partial<NewProduct> = {};
  const typedField = field as InlineField;

  switch (typedField) {
    case "basePriceInCents":
      updateData.basePriceInCents = parseInt(value) || 0;
      break;
    case "width":
    case "height":
    case "depth":
    case "weight":
      updateData[typedField] = value || null;
      break;
    case "name":
      if (!value) throw new Error("Product name cannot be empty");
      updateData.name = value;
      break;
    default:
      (updateData as Record<string, string | null>)[typedField] = value || null;
  }

  const [product] = await db
    .update(products)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
  revalidatePath("/products", "layout");
  revalidatePath("/");
  return product;
}

export async function deleteProduct(id: string) {
  await requireAdmin();

  await db.update(products).set({ active: false }).where(eq(products.id, id));
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/inventory");
}

// ============ INVENTORY ============

export async function updateStock(
  productId: string,
  newStock: number,
  notifySubscribers: boolean = false,
) {
  const admin = await requireAdmin();

  // Get current product info
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) throw new Error("Product not found");

  const wasOutOfStock = product.stock === 0;
  const isNowInStock = newStock > 0;

  // Update stock
  const [updated] = await db
    .update(products)
    .set({ stock: newStock, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  // Check for low stock alert
  if (newStock <= product.lowStockThreshold && newStock > 0) {
    // Send low stock alert to admin
    sendLowStockAlertEmail(
      admin.email || "",
      product.name,
      product.partNumber || product.id,
      newStock,
    ).catch(console.error);
  }

  // Notify subscribers if item is back in stock
  if (notifySubscribers && wasOutOfStock && isNowInStock) {
    const subscribers = await db.query.stockSubscriptions.findMany({
      where: and(
        eq(stockSubscriptions.productId, productId),
        eq(stockSubscriptions.notified, false),
      ),
    });

    const productUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";

    // Send emails to all subscribers
    for (const sub of subscribers) {
      sendBackInStockEmail(sub.email, product.name, productUrl).catch(
        console.error,
      );
    }

    // Mark as notified
    if (subscribers.length > 0) {
      await db
        .update(stockSubscriptions)
        .set({ notified: true })
        .where(eq(stockSubscriptions.productId, productId));
    }
  }

  revalidatePath("/dashboard/inventory");
  revalidatePath("/");
  return updated;
}

export async function updateHoldingFee(
  productId: string,
  holdingFeeInCents: number,
) {
  await requireAdmin();

  const [product] = await db
    .update(products)
    .set({ holdingFeeInCents, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  revalidatePath("/dashboard/inventory");
  return product;
}

export async function updateLowStockThreshold(
  productId: string,
  threshold: number,
) {
  await requireAdmin();

  const [product] = await db
    .update(products)
    .set({ lowStockThreshold: threshold, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  revalidatePath("/dashboard/inventory");
  return product;
}

// ============ BULK DISCOUNTS ============

export async function createBulkDiscount(
  data: Omit<NewBulkDiscount, "id" | "createdAt" | "updatedAt">,
) {
  await requireAdmin();

  const [discount] = await db.insert(bulkDiscounts).values(data).returning();
  revalidatePath("/dashboard/products");
  revalidatePath("/");
  return discount;
}

export async function updateBulkDiscount(
  id: string,
  data: Partial<NewBulkDiscount>,
) {
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

  await db
    .update(bulkDiscounts)
    .set({ active: false })
    .where(eq(bulkDiscounts.id, id));
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

export async function createDeliveryZone(
  data: Omit<NewDeliveryZone, "id" | "createdAt" | "updatedAt">,
) {
  await requireAdmin();

  const [zone] = await db.insert(deliveryZones).values(data).returning();
  revalidatePath("/dashboard/deliveries");
  return zone;
}

export async function updateDeliveryZone(
  id: string,
  data: Partial<NewDeliveryZone>,
) {
  await requireAdmin();

  const oldZone = await db.query.deliveryZones.findFirst({
    where: eq(deliveryZones.id, id),
  });

  const [zone] = await db
    .update(deliveryZones)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(deliveryZones.id, id))
    .returning();

  revalidatePath("/dashboard/deliveries");

  if (oldZone && zone) {
    const feeChanged =
      (data.baseFeeInCents !== undefined &&
        data.baseFeeInCents !== oldZone.baseFeeInCents) ||
      (data.perSheetFeeInCents !== undefined &&
        data.perSheetFeeInCents !== oldZone.perSheetFeeInCents);

    if (feeChanged) {
      const formatPrice = (cents: number) =>
        new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
        }).format(cents / 100);

      const parts: string[] = [];

      if (zone.baseFeeInCents !== oldZone.baseFeeInCents) {
        parts.push(
          `base fee ${formatPrice(oldZone.baseFeeInCents)} → ${formatPrice(zone.baseFeeInCents)}`
        );
      }
      if (zone.perSheetFeeInCents !== oldZone.perSheetFeeInCents) {
        parts.push(
          `per-sheet fee ${formatPrice(oldZone.perSheetFeeInCents)} → ${formatPrice(zone.perSheetFeeInCents)}`
        );
      }

      const title = "Delivery Fee Updated";
      const message = `${zone.name} delivery zone pricing has changed: ${parts.join(", ")}.`;

      notifyAllUsersOfPriceChange(title, message, "/checkout").catch(
        console.error
      );
    }
  }

  return zone;
}

export async function deleteDeliveryZone(id: string) {
  await requireAdmin();

  await db
    .update(deliveryZones)
    .set({ active: false })
    .where(eq(deliveryZones.id, id));
  revalidatePath("/dashboard/deliveries");
}

// ============ STOCK SUBSCRIBERS ============

export async function getStockSubscribers(productId: string) {
  await requireAdmin();

  return db.query.stockSubscriptions.findMany({
    where: and(
      eq(stockSubscriptions.productId, productId),
      eq(stockSubscriptions.notified, false),
    ),
  });
}

export async function getStockSubscriberCount(productId: string) {
  const subscribers = await db.query.stockSubscriptions.findMany({
    where: and(
      eq(stockSubscriptions.productId, productId),
      eq(stockSubscriptions.notified, false),
    ),
  });
  return subscribers.length;
}
