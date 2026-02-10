"use server";

import Stripe from "stripe";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { auth } from "../auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { orders, orderItems, orderStatusHistory } from "../schemas/orders";
import { products } from "../schemas/products";
import { revalidatePath } from "next/cache";
import {
  pusher,
  PURCHASES_CHANNEL,
  PUSHER_EVENTS,
  type ProductPurchasedEvent,
} from "@/lib/pusher";
import { eq, sql } from "drizzle-orm";

/**
 * Generates a sequential order number using a PostgreSQL sequence.
 * Format: SUB-0001, SUB-0002, ..., SUB-9999, SUB-10000, ...
 */
async function generateOrderNumber(): Promise<string> {
  const result = await db.execute(
    sql`SELECT nextval('order_number_seq') as num`
  );
  const rows = result.rows as { num: string }[];
  const num = Number(rows[0].num);
  return `SUB-${String(num).padStart(4, "0")}`;
}

export interface CheckoutItem {
  productId: string;
  partNumber: string;
  name: string;
  color?: string;
  material?: string;
  size?: string;
  priceInCents: number;
  quantity: number;
}

export interface GuestInfo {
  firstName: string;
  email?: string;
  phone?: string;
}

export interface CheckoutData {
  items: CheckoutItem[];
  deliveryMethod: "delivery" | "pickup";
  deliveryFeeInCents?: number;
  holdingFeeInCents?: number;
  discountCodeId?: string;
  discountInCents?: number;
  guestInfo?: GuestInfo;
  collectionDate?: string; // YYYY-MM-DD
  collectionSlot?: "morning" | "afternoon";
  hasBackorderItems?: boolean;
}

