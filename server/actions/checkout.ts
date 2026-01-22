"use server";

import Stripe from "stripe";
import { stripe, formatAmountForStripe } from "@/lib/stripe";
import { auth } from "../auth";
import { redirect } from "next/navigation";

export interface CheckoutItem {
  variantId: string;
  sku: string;
  color: string;
  material: string;
  size: string;
  priceInCents: number;
  quantity: number;
}

export interface CheckoutData {
  items: CheckoutItem[];
  deliveryMethod: "delivery" | "pickup";
  deliveryFeeInCents?: number;
  holdingFeeInCents?: number;
}

export async function createCheckoutSession(data: CheckoutData) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/checkout");
  }

  const { items, deliveryMethod, deliveryFeeInCents = 0, holdingFeeInCents = 0 } = data;

  // Calculate subtotal
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  // Build line items for Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (item) => ({
      price_data: {
        currency: "aud",
        product_data: {
          name: `ACM Sheet - ${item.color} ${item.material} ${item.size}`,
          description: `SKU: ${item.sku}`,
          metadata: {
            variantId: item.variantId,
            sku: item.sku,
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

  // Create Stripe checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email || undefined,
    line_items: lineItems,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/orders?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/checkout?canceled=true`,
    metadata: {
      userId: session.user.id,
      deliveryMethod,
      items: JSON.stringify(
        items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))
      ),
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
        userId: session.user.id,
        deliveryMethod,
      },
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  return { url: checkoutSession.url };
}

// Create a payment link for interstate/international quotes
export async function createPaymentLink(
  amount: number,
  description: string,
  customerEmail: string
) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "admin") {
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
        url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}/orders?quote_paid=true`,
      },
    },
  });

  return { url: paymentLink.url };
}
