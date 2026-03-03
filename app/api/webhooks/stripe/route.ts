import { stripe } from "@/lib/server/stripe";
import { db } from "@/server/db";
import { orders, orderItems, orderStatusHistory } from "@/server/schemas/orders";
import { users } from "@/server/schemas/users";
import { products } from "@/server/schemas/products";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  pusher,
  PURCHASES_CHANNEL,
  PUSHER_EVENTS,
  type ProductPurchasedEvent,
} from "@/lib/server/pusher";
import { trySendOrderConfirmationEmail } from "@/server/actions/orders";
import { notifyAdminsOfNewOrder } from "@/server/actions/checkout";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        // Find the order by PaymentIntent ID
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.stripePaymentIntentId, paymentIntent.id))
          .limit(1);

        if (order && order.status === "pending") {
          // Mark order as paid
          await db
            .update(orders)
            .set({
              status: "paid",
              paidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));

          // Add status history entry
          await db.insert(orderStatusHistory).values({
            orderId: order.id,
            status: "paid",
            note: "Payment confirmed via Stripe",
          });

          // Decrement product stock for each order item
          const items = await db
            .select({
              productId: orderItems.productId,
              quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          for (const item of items) {
            await db
              .update(products)
              .set({
                stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)`,
                updatedAt: new Date(),
              })
              .where(eq(products.id, item.productId));
          }

          revalidatePath("/orders");
          revalidatePath("/dashboard/orders");
          revalidatePath("/dashboard/inventory");

          // Broadcast purchase notification for social proof
          try {
            let buyerFullName: string | null = null;

            if (order.userId) {
              const [user] = await db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.id, order.userId))
                .limit(1);
              buyerFullName = user?.name || null;
            } else {
              // Guest order — use guest name
              buyerFullName = order.guestName || null;
            }

            const notifItems = await db
              .select({
                name: orderItems.name,
                productId: orderItems.productId,
              })
              .from(orderItems)
              .where(eq(orderItems.orderId, order.id));

            if (buyerFullName && notifItems.length > 0) {
              const nameParts = buyerFullName.trim().split(/\s+/);
              const firstName = nameParts[0];
              const lastInitial =
                nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0]}.` : "";
              const buyerName = `${firstName}${lastInitial}`;

              // Fetch product image for the first item
              const [product] = await db
                .select({ imageUrl: products.imageUrl })
                .from(products)
                .where(eq(products.id, notifItems[0].productId))
                .limit(1);

              for (const notifItem of notifItems) {
                // Fetch image per item if multiple items
                let productImage = product?.imageUrl || undefined;
                if (notifItems.length > 1) {
                  const [prod] = await db
                    .select({ imageUrl: products.imageUrl })
                    .from(products)
                    .where(eq(products.id, notifItem.productId))
                    .limit(1);
                  productImage = prod?.imageUrl || undefined;
                }

                const event: ProductPurchasedEvent = {
                  buyerName,
                  productName: notifItem.name,
                  productImage,
                };

                await pusher.trigger(
                  PURCHASES_CHANNEL,
                  PUSHER_EVENTS.PRODUCT_PURCHASED,
                  event
                );
              }
            }
          } catch (err) {
            // Don't fail the webhook if the notification fails
            console.error("Failed to send purchase notification:", err);
          }

          // Notify admin users of the new order
          await notifyAdminsOfNewOrder(order);

          // Send order confirmation email (atomic — won't double-send if confirmation page already sent it)
          await trySendOrderConfirmationEmail(order.id);

          console.log(
            `Order ${order.orderNumber} marked as paid (PI: ${paymentIntent.id})`
          );
        } else if (!order) {
          console.warn(
            `No pending order found for PaymentIntent: ${paymentIntent.id}`
          );
        }

        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;

        // Only handle paid sessions with a payment intent
        if (session.payment_status === "paid" && session.payment_intent) {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id;

          // Check if an order already exists for this payment intent
          const [existingOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.stripePaymentIntentId, paymentIntentId))
            .limit(1);

          if (existingOrder && existingOrder.status === "pending") {
            // Order exists but still pending — mark as paid
            await db
              .update(orders)
              .set({
                status: "paid",
                paidAt: new Date(),
                stripeCheckoutSessionId: session.id,
                updatedAt: new Date(),
              })
              .where(eq(orders.id, existingOrder.id));

            await db.insert(orderStatusHistory).values({
              orderId: existingOrder.id,
              status: "paid",
              note: "Payment confirmed via Stripe Checkout Session",
            });

            // Decrement stock
            const items = await db
              .select({
                productId: orderItems.productId,
                quantity: orderItems.quantity,
              })
              .from(orderItems)
              .where(eq(orderItems.orderId, existingOrder.id));

            for (const item of items) {
              await db
                .update(products)
                .set({
                  stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)`,
                  updatedAt: new Date(),
                })
                .where(eq(products.id, item.productId));
            }

            await notifyAdminsOfNewOrder(existingOrder);
            await trySendOrderConfirmationEmail(existingOrder.id);

            revalidatePath("/orders");
            revalidatePath("/dashboard/orders");
            revalidatePath("/dashboard/inventory");

            console.log(
              `Order ${existingOrder.orderNumber} marked as paid via checkout.session.completed`
            );
          }
        }

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;

        console.warn(
          `Payment failed for PI: ${paymentIntent.id}`,
          paymentIntent.last_payment_error?.message
        );

        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
