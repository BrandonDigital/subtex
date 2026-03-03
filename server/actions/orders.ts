"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import { orders, orderItems, orderStatusHistory } from "../schemas/orders";
import { eq, desc, and, or, ilike, gte, isNotNull, isNull, asc, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { users } from "../schemas/users";
import { products } from "../schemas/products";
import { sendOrderConfirmationEmail } from "./email";
import { stripe } from "@/lib/server/stripe";

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
        with: {
          changedByUser: {
            columns: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [desc(orderStatusHistory.createdAt)],
      },
      refundRequests: {
        with: {
          items: {
            with: {
              orderItem: true,
            },
          },
        },
      },
      deliveryAddress: true,
    },
  });

  return order;
}

/**
 * Public order lookup by order number — used on the confirmation page.
 * Returns limited data (no user details, no admin notes).
 */
export async function getOrderByNumber(orderNumber: string) {
  if (!orderNumber) return null;

  const order = await db.query.orders.findFirst({
    where: eq(orders.orderNumber, orderNumber),
    with: {
      items: {
        with: {
          product: {
            columns: {
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  // Return only the data needed for the confirmation page
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    subtotalInCents: order.subtotalInCents,
    discountInCents: order.discountInCents,
    deliveryFeeInCents: order.deliveryFeeInCents,
    holdingFeeInCents: order.holdingFeeInCents,
    totalInCents: order.totalInCents,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      name: item.name,
      color: item.color,
      material: item.material,
      size: item.size,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
      totalInCents: item.totalInCents,
      cuttingSpec: item.cuttingSpec,
      imageUrl: item.product?.imageUrl || null,
    })),
  };
}

/**
 * Atomically sends the order confirmation email if it hasn't been sent yet.
 * Uses confirmationEmailSentAt as a guard to prevent duplicate sends.
 * Safe to call from both the webhook and the confirmation page.
 */
export async function trySendOrderConfirmationEmail(orderId: string) {
  try {
    // Atomically mark as sent — only succeeds if not already sent
    const [updatedOrder] = await db
      .update(orders)
      .set({ confirmationEmailSentAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          isNull(orders.confirmationEmailSentAt)
        )
      )
      .returning();

    if (!updatedOrder) {
      // Already sent or order not found
      return { sent: false, reason: "already_sent_or_not_found" };
    }

    // Fetch order items with product images for the email
    const orderItemsList = await db
      .select({
        name: orderItems.name,
        quantity: orderItems.quantity,
        totalInCents: orderItems.totalInCents,
        imageUrl: products.imageUrl,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    const formatPrice = (cents: number) =>
      new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
      }).format(cents / 100);

    const emailItems = orderItemsList.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: formatPrice(item.totalInCents),
      imageUrl: item.imageUrl || undefined,
    }));

    // Determine recipient
    const isGuestOrder = !updatedOrder.userId;
    let recipientEmail: string | null = null;
    let recipientName = "Customer";

    if (isGuestOrder) {
      recipientEmail = updatedOrder.guestEmail || null;
      recipientName = updatedOrder.guestName || "Customer";
    } else {
      const [orderUser] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, updatedOrder.userId!))
        .limit(1);
      if (orderUser) {
        recipientEmail = orderUser.email;
        recipientName = orderUser.name || "Customer";
      }
    }

    if (!recipientEmail) {
      console.log(
        `No email address found for order ${updatedOrder.orderNumber} — skipping confirmation email`
      );
      return { sent: false, reason: "no_email" };
    }

    await sendOrderConfirmationEmail(
      recipientEmail,
      recipientName,
      updatedOrder.orderNumber,
      emailItems,
      formatPrice(updatedOrder.totalInCents),
      isGuestOrder,
    );

    console.log(
      `Order confirmation email sent to ${recipientEmail} for ${updatedOrder.orderNumber}`
    );

    return { sent: true };
  } catch (err) {
    console.error("Failed to send order confirmation email:", err);
    return { sent: false, reason: "error" };
  }
}

