"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import {
  discountCodes,
  discountCodeUsage,
  type NewDiscountCode,
  type DiscountCode,
} from "../schemas/discount-codes";
import { orders } from "../schemas/orders";
import { eq, and, or, lte, gte, isNull, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Auth helper
async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// ============ PUBLIC ============

export interface ValidateDiscountResult {
  valid: boolean;
  error?: string;
  discountCode?: DiscountCode;
  discountAmountInCents?: number;
  discountTarget?: "subtotal" | "shipping";
}

/**
 * Validate and calculate discount for a code
 * @param code - The discount code to validate
 * @param subtotalInCents - The order subtotal (to check minimums and calculate percentage for subtotal discounts)
 * @param shippingFeeInCents - The shipping fee (to calculate percentage for shipping discounts)
 * @returns Validation result with discount amount and target if valid
 */
export async function validateDiscountCode(
  code: string,
  subtotalInCents: number,
  shippingFeeInCents: number = 0
): Promise<ValidateDiscountResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { valid: false, error: "Please sign in to use discount codes" };
  }

  const userId = session.user.id;
  const now = new Date();

  // Find the discount code (case-insensitive)
  const discountCode = await db.query.discountCodes.findFirst({
    where: eq(sql`UPPER(${discountCodes.code})`, code.toUpperCase()),
  });

  if (!discountCode) {
    return { valid: false, error: "Invalid discount code" };
  }

  // Check if active
  if (!discountCode.active) {
    return { valid: false, error: "This discount code is no longer active" };
  }

  // Check start date
  if (discountCode.startDate && discountCode.startDate > now) {
    return { valid: false, error: "This discount code is not yet active" };
  }

  // Check end date
  if (discountCode.endDate && discountCode.endDate < now) {
    return { valid: false, error: "This discount code has expired" };
  }

  // Check total uses
  if (
    discountCode.maxUses !== null &&
    discountCode.usedCount >= discountCode.maxUses
  ) {
    return {
      valid: false,
      error: "This discount code has reached its usage limit",
    };
  }

  // Check minimum purchase (always based on subtotal)
  if (
    discountCode.minPurchaseInCents !== null &&
    subtotalInCents < discountCode.minPurchaseInCents
  ) {
    const minPurchase = (discountCode.minPurchaseInCents / 100).toFixed(2);
    return {
      valid: false,
      error: `Minimum purchase of $${minPurchase} required`,
    };
  }

  // For shipping discounts, ensure there's actually a shipping fee
  if (discountCode.discountTarget === "shipping" && shippingFeeInCents <= 0) {
    return {
      valid: false,
      error:
        "This discount code only applies to shipping. Please select a delivery method with shipping fees.",
    };
  }

  // Check per-user usage
  if (discountCode.maxUsesPerUser !== null) {
    const userUsageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(discountCodeUsage)
      .where(
        and(
          eq(discountCodeUsage.discountCodeId, discountCode.id),
          eq(discountCodeUsage.userId, userId)
        )
      );

    if (userUsageCount[0].count >= discountCode.maxUsesPerUser) {
      return {
        valid: false,
        error: "You have already used this discount code",
      };
    }
  }

  // Calculate discount amount based on target
  let discountAmountInCents: number;
  const targetAmount =
    discountCode.discountTarget === "shipping"
      ? shippingFeeInCents
      : subtotalInCents;

  if (discountCode.discountType === "percentage") {
    discountAmountInCents = Math.round(
      (targetAmount * discountCode.discountValue) / 100
    );

    // Apply max discount cap if set
    if (
      discountCode.maxDiscountInCents !== null &&
      discountAmountInCents > discountCode.maxDiscountInCents
    ) {
      discountAmountInCents = discountCode.maxDiscountInCents;
    }
  } else {
    // Fixed amount
    discountAmountInCents = discountCode.discountValue;
  }

  // Don't let discount exceed the target amount
  if (discountAmountInCents > targetAmount) {
    discountAmountInCents = targetAmount;
  }

  return {
    valid: true,
    discountCode,
    discountAmountInCents,
    discountTarget: discountCode.discountTarget,
  };
}

/**
 * Record usage of a discount code (called when order is created)
 */
