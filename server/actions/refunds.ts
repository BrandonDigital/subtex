"use server";

import { db } from "../db";
import { auth } from "../auth";
import { headers } from "next/headers";
import {
  orders,
  orderItems,
  refundRequests,
  refundRequestItems,
  orderStatusHistory,
} from "../schemas/orders";
import { users } from "../schemas/users";
import { notifications, type NewNotification } from "../schemas/notifications";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/server/stripe";
import { sendEmail } from "./email";

// ============ AUTH HELPERS ============

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

async function notifyAdmins({
  title,
  message,
  link,
}: {
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const admins = await db.query.users.findMany({
      where: eq(users.role, "admin"),
      columns: { id: true },
    });

    if (admins.length === 0) return;

    const notifs: NewNotification[] = admins.map((admin) => ({
      userId: admin.id,
      type: "order_update" as const,
      title,
      message,
      link: link || null,
      read: false,
      emailSent: false,
    }));

    await db.insert(notifications).values(notifs);
    revalidatePath("/dashboard");
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }
}

// ============ USER ACTIONS ============

export async function requestRefund(
  orderId: string,
  reason: string,
  items: { orderItemId: string; quantity: number }[]
) {
  const user = await requireAuth();

  if (!items || items.length === 0) {
    return { success: false, error: "Please select at least one item to refund" };
  }

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, user.id)),
    with: { items: true },
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  if (
    !["paid", "processing", "shipped", "delivered", "collected"].includes(
      order.status
    )
  ) {
    return { success: false, error: "This order is not eligible for a refund" };
  }

  const existingRequest = await db.query.refundRequests.findFirst({
    where: and(
      eq(refundRequests.orderId, orderId),
      eq(refundRequests.status, "pending")
    ),
  });

  if (existingRequest) {
    return {
      success: false,
      error: "A refund request is already pending for this order",
    };
  }

  // Validate each requested item and calculate total
  const orderItemMap = new Map(order.items.map((i) => [i.id, i]));
  let totalRequestedCents = 0;
  const validatedItems: { orderItemId: string; quantity: number; amountInCents: number }[] = [];

  for (const reqItem of items) {
    const orderItem = orderItemMap.get(reqItem.orderItemId);
    if (!orderItem) {
      return { success: false, error: `Item not found in this order` };
    }

    const availableQty = orderItem.quantity - orderItem.refundedQuantity;
    if (reqItem.quantity <= 0 || reqItem.quantity > availableQty) {
      return {
        success: false,
        error: `Invalid quantity for "${orderItem.name}". Available: ${availableQty}`,
      };
    }

    const itemAmount = reqItem.quantity * orderItem.unitPriceInCents;
    totalRequestedCents += itemAmount;
    validatedItems.push({
      orderItemId: reqItem.orderItemId,
      quantity: reqItem.quantity,
      amountInCents: itemAmount,
    });
  }

  if (totalRequestedCents <= 0) {
    return { success: false, error: "Refund amount must be greater than zero" };
  }

  // Cap at remaining refundable order amount
  const maxRefundable = order.totalInCents - order.refundedAmountInCents;
  if (totalRequestedCents > maxRefundable) {
    totalRequestedCents = maxRefundable;
  }

  const [request] = await db
    .insert(refundRequests)
    .values({
      orderId,
      userId: user.id,
      reason,
      requestedAmountInCents: totalRequestedCents,
      status: "pending",
    })
    .returning();

  // Insert refund request items
  await db.insert(refundRequestItems).values(
    validatedItems.map((vi) => ({
      refundRequestId: request.id,
      orderItemId: vi.orderItemId,
      quantity: vi.quantity,
      amountInCents: vi.amountInCents,
    }))
  );

  await db
    .update(orders)
    .set({ status: "refund_requested", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    orderId,
    status: "refund_requested",
    note: `Refund requested for ${validatedItems.length} item(s): ${reason}`,
    changedBy: user.id,
  });

  const customerName = (user as { name?: string | null }).name || user.email;
  const amount = (totalRequestedCents / 100).toFixed(2);
  await notifyAdmins({
    title: "Refund Requested",
    message: `${customerName} has requested a refund of $${amount} for ${validatedItems.length} item(s) on order #${order.orderNumber}. Reason: ${reason}`,
    link: "/dashboard/orders",
  });

  revalidatePath("/orders");
  revalidatePath("/dashboard/orders");

  return { success: true, requestId: request.id };
}