export async function getUserOrders() {
  const user = await requireAuth();

  const userOrders = await db.query.orders.findMany({
    where: eq(orders.userId, user.id),
    with: {
      items: {
        with: {
          product: {
            columns: {
              imageUrl: true,
            },
          },
        },
      },
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
      refundRequests: {
        with: {
          items: {
            with: {
              orderItem: true,
            },
          },
        },
      },
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
  revalidatePath("/dashboard/deliveries");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/inventory");
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

export async function updateOrderDetails(
  orderId: string,
  data: {
    customerNotes?: string | null;
    adminNotes?: string | null;
    deliveryMethod?: "click_collect" | "local_delivery" | "interstate" | "international";
    deliveryFeeInCents?: number;
    collectionDate?: string | null;
    collectionSlot?: string | null;
  }
) {
  await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  await db
    .update(orders)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/deliveries");
  revalidatePath("/orders");
  return { success: true };
}

export async function updateOrderItem(
  itemId: string,
  data: {
    quantity?: number;
    unitPriceInCents?: number;
    name?: string;
    color?: string | null;
    material?: string | null;
    size?: string | null;
    cuttingSpec?: string | null;
  }
) {
  await requireAdmin();

  const item = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, itemId),
  });

  if (!item) {
    return { success: false, error: "Order item not found" };
  }

  const quantity = data.quantity ?? item.quantity;
  const unitPrice = data.unitPriceInCents ?? item.unitPriceInCents;
  const discountPercent = item.discountPercent;
  const totalInCents = Math.round(quantity * unitPrice * (1 - discountPercent / 100));

  await db
    .update(orderItems)
    .set({
      ...data,
      totalInCents,
    })
    .where(eq(orderItems.id, itemId));

  // Recalculate order subtotal and total
  const allItems = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, item.orderId),
  });

  const newSubtotal = allItems.reduce((sum, i) => {
    if (i.id === itemId) return sum + totalInCents;
    return sum + i.totalInCents;
  }, 0);

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, item.orderId),
  });

  if (order) {
    const newTotal = newSubtotal - order.discountInCents + order.deliveryFeeInCents + order.holdingFeeInCents;
    await db
      .update(orders)
      .set({
        subtotalInCents: newSubtotal,
        totalInCents: newTotal,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, item.orderId));
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");
  return { success: true };
}

export async function deleteOrderItem(itemId: string) {
  await requireAdmin();

  const item = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, itemId),
  });

  if (!item) {
    return { success: false, error: "Order item not found" };
  }

  await db.delete(orderItems).where(eq(orderItems.id, itemId));

  // Recalculate order subtotal and total
  const remainingItems = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, item.orderId),
  });

  const newSubtotal = remainingItems.reduce((sum, i) => sum + i.totalInCents, 0);

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, item.orderId),
  });

  if (order) {
    const newTotal = newSubtotal - order.discountInCents + order.deliveryFeeInCents + order.holdingFeeInCents;
    await db
      .update(orders)
      .set({
        subtotalInCents: newSubtotal,
        totalInCents: newTotal,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, item.orderId));
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");
  return { success: true };
}