export async function recordDiscountCodeUsage(
  discountCodeId: string,
  userId: string,
  orderId?: string
) {
  // Insert usage record
  await db.insert(discountCodeUsage).values({
    discountCodeId,
    userId,
    orderId,
  });

  // Increment used count
  await db
    .update(discountCodes)
    .set({
      usedCount: sql`${discountCodes.usedCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(discountCodes.id, discountCodeId));
}

// ============ ADMIN ============

/**
 * Get all discount codes for the dashboard
 */
export async function getDiscountCodes() {
  await requireAdmin();

  return db.query.discountCodes.findMany({
    orderBy: [desc(discountCodes.createdAt)],
    with: {
      createdByUser: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get a single discount code by ID
 */
export async function getDiscountCodeById(id: string) {
  await requireAdmin();

  return db.query.discountCodes.findFirst({
    where: eq(discountCodes.id, id),
    with: {
      createdByUser: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get discount code usage statistics
 */
export async function getDiscountCodeStats(id: string) {
  await requireAdmin();

  // Get usage records with user and order info
  const usageRecords = await db.query.discountCodeUsage.findMany({
    where: eq(discountCodeUsage.discountCodeId, id),
    with: {
      user: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [desc(discountCodeUsage.usedAt)],
    limit: 50,
  });

  // Get total discount given for this code
  const discountStats = await db
    .select({
      totalDiscountInCents: sql<number>`COALESCE(SUM(${orders.discountInCents}), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(eq(orders.discountCodeId, id));

  return {
    usageRecords,
    totalDiscountInCents: discountStats[0]?.totalDiscountInCents || 0,
    orderCount: discountStats[0]?.orderCount || 0,
  };
}

/**
 * Create a new discount code
 */
export async function createDiscountCode(
  data: Omit<NewDiscountCode, "id" | "createdAt" | "updatedAt" | "usedCount">
) {
  const admin = await requireAdmin();

  // Validate discount value for percentage type
  if (
    data.discountType === "percentage" &&
    (data.discountValue < 1 || data.discountValue > 100)
  ) {
    throw new Error("Percentage discount must be between 1 and 100");
  }

  // Check for duplicate code (case-insensitive)
  const existing = await db.query.discountCodes.findFirst({
    where: eq(sql`UPPER(${discountCodes.code})`, data.code.toUpperCase()),
  });

  if (existing) {
    throw new Error("A discount code with this code already exists");
  }

  const [discountCode] = await db
    .insert(discountCodes)
    .values({
      ...data,
      code: data.code.toUpperCase(), // Normalize to uppercase
      createdBy: admin.id,
    })
    .returning();

  revalidatePath("/dashboard/discount-codes");
  return discountCode;
}

/**
 * Update an existing discount code
 */
export async function updateDiscountCode(
  id: string,
  data: Partial<
    Omit<NewDiscountCode, "id" | "createdAt" | "createdBy" | "usedCount">
  >
) {
  await requireAdmin();

  // If updating the code, check for duplicates
  if (data.code) {
    const existing = await db.query.discountCodes.findFirst({
      where: and(
        eq(sql`UPPER(${discountCodes.code})`, data.code.toUpperCase()),
        sql`${discountCodes.id} != ${id}`
      ),
    });

    if (existing) {
      throw new Error("A discount code with this code already exists");
    }

    data.code = data.code.toUpperCase();
  }

  // Validate discount value for percentage type
  if (data.discountType === "percentage" && data.discountValue !== undefined) {
    if (data.discountValue < 1 || data.discountValue > 100) {
      throw new Error("Percentage discount must be between 1 and 100");
    }
  }

  const [discountCode] = await db
    .update(discountCodes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(discountCodes.id, id))
    .returning();

  revalidatePath("/dashboard/discount-codes");
  return discountCode;
}

/**
 * Toggle discount code active status
 */
export async function toggleDiscountCodeActive(id: string) {
  await requireAdmin();

  const existing = await db.query.discountCodes.findFirst({
    where: eq(discountCodes.id, id),
  });

  if (!existing) {
    throw new Error("Discount code not found");
  }

  const [discountCode] = await db
    .update(discountCodes)
    .set({ active: !existing.active, updatedAt: new Date() })
    .where(eq(discountCodes.id, id))
    .returning();

  revalidatePath("/dashboard/discount-codes");
  return discountCode;
}

/**
 * Delete a discount code
 */
export async function deleteDiscountCode(id: string) {
  await requireAdmin();

  // Check if code has been used
  const code = await db.query.discountCodes.findFirst({
    where: eq(discountCodes.id, id),
  });

  if (code && code.usedCount > 0) {
    // Soft delete by deactivating instead
    await db
      .update(discountCodes)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(discountCodes.id, id));
  } else {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
  }

  revalidatePath("/dashboard/discount-codes");
}
