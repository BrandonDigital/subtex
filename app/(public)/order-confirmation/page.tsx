import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle,
  Package,
  ArrowRight,
  Truck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getOrderByNumber,
  trySendOrderConfirmationEmail,
} from "@/server/actions/orders";
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your order has been placed successfully.",
};

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

interface OrderConfirmationPageProps {
  searchParams: Promise<{ order?: string }>;
}

export default async function OrderConfirmationPage({
  searchParams,
}: OrderConfirmationPageProps) {
  const { order: orderNumber } = await searchParams;
  const order = orderNumber ? await getOrderByNumber(orderNumber) : null;

  // Send order confirmation email (atomic — safe to call on every page load)
  if (order?.id) {
    trySendOrderConfirmationEmail(order.id).catch((err) => {
      console.error("Failed to send order confirmation email from page:", err);
    });
  }

  return (
    <div className='py-12'>
      <ClearCartOnSuccess />
      <div className='container mx-auto px-4'>
        <div className='max-w-2xl mx-auto'>
          {/* Success header */}
          <div className='text-center mb-8'>
            <div className='h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6'>
              <CheckCircle className='h-10 w-10 text-green-600 dark:text-green-400' />
            </div>
            <h1 className='text-3xl font-bold mb-3'>Order Confirmed!</h1>
            <p className='text-muted-foreground'>
              Thank you for your purchase. Your payment has been processed
              successfully.
            </p>
          </div>

          {order ? (
            <div className='space-y-6'>
              {/* Order number & delivery method */}
              <Card>
                <CardContent className='pt-6'>
                  <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                    <div>
                      <p className='text-sm text-muted-foreground mb-1'>
                        Order Number
                      </p>
                      <p className='text-xl font-mono font-bold'>
                        {order.orderNumber}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                      {order.deliveryMethod === "local_delivery" ? (
                        <>
                          <Truck className='h-4 w-4' />
                          <span>Local Delivery</span>
                        </>
                      ) : (
                        <>
                          <MapPin className='h-4 w-4' />
                          <span>Click &amp; Collect</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order items */}
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg flex items-center gap-2'>
                    <Package className='h-5 w-5' />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='space-y-4'>
                    {order.items.map((item, index) => (
                      <div key={index}>
                        <div className='flex gap-3'>
                          {/* Product Thumbnail */}
                          <div className='h-16 w-16 shrink-0 rounded-md bg-muted overflow-hidden relative'>
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.name || "Product"}
                                fill
                                className='object-cover'
                                sizes='64px'
                              />
                            ) : (
                              <div className='h-full w-full flex items-center justify-center text-muted-foreground'>
                                <Package className='h-6 w-6' />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium'>{item.name}</p>
                            <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-0.5'>
                              {item.color && <span>{item.color}</span>}
                              {item.material && <span>{item.material}</span>}
                              {item.size && <span>{item.size}</span>}
                            </div>
                          </div>

                          {/* Price */}
                          <div className='text-right shrink-0'>
                            <p className='font-medium'>
                              {formatPrice(item.totalInCents)}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                              {item.quantity} x{" "}
                              {formatPrice(item.unitPriceInCents)}
                            </p>
                          </div>
                        </div>
                        {index < order.items.length - 1 && (
                          <Separator className='mt-4' />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <Separator className='my-4' />
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal</span>
                      <span>{formatPrice(order.subtotalInCents)}</span>
                    </div>
                    {order.discountInCents > 0 && (
                      <div className='flex justify-between text-green-600'>
                        <span>Discount</span>
                        <span>-{formatPrice(order.discountInCents)}</span>
                      </div>
                    )}
                    {order.deliveryFeeInCents > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                          Delivery Fee
                        </span>
                        <span>{formatPrice(order.deliveryFeeInCents)}</span>
                      </div>
                    )}
                    {order.holdingFeeInCents > 0 && (
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>
                          Holding Fee
                        </span>
                        <span>{formatPrice(order.holdingFeeInCents)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className='flex justify-between font-bold text-base pt-1'>
                      <span>Total (inc. GST)</span>
                      <span>{formatPrice(order.totalInCents)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info note */}
              <p className='text-sm text-muted-foreground text-center'>
                Please save your order number for your records. We&apos;ll
                contact you via email or phone with updates on your order.
              </p>
            </div>
          ) : (
            /* Fallback if order not found */
            orderNumber && (
              <Card className='mb-8'>
                <CardContent className='pt-6 text-center'>
                  <div className='flex items-center justify-center gap-3 mb-2'>
                    <Package className='h-5 w-5 text-muted-foreground' />
                    <span className='text-sm text-muted-foreground'>
                      Order Number
                    </span>
                  </div>
                  <p className='text-2xl font-mono font-bold'>{orderNumber}</p>
                  <p className='text-sm text-muted-foreground mt-3'>
                    Please save this order number for your records. We&apos;ll
                    contact you via email or phone with updates on your order.
                  </p>
                </CardContent>
              </Card>
            )
          )}

          {/* Actions */}
          <div className='space-y-3 mt-8 max-w-md mx-auto'>
            <Button asChild className='w-full'>
              <Link href='/'>
                Continue Shopping
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            <p className='text-xs text-muted-foreground text-center'>
              Want to track your orders?{" "}
              <Link
                href='/sign-up'
                className='text-primary hover:underline font-medium'
              >
                Create an account
              </Link>{" "}
              to view order history and get faster checkout.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