export async function getUserRefundRequests() {
  const user = await requireAuth();

  const requests = await db.query.refundRequests.findMany({
    where: eq(refundRequests.userId, user.id),
    with: {
      order: true,
    },
    orderBy: [desc(refundRequests.createdAt)],
  });

  return requests;
}

export async function cancelRefundRequest(requestId: string) {
  const user = await requireAuth();

  const request = await db.query.refundRequests.findFirst({
    where: and(
      eq(refundRequests.id, requestId),
      eq(refundRequests.userId, user.id),
      eq(refundRequests.status, "pending")
    ),
    with: { order: true },
  });

  if (!request) {
    return { success: false, error: "Refund request not found or already processed" };
  }

  // Remove the refund request
  await db.delete(refundRequests).where(eq(refundRequests.id, requestId));

  // Restore order status
  const order = request.order;
  const previousStatus = order.paidAt ? "paid" : "pending";

  await db
    .update(orders)
    .set({ status: previousStatus, updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    status: previousStatus,
    note: "Refund request cancelled by customer",
    changedBy: user.id,
  });

  // Notify admins
  const customerName = (user as { name?: string | null }).name || user.email;
  await notifyAdmins({
    title: "Refund Cancelled",
    message: `${customerName} has cancelled their refund request for order #${order.orderNumber}.`,
    link: "/dashboard/orders",
  });

  revalidatePath("/orders");
  revalidatePath("/dashboard/orders");

  return { success: true };
}

// ============ ADMIN ACTIONS ============

export async function getRefundRequests(
  status?: "pending" | "approved" | "rejected" | "processed"
) {
  await requireAdmin();

  const requests = await db.query.refundRequests.findMany({
    where: status ? eq(refundRequests.status, status) : undefined,
    with: {
      order: {
        with: {
          items: true,
          user: true,
        },
      },
      user: true,
      items: {
        with: {
          orderItem: true,
        },
      },
    },
    orderBy: [desc(refundRequests.createdAt)],
  });

  return requests;
}

export async function approveRefund(
  requestId: string,
  approvedAmountInCents: number,
  adminNotes?: string
) {
  const admin = await requireAdmin();

  const request = await db.query.refundRequests.findFirst({
    where: eq(refundRequests.id, requestId),
    with: {
      order: true,
      user: true,
      items: true,
    },
  });

  if (!request) {
    return { success: false, error: "Refund request not found" };
  }

  if (request.status !== "pending") {
    return {
      success: false,
      error: "This refund request has already been processed",
    };
  }

  const order = request.order;
  const maxRefundable = order.totalInCents - order.refundedAmountInCents;

  if (approvedAmountInCents > maxRefundable) {
    return {
      success: false,
      error: `Maximum refundable amount is $${(maxRefundable / 100).toFixed(
        2
      )}`,
    };
  }

  if (!order.stripePaymentIntentId) {
    return { success: false, error: "No payment found for this order" };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      amount: approvedAmountInCents,
      reason: "requested_by_customer",
      metadata: {
        orderId: order.id,
        refundRequestId: requestId,
        adminId: admin.id,
      },
    });

    await db
      .update(refundRequests)
      .set({
        status: "processed",
        approvedAmountInCents,
        adminNotes,
        processedBy: admin.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, requestId));

    // Increment refundedQuantity on each order item from this request
    if (request.items && request.items.length > 0) {
      for (const ri of request.items) {
        await db
          .update(orderItems)
          .set({
            refundedQuantity: sql`${orderItems.refundedQuantity} + ${ri.quantity}`,
          })
          .where(eq(orderItems.id, ri.orderItemId));
      }
    }

    const newRefundedAmount =
      order.refundedAmountInCents + approvedAmountInCents;
    const isFullRefund = newRefundedAmount >= order.totalInCents;

    await db
      .update(orders)
      .set({
        refundedAmountInCents: newRefundedAmount,
        stripeRefundId: refund.id,
        refundedAt: new Date(),
        status: isFullRefund
          ? "refunded"
          : order.status === "refund_requested"
            ? "paid"
            : order.status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: isFullRefund ? "refunded" : order.status,
      note: `Refund of $${(approvedAmountInCents / 100).toFixed(2)} processed${
        adminNotes ? `: ${adminNotes}` : ""
      }`,
      changedBy: admin.id,
    });

    const customerEmail = request.user?.email;
    if (customerEmail) {
      await sendRefundProcessedEmail(
        customerEmail,
        request.user?.name || "Customer",
        order.orderNumber,
        approvedAmountInCents,
        isFullRefund
      );
    }

    revalidatePath("/orders");
    revalidatePath("/dashboard/orders");

    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error("Stripe refund error:", error);
    return { success: false, error: "Failed to process refund through Stripe" };
  }
}