export async function createCheckoutSession(data: CheckoutData) {
  const session = await auth.api.getSession({ headers: await headers() });

  const isGuest = !session?.user;

  // Guests must provide at least a first name and either email or phone
  if (isGuest) {
    if (!data.guestInfo?.firstName?.trim()) {
      throw new Error("First name is required for guest checkout");
    }
    if (!data.guestInfo?.email?.trim() && !data.guestInfo?.phone?.trim()) {
      throw new Error(
        "Please provide at least an email address or phone number"
      );
    }
  }

  const {
    items,
    deliveryMethod,
    deliveryFeeInCents = 0,
    holdingFeeInCents = 0,
    discountCodeId,
    discountInCents = 0,
    guestInfo,
    collectionDate,
    collectionSlot,
    hasBackorderItems,
  } = data;

  // Calculate subtotal
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  // Calculate discounted subtotal
  const discountedSubtotalInCents = Math.max(
    0,
    subtotalInCents - discountInCents
  );

  // Build line items for Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => ({
      price_data: {
        currency: "aud",
        product_data: {
          name: item.name,
          description: item.partNumber
            ? `Part Number: ${item.partNumber}`
            : undefined,
          metadata: {
            productId: item.productId,
            partNumber: item.partNumber,
          },
        },
        unit_amount: formatAmountForStripe(item.priceInCents),
      },
      quantity: item.quantity,
    })
  );

  // Add delivery fee if applicable
  if (deliveryMethod === "delivery" && deliveryFeeInCents > 0) {
    lineItems.push({
      price_data: {
        currency: "aud",
        product_data: {
          name: "Delivery Fee",
          description: "Local delivery within Perth metro area",
        },
        unit_amount: formatAmountForStripe(deliveryFeeInCents),
      },
      quantity: 1,
    });
  }

  // Add holding fee for click & collect
  if (deliveryMethod === "pickup" && holdingFeeInCents > 0) {
    lineItems.push({
      price_data: {
        currency: "aud",
        product_data: {
          name: "Holding Fee (Click & Collect)",
          description: "Refundable upon collection within 7 days",
        },
        unit_amount: formatAmountForStripe(holdingFeeInCents),
      },
      quantity: 1,
    });
  }

  // Add discount as a negative line item
  if (discountInCents > 0) {
    lineItems.push({
      price_data: {
        currency: "aud",
        product_data: {
          name: "Discount",
          description: "Promotional discount applied",
        },
        unit_amount: -formatAmountForStripe(discountInCents),
      },
      quantity: 1,
    });
  }

  // Determine customer email and user ID
  const customerEmail = isGuest
    ? guestInfo?.email || undefined
    : session.user.email || undefined;
  const userId = isGuest ? "" : session.user.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";

  // Guests go to a public confirmation page; logged-in users go to orders
  const successUrl = isGuest
    ? `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    : `${appUrl}/orders?success=true&session_id={CHECKOUT_SESSION_ID}`;

  // Create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: `${appUrl}/checkout?canceled=true`,
    metadata: {
      userId,
      isGuest: isGuest ? "true" : "false",
      guestFirstName: guestInfo?.firstName || "",
      guestEmail: guestInfo?.email || "",
      guestPhone: guestInfo?.phone || "",
      deliveryMethod,
      collectionDate: collectionDate || "",
      collectionSlot: collectionSlot || "",
      hasBackorderItems: hasBackorderItems ? "true" : "false",
      items: JSON.stringify(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      ),
      discountCodeId: discountCodeId || "",
      discountInCents: discountInCents.toString(),
    },
    shipping_address_collection:
      deliveryMethod === "delivery"
        ? {
            allowed_countries: ["AU"],
          }
        : undefined,
    phone_number_collection: {
      enabled: true,
    },
    billing_address_collection: "required",
    payment_intent_data: {
      metadata: {
        userId,
        isGuest: isGuest ? "true" : "false",
        guestFirstName: guestInfo?.firstName || "",
        guestEmail: guestInfo?.email || "",
        guestPhone: guestInfo?.phone || "",
        deliveryMethod,
        collectionDate: collectionDate || "",
        collectionSlot: collectionSlot || "",
        hasBackorderItems: hasBackorderItems ? "true" : "false",
        discountCodeId: discountCodeId || "",
        discountInCents: discountInCents.toString(),
      },
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  return { url: checkoutSession.url };
}

// ============ DEV CHECKOUT (bypass Stripe) ============

export interface DevCheckoutData {
  items: CheckoutItem[];
  deliveryMethod: "delivery" | "pickup";
  deliveryFeeInCents?: number;
  holdingFeeInCents?: number;
  discountCodeId?: string;
  discountInCents?: number;
  guestInfo?: GuestInfo;
  collectionDate?: string;
  collectionSlot?: "morning" | "afternoon";
  hasBackorderItems?: boolean;
  customerNotes?: string;
  deliveryAddressSnapshot?: {
    firstName: string;
    lastName: string;
    company?: string;
    address: string;
    unit?: string;
    city: string;
    state: string;
    postalCode: string;
    phone?: string;
  };
}

/**
 * Creates an order directly in the database, bypassing Stripe.
 * Use this for development/testing when Stripe is not configured.
 */
export async function createDevOrder(data: DevCheckoutData) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new Error("You must be signed in to use dev checkout");
  }

  const userId = session.user.id;

  const {
    items,
    deliveryMethod,
    deliveryFeeInCents = 0,
    holdingFeeInCents = 0,
    discountCodeId,
    discountInCents = 0,
    collectionDate,
    collectionSlot,
    hasBackorderItems,
    customerNotes,
    deliveryAddressSnapshot,
  } = data;

  // Calculate subtotal
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  // Calculate total
  const totalInCents = Math.max(
    0,
    subtotalInCents - discountInCents + deliveryFeeInCents + holdingFeeInCents
  );

  // Generate sequential order number
  const orderNumber = await generateOrderNumber();

  // Map delivery method
  const dbDeliveryMethod =
    deliveryMethod === "pickup" ? "click_collect" : "local_delivery";

  // Create the order
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId,
      status: "paid",
      deliveryMethod: dbDeliveryMethod as any,
      subtotalInCents,
      discountInCents,
      discountCodeId: discountCodeId || null,
      deliveryFeeInCents,
      holdingFeeInCents,
      totalInCents,
      paidAt: new Date(),
      collectionDate: collectionDate || null,
      collectionSlot: collectionSlot || null,
      hasBackorderItems: hasBackorderItems || false,
      deliveryAddressSnapshot: deliveryAddressSnapshot
        ? JSON.stringify(deliveryAddressSnapshot)
        : null,
      customerNotes: customerNotes || null,
      stripePaymentIntentId: `dev_${Date.now()}`,
      stripeCheckoutSessionId: `dev_session_${Date.now()}`,
    })
    .returning();

  if (!order) {
    throw new Error("Failed to create order");
  }

  // Create order items
  for (const item of items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.productId,
      partNumber: item.partNumber || null,
      name: item.name,
      color: item.color || null,
      material: item.material || null,
      size: item.size || null,
      quantity: item.quantity,
      unitPriceInCents: item.priceInCents,
      discountPercent: 0,
      totalInCents: item.priceInCents * item.quantity,
    });
  }

  // Create status history entry
  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    status: "paid",
    note: "Order placed via dev checkout (Stripe bypassed)",
    changedBy: userId,
  });

  // Broadcast purchase notification for social proof
  try {
    const buyerFullName = session.user.name?.trim() || "";
    const nameParts = buyerFullName.split(/\s+/);
    const firstName = nameParts[0] || "Someone";
    const lastInitial =
      nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0]}.` : "";
    const buyerName = `${firstName}${lastInitial}`;

    for (const item of items) {
      const [product] = await db
        .select({ imageUrl: products.imageUrl })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      const event: ProductPurchasedEvent = {
        buyerName,
        productName: item.name,
        productImage: product?.imageUrl || undefined,
      };

      await pusher.trigger(
        PURCHASES_CHANNEL,
        PUSHER_EVENTS.PRODUCT_PURCHASED,
        event
      );
    }
  } catch (err) {
    console.error("Failed to send purchase notification:", err);
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard/orders");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004";

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    redirectUrl: `${appUrl}/orders?success=true&order=${order.orderNumber}`,
  };
}