export async function verifyStripePayment(orderId: string) {
  const admin = await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (!order.stripePaymentIntentId) {
    return { success: false, error: "No Stripe payment intent linked to this order" };
  }

  // Skip dev/test payment intents
  if (order.stripePaymentIntentId.startsWith("dev_")) {
    return {
      success: true,
      alreadyPaid: order.status !== "pending",
      stripeStatus: "dev_bypass",
      message: "Dev checkout — Stripe verification skipped",
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      order.stripePaymentIntentId,
      { expand: ["latest_charge"] }
    );

    // Extract charge details (fees, net amount)
    let stripeFee = 0;
    let netAmount = 0;
    let chargeId: string | null = null;
    const latestCharge = paymentIntent.latest_charge;
    if (latestCharge && typeof latestCharge === "object" && "id" in latestCharge) {
      chargeId = latestCharge.id;
      // balance_transaction is not expanded by default, retrieve separately
      if (latestCharge.balance_transaction && typeof latestCharge.balance_transaction === "string") {
        try {
          const balanceTxn = await stripe.balanceTransactions.retrieve(latestCharge.balance_transaction);
          stripeFee = balanceTxn.fee;
          netAmount = balanceTxn.net;
        } catch {
          // If we can't get balance transaction, compute estimate
          netAmount = paymentIntent.amount_received;
        }
      }
    }

    const stripeData = {
      stripeStatus: paymentIntent.status,
      amountCharged: paymentIntent.amount,
      amountReceived: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      stripeFee,
      netAmount,
      chargeId,
      orderTotalInCents: order.totalInCents,
    };

    if (paymentIntent.status === "succeeded" && order.status === "pending") {
      await db
        .update(orders)
        .set({
          status: "paid",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: "paid",
        note: "Payment verified manually via Stripe — synced from dashboard",
        changedBy: admin.id,
      });

      for (const item of order.items) {
        await db
          .update(products)
          .set({
            stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }

      await trySendOrderConfirmationEmail(order.id);

      revalidatePath("/dashboard/orders");
      revalidatePath("/dashboard/deliveries");
      revalidatePath("/dashboard/inventory");
      revalidatePath("/orders");

      return {
        success: true,
        alreadyPaid: false,
        message: "Payment confirmed — order updated to paid",
        ...stripeData,
      };
    }

    return {
      success: true,
      alreadyPaid: order.status !== "pending",
      message:
        order.status !== "pending"
          ? `Order already marked as "${order.status}"`
          : `Stripe payment status: ${paymentIntent.status}`,
      ...stripeData,
    };
  } catch (err: any) {
    console.error("Failed to verify Stripe payment:", err);
    return {
      success: false,
      error: err.message || "Failed to retrieve payment from Stripe",
    };
  }
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
    note: "Order being packed",
    changedBy: admin.id,
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/deliveries");
  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");
  return { success: true };
}

export async function markOrderCollected(
  orderId: string,
  signatures?: { senderSignature: string; receiverSignature: string },
  collectedItems?: { orderItemId: string; quantity: number }[]
) {
  const admin = await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  // Update collected quantities on individual items
  if (collectedItems && collectedItems.length > 0) {
    for (const ci of collectedItems) {
      const item = order.items.find((i) => i.id === ci.orderItemId);
      if (item) {
        const newCollectedQty = Math.min(
          item.collectedQuantity + ci.quantity,
          item.quantity
        );
        await db
          .update(orderItems)
          .set({ collectedQuantity: newCollectedQty })
          .where(eq(orderItems.id, ci.orderItemId));
      }
    }
  } else {
    // No specific items — mark all items as fully collected
    for (const item of order.items) {
      await db
        .update(orderItems)
        .set({ collectedQuantity: item.quantity })
        .where(eq(orderItems.id, item.id));
    }
  }

  // Reload items to check if all are fully collected
  const updatedItems = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  const allCollected = updatedItems.every(
    (item) => item.collectedQuantity >= item.quantity
  );
  const isPartial = !allCollected;

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (!isPartial) {
    updateData.status = "collected";
  }

  if (signatures) {
    updateData.senderSignature = signatures.senderSignature;
    updateData.receiverSignature = signatures.receiverSignature;
    updateData.signedAt = new Date();
  }

  await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, orderId));

  const statusForHistory = isPartial ? order.status : "collected";
  const note = isPartial
    ? "Partial collection — some items collected, backorder items pending"
    : signatures
    ? "Order collected by customer — signed off by both parties"
    : "Order collected by customer";

  await db.insert(orderStatusHistory).values({
    orderId,
    status: statusForHistory as any,
    note,
    changedBy: admin.id,
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");
  return { success: true, isPartial };
}

// ============ CUSTOMER COLLECTION BOOKING ============

/**
 * Allows a customer to book or reschedule their collection timeslot.
 * Works for: orders without a timeslot, rescheduling existing timeslots,
 * and booking follow-up collections for backorder items.
 */
export async function bookCollectionTimeslot(
  orderId: string,
  collectionDate: string,
  collectionSlot: "morning" | "afternoon"
) {
  const user = await requireAuth();

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, user.id)),
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (order.deliveryMethod !== "click_collect") {
    return { success: false, error: "This order is not click & collect" };
  }

  if (!["paid", "processing"].includes(order.status)) {
    return {
      success: false,
      error: "Collection timeslot can only be changed for active orders",
    };
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(collectionDate)) {
    return { success: false, error: "Invalid date format" };
  }

  // Validate date is not in the past (Perth time)
  const perthNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
  );
  const perthToday = `${perthNow.getFullYear()}-${String(
    perthNow.getMonth() + 1
  ).padStart(2, "0")}-${String(perthNow.getDate()).padStart(2, "0")}`;

  if (collectionDate < perthToday) {
    return { success: false, error: "Cannot book a date in the past" };
  }

  // Validate it's not a weekend
  const selectedDate = new Date(collectionDate + "T00:00:00+08:00");
  const dayOfWeek = selectedDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      success: false,
      error: "Collection is not available on weekends",
    };
  }

  const previousDate = order.collectionDate;
  const isReschedule = !!previousDate;

  await db
    .update(orders)
    .set({
      collectionDate,
      collectionSlot,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    orderId,
    status: order.status as any,
    note: isReschedule
      ? `Collection rescheduled from ${previousDate} to ${collectionDate} (${collectionSlot})`
      : `Collection booked for ${collectionDate} (${collectionSlot})`,
    changedBy: user.id,
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/orders");

  return { success: true };
}

// ============ DELIVERIES ============

export async function getDeliveryOrders() {
  await requireAdmin();

  // Fetch all delivery orders (local_delivery, interstate, international) — not click_collect
  const activeDeliveryOrders = await db.query.orders.findMany({
    where: and(
      ne(orders.deliveryMethod, "click_collect" as any),
      inArray(orders.status, [
        "paid",
        "processing",
        "shipped",
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
    orderBy: [desc(orders.createdAt)],
  });

  // Get recently delivered orders (last 7 days)
  const perthNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
  );
  const sevenDaysAgo = new Date(perthNow);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentlyDelivered = await db.query.orders.findMany({
    where: and(
      ne(orders.deliveryMethod, "click_collect" as any),
      eq(orders.status, "delivered" as any),
      gte(orders.updatedAt, sevenDaysAgo)
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
    orderBy: [desc(orders.updatedAt)],
  });

  // Separate by status
  const needsShipping = activeDeliveryOrders.filter(
    (o) => o.status === "paid" || o.status === "processing"
  );
  const inTransit = activeDeliveryOrders.filter((o) => o.status === "shipped");

  return {
    needsShipping,
    inTransit,
    recentlyDelivered,
  };
}

export async function markOrderShipped(orderId: string, note?: string) {
  const admin = await requireAdmin();

  await db
    .update(orders)
    .set({ status: "shipped", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    orderId,
    status: "shipped",
    note: note || "Order shipped for delivery",
    changedBy: admin.id,
  });

  revalidatePath("/dashboard/deliveries");
  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");
  return { success: true };
}

export async function markOrderDelivered(orderId: string, note?: string) {
  const admin = await requireAdmin();

  await db
    .update(orders)
    .set({ status: "delivered", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    orderId,
    status: "delivered",
    note: note || "Order delivered to customer",
    changedBy: admin.id,
  });

  revalidatePath("/dashboard/deliveries");
  revalidatePath("/dashboard/orders");
  revalidatePath("/orders");
  return { success: true };
}
