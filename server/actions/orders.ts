"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { orders, orderItems, orderStatusHistory } from "../schemas/orders";
import { eq, desc, and, or, ilike, gte, isNotNull, isNull, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getOrders(status?: string) {
  await requireAdmin();

  const allOrders = await db.query.orders.findMany({
    where: status ? eq(orders.status, status as any) : undefined,
    with: {
      user: true,
      items: true,
      refundRequests: true,
    },
    orderBy: [desc(orders.createdAt)],
  });

  return allOrders;
}

export async function getOrderById(orderId: string) {
  await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      user: true,
      items: {
        with: {
          product: true,
        },
      },
      statusHistory: {
        orderBy: [desc(orderStatusHistory.createdAt)],
      },
      refundRequests: true,
      deliveryAddress: true,
    },
  });

  return order;
}

export async function getUserOrders() {
  const user = await requireAuth();

  const userOrders = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    with: {
      items: true,
      refundRequests: true,
    },
    orderBy: [desc(orders.createdAt)],
  });

  return userOrders;
}

export async function getUserOrderById(orderId: string) {
  const user = await requireAuth();

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, user.id)),
    with: {
      items: {
        with: {
          product: true,
        },
      },
      statusHistory: {
        orderBy: [desc(orderStatusHistory.createdAt)],
      },
      refundRequests: true,
      deliveryAddress: true,
    },
  });

  return order;
}

export async function updateOrderStatus(
  orderId: string,
  status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "collected"
    | "cancelled",
  note?: string
) {
  const admin = await requireAdmin();

  const [updated] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  if (updated) {
    await db.insert(orderStatusHistory).values({
      orderId,
      status,
      note,
      changedBy: admin.id,
    });
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");

  return updated;
}

export async function addOrderNote(orderId: string, note: string) {
  const admin = await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  await db
    .update(orders)
    .set({
      adminNotes: order.adminNotes ? `${order.adminNotes}\n\n${note}` : note,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  revalidatePath("/dashboard/orders");
  return { success: true };
}

// ============ APPOINTMENTS ============

export async function getAppointments() {
  await requireAdmin();

  // Get current date in Perth time (YYYY-MM-DD)
  const perthNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
  );
  const todayKey = `${perthNow.getFullYear()}-${String(
    perthNow.getMonth() + 1
  ).padStart(2, "0")}-${String(perthNow.getDate()).padStart(2, "0")}`;

  // Fetch all click & collect orders that are active (paid, processing)
  // Include both scheduled appointments and backorder appointments
  const appointments = await db.query.orders.findMany({
    where: and(
      eq(orders.deliveryMethod, "click_collect" as any),
      inArray(orders.status, [
        "paid",
        "processing",
      ] as any)
    ),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
        },
      },
      items: true,
    },
    orderBy: [asc(orders.collectionDate), asc(orders.createdAt)],
  });

  // Separate into scheduled and backorder appointments
  const scheduled = appointments.filter(
    (o) => o.collectionDate && o.collectionSlot
  );
  const backorder = appointments.filter(
    (o) => !o.collectionDate || o.hasBackorderItems
  );

  // Get past collected orders for reference (last 7 days)
  const sevenDaysAgo = new Date(perthNow);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoKey = `${sevenDaysAgo.getFullYear()}-${String(
    sevenDaysAgo.getMonth() + 1
  ).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;

  const recentlyCollected = await db.query.orders.findMany({
    where: and(
      eq(orders.deliveryMethod, "click_collect" as any),
      eq(orders.status, "collected" as any),
      isNotNull(orders.collectionDate),
      gte(orders.collectionDate, sevenDaysAgoKey)
    ),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
        },
      },
      items: true,
    },
    orderBy: [asc(orders.collectionDate)],
  });

  return {
    scheduled,
    backorder,
    recentlyCollected,
    todayKey,
  };
}

export async function markOrderPacking(orderId: string) {
  const admin = await requireAdmin();

  await db
    .update(orders)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    orderId,
    status: "processing",
    note: "Order being packed for collection",
    changedBy: admin.id,
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/orders");
  return { success: true };
}

export async function markOrderCollected(
  orderId: string,
  signatures?: { senderSignature: string; receiverSignature: string }
) {
  const admin = await requireAdmin();

  const updateData: Record<string, unknown> = {
    status: "collected",
    updatedAt: new Date(),
  };

  if (signatures) {
    updateData.senderSignature = signatures.senderSignature;
    updateData.receiverSignature = signatures.receiverSignature;
    updateData.signedAt = new Date();
  }

  await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    orderId,
    status: "collected",
    note: signatures
      ? "Order collected by customer — signed off by both parties"
      : "Order collected by customer",
    changedBy: admin.id,
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/orders");
  return { success: true };
}