// ============ CUSTOM STRIPE PAYMENT (Payment Element) ============

export interface PaymentIntentData {
  amountInCents: number;
}

/**
 * Creates a Stripe PaymentIntent for use with the embedded Payment Element.
 * Called when the checkout page mounts.
 */
export async function createPaymentIntent(amountInCents: number) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.max(amountInCents, 50), // Stripe minimum is 50 cents AUD
    currency: "aud",
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Updates the PaymentIntent amount and/or metadata.
 * Called when cart totals change or right before confirming payment.
 */
export async function updatePaymentIntent(
  paymentIntentId: string,
  amountInCents: number,
  metadata?: Record<string, string>,
  options?: {
    receiptEmail?: string;
    description?: string;
  }
) {
  await stripe.paymentIntents.update(paymentIntentId, {
    amount: Math.max(amountInCents, 50),
    ...(metadata && { metadata }),
    ...(options?.receiptEmail && { receipt_email: options.receiptEmail }),
    ...(options?.description && { description: options.description }),
  });
}

export interface PendingOrderData {
  items: CheckoutItem[];
  deliveryMethod: "delivery" | "pickup";
  deliveryFeeInCents?: number;
  holdingFeeInCents?: number;
  discountCodeId?: string;
  discountInCents?: number;
  collectionDate?: string;
  collectionSlot?: "morning" | "afternoon";
  hasBackorderItems?: boolean;
  customerNotes?: string;
  deliveryAddressSnapshot?: {
    firstName: string;
    lastName: string;
    company?: string;
    address: string;
    unit?: string;
    city: string;
    state: string;
    postalCode: string;
    phone?: string;
  };
  paymentIntentId: string;
  guestInfo?: GuestInfo;
}