export async function rejectRefund(requestId: string, adminNotes: string) {
  const admin = await requireAdmin();

  const request = await db.query.refundRequests.findFirst({
    where: eq(refundRequests.id, requestId),
    with: {
      order: true,
      user: true,
    },
  });

  if (!request) {
    return { success: false, error: "Refund request not found" };
  }

  if (request.status !== "pending") {
    return {
      success: false,
      error: "This refund request has already been processed",
    };
  }

  // Update refund request
  await db
    .update(refundRequests)
    .set({
      status: "rejected",
      adminNotes,
      processedBy: admin.id,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(refundRequests.id, requestId));

  // Restore order status (remove refund_requested status)
  const order = request.order;
  const previousStatus = order.paidAt ? "paid" : "pending";

  await db
    .update(orders)
    .set({
      status: previousStatus,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  // Add status history
  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    status: previousStatus,
    note: `Refund request rejected: ${adminNotes}`,
    changedBy: admin.id,
  });

  // Send email to customer
  const customerEmail = request.user?.email;
  if (customerEmail) {
    await sendRefundRejectedEmail(
      customerEmail,
      request.user?.name || "Customer",
      order.orderNumber,
      adminNotes
    );
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard/orders");

  return { success: true };
}

// ============ EMAIL HELPERS ============

async function sendRefundProcessedEmail(
  email: string,
  name: string,
  orderNumber: string,
  amountInCents: number,
  isFullRefund: boolean
) {
  const amount = (amountInCents / 100).toFixed(2);

  return sendEmail({
    to: email,
    subject: `Your refund of $${amount} has been processed`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Refund Processed</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${name}, your refund request for order #${orderNumber} has been approved and processed.
              </p>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #52525b;"><strong>Refund Amount:</strong> $${amount} AUD</p>
                <p style="margin: 8px 0 0 0; color: #52525b;"><strong>Order:</strong> #${orderNumber}</p>
                ${
                  isFullRefund
                    ? '<p style="margin: 8px 0 0 0; color: #16a34a;"><strong>Full refund issued</strong></p>'
                    : ""
                }
              </div>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                The refund will be credited to your original payment method within 5-10 business days.
              </p>
              <a href="${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"
              }/orders" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                View Orders
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                14B Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

async function sendRefundRejectedEmail(
  email: string,
  name: string,
  orderNumber: string,
  reason: string
) {
  return sendEmail({
    to: email,
    subject: `Update on your refund request for order #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Refund Request Update</h1>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${name}, we've reviewed your refund request for order #${orderNumber}.
              </p>
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
                <p style="color: #991b1b; margin: 0; font-weight: 500;">Unfortunately, we are unable to process this refund.</p>
              </div>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>Reason:</strong> ${reason}
              </p>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                If you have any questions or would like to discuss this further, please contact us.
              </p>
              <a href="${
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"
              }/contact" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                Contact Us
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                14B Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
