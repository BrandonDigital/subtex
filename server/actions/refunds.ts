"use server";

import { db } from "../db";
import { auth } from "../auth";
import { orders, refundRequests, orderStatusHistory } from "../schemas/orders";
import { users } from "../schemas/users";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "./email";

// ============ AUTH HELPERS ============

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user;
}

// ============ USER ACTIONS ============

export async function requestRefund(
  orderId: string,
  reason: string,
  requestedAmountInCents?: number
) {
  const user = await requireAuth();

  // Get the order
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, user.id)),
    with: { items: true },
  });

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  // Check if order is eligible for refund
  if (!["paid", "processing", "shipped", "delivered", "collected"].includes(order.status)) {
    return { success: false, error: "This order is not eligible for a refund" };
  }

  // Check if there's already a pending refund request
  const existingRequest = await db.query.refundRequests.findFirst({
    where: and(
      eq(refundRequests.orderId, orderId),
      eq(refundRequests.status, "pending")
    ),
  });

  if (existingRequest) {
    return { success: false, error: "A refund request is already pending for this order" };
  }

  // Calculate max refundable amount
  const maxRefundable = order.totalInCents - order.refundedAmountInCents;
  const amountToRequest = requestedAmountInCents 
    ? Math.min(requestedAmountInCents, maxRefundable)
    : maxRefundable;

  if (amountToRequest <= 0) {
    return { success: false, error: "This order has already been fully refunded" };
  }

  // Create refund request
  const [request] = await db.insert(refundRequests).values({
    orderId,
    userId: user.id,
    reason,
    requestedAmountInCents: amountToRequest,
    status: "pending",
  }).returning();

  // Update order status
  await db.update(orders)
    .set({ status: "refund_requested", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // Add status history
  await db.insert(orderStatusHistory).values({
    orderId,
    status: "refund_requested",
    note: `Refund requested: ${reason}`,
    changedBy: user.id,
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

// ============ ADMIN ACTIONS ============

export async function getRefundRequests(status?: "pending" | "approved" | "rejected" | "processed") {
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

  // Get the refund request with order details
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
    return { success: false, error: "This refund request has already been processed" };
  }

  const order = request.order;
  const maxRefundable = order.totalInCents - order.refundedAmountInCents;

  if (approvedAmountInCents > maxRefundable) {
    return { success: false, error: `Maximum refundable amount is $${(maxRefundable / 100).toFixed(2)}` };
  }

  // Process refund through Stripe
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

    // Update refund request
    await db.update(refundRequests)
      .set({
        status: "processed",
        approvedAmountInCents,
        adminNotes,
        processedBy: admin.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundRequests.id, requestId));

    // Update order
    const newRefundedAmount = order.refundedAmountInCents + approvedAmountInCents;
    const isFullRefund = newRefundedAmount >= order.totalInCents;

    await db.update(orders)
      .set({
        refundedAmountInCents: newRefundedAmount,
        stripeRefundId: refund.id,
        refundedAt: new Date(),
        status: isFullRefund ? "refunded" : order.status === "refund_requested" ? "paid" : order.status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    // Add status history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: isFullRefund ? "refunded" : order.status,
      note: `Refund of $${(approvedAmountInCents / 100).toFixed(2)} processed${adminNotes ? `: ${adminNotes}` : ""}`,
      changedBy: admin.id,
    });

    // Send email to customer
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

export async function rejectRefund(
  requestId: string,
  adminNotes: string
) {
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
    return { success: false, error: "This refund request has already been processed" };
  }

  // Update refund request
  await db.update(refundRequests)
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
  
  await db.update(orders)
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
                ${isFullRefund ? '<p style="margin: 8px 0 0 0; color: #16a34a;"><strong>Full refund issued</strong></p>' : ""}
              </div>
              <p style="color: #52525b; line-height: 1.6; margin: 0 0 20px 0;">
                The refund will be credited to your original payment method within 5-10 business days.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/orders" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                View Orders
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
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
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/contact" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
                Contact Us
              </a>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
              <p style="color: #a1a1aa; font-size: 14px; margin: 0;">
                Subtex<br>
                16 Brewer Rd, Canning Vale, Perth, WA, 6155
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