/**
 * Creates an order with "pending" status right before confirming payment.
 * The webhook will update the status to "paid" once payment succeeds.
 */
export async function createPendingOrder(data: PendingOrderData) {
  const session = await auth.api.getSession({ headers: await headers() });

  const isGuest = !session?.user;
  const userId = isGuest ? null : session.user.id;

  // Guests must provide at least a name and either email or phone
  if (isGuest) {
    if (!data.guestInfo?.firstName?.trim()) {
      throw new Error("First name is required for guest checkout");
    }
    if (!data.guestInfo?.email?.trim() && !data.guestInfo?.phone?.trim()) {
      throw new Error(
        "Please provide at least an email address or phone number"
      );
    }
  }

  const {
    items,
    deliveryMethod,
    deliveryFeeInCents = 0,
    holdingFeeInCents = 0,
    discountCodeId,
    discountInCents = 0,
    collectionDate,
    collectionSlot,
    hasBackorderItems,
    customerNotes,
    deliveryAddressSnapshot,
    paymentIntentId,
    guestInfo,
  } = data;

  // Calculate subtotal
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  // Calculate total
  const totalInCents = Math.max(
    0,
    subtotalInCents - discountInCents + deliveryFeeInCents + holdingFeeInCents
  );

  // Generate sequential order number
  const orderNumber = await generateOrderNumber();

  // Map delivery method
  const dbDeliveryMethod =
    deliveryMethod === "pickup" ? "click_collect" : "local_delivery";

  // Create the order with "pending" status
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId,
      status: "pending",
      deliveryMethod: dbDeliveryMethod as any,
      subtotalInCents,
      discountInCents,
      discountCodeId: discountCodeId || null,
      deliveryFeeInCents,
      holdingFeeInCents,
      totalInCents,
      collectionDate: collectionDate || null,
      collectionSlot: collectionSlot || null,
      hasBackorderItems: hasBackorderItems || false,
      deliveryAddressSnapshot: deliveryAddressSnapshot
        ? JSON.stringify(deliveryAddressSnapshot)
        : null,
      customerNotes: customerNotes || null,
      stripePaymentIntentId: paymentIntentId,
      // Guest checkout fields
      guestName: isGuest ? guestInfo?.firstName?.trim() || null : null,
      guestEmail: isGuest ? guestInfo?.email?.trim() || null : null,
      guestPhone: isGuest ? guestInfo?.phone?.trim() || null : null,
    })
    .returning();

  if (!order) {
    throw new Error("Failed to create order");
  }

  // Create order items
  for (const item of items) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: item.productId,
      partNumber: item.partNumber || null,
      name: item.name,
      color: item.color || null,
      material: item.material || null,
      size: item.size || null,
      quantity: item.quantity,
      unitPriceInCents: item.priceInCents,
      discountPercent: 0,
      totalInCents: item.priceInCents * item.quantity,
    });
  }

  // Create status history entry
  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    status: "pending",
    note: isGuest
      ? "Guest order created — awaiting payment confirmation"
      : "Order created — awaiting payment confirmation",
    changedBy: userId,
  });

  revalidatePath("/orders");
  revalidatePath("/dashboard/orders");

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
  };
}

// Create a payment link for interstate/international quotes
export async function createPaymentLink(
  amount: number,
  description: string,
  customerEmail: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id: string; role?: string } | undefined;

  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  // Create a product for the quote
  const product = await stripe.products.create({
    name: "Custom Shipping Quote",
    description,
  });

  // Create a price for the quote
  const price = await stripe.prices.create({
    currency: "aud",
    unit_amount: formatAmountForStripe(amount),
    product: product.id,
  });

  // Create a payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    metadata: {
      customerEmail,
      description,
    },
    after_completion: {
      type: "redirect",
      redirect: {
        url: `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"
        }/orders?quote_paid=true`,
      },
    },
  });

  return { url: paymentLink.url };
}
