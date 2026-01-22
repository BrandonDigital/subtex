"use server";

import { db } from "../db";
import { auth } from "../auth";
import { orders, orderItems, orderStatusHistory } from "../schemas/orders";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user;
}

async function requireAuth() {
  const session = await auth();
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
          variant: true,
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
          variant: true,
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
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "collected" | "cancelled",
  note?: string
) {
  const admin = await requireAdmin();

  const [updated] = await db.update(orders)
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

  await db.update(orders)
    .set({ 
      adminNotes: order.adminNotes ? `${order.adminNotes}\n\n${note}` : note,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  revalidatePath("/dashboard/orders");
  return { success: true };
}
