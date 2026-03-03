import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Package, Truck, CheckCircle, Clock, MapPin, RotateCcw } from "lucide-react";
import { CuttingSpecBadge } from "@/components/cut-plan-configurator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getUserOrders,
  getOrderByNumber,
  trySendOrderConfirmationEmail,
} from "@/server/actions/orders";
import { RefundRequestButton } from "./refund-request-button";
import { CancelRefundButton } from "./cancel-refund-button";
import { ClearCartOnSuccess } from "@/components/clear-cart-on-success";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View and track your Subtex orders.",
};

// Status configuration
const statusConfig: Record<string, { label: string; icon: any; variant: "secondary" | "default" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  paid: { label: "Paid", icon: CheckCircle, variant: "default" },
  processing: { label: "Processing", icon: Package, variant: "default" },
  shipped: { label: "Shipped", icon: Truck, variant: "default" },
  delivered: { label: "Delivered", icon: CheckCircle, variant: "outline" },
  collected: { label: "Collected", icon: MapPin, variant: "outline" },
  cancelled: { label: "Cancelled", icon: Clock, variant: "destructive" },
  refund_requested: { label: "Refund Requested", icon: RotateCcw, variant: "secondary" },
  refunded: { label: "Refunded", icon: RotateCcw, variant: "secondary" },
};

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

interface OrdersPageProps {
  searchParams: Promise<{ success?: string; order?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { success, order: orderNumber } = await searchParams;
  const orders = await getUserOrders();

  // If redirected from checkout, try to send confirmation email
  if (success === "true" && orderNumber) {
    const order = await getOrderByNumber(orderNumber);
    if (order?.id) {
      trySendOrderConfirmationEmail(order.id).catch((err) => {
        console.error("Failed to send order confirmation email from orders page:", err);
      });
    }
  }

  if (orders.length === 0) {
    return (
      <div className="py-12">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-4">No orders yet</h1>
            <p className="text-muted-foreground mb-6">
              You haven&apos;t placed any orders yet. Browse our ACM sheets and place your first order.
            </p>
            <Button asChild>
              <Link href="/">Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      {success === "true" && <ClearCartOnSuccess />}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Orders</h1>

          <div className="space-y-6">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const hasPendingRefund = order.refundRequests?.some(r => r.status === "pending");
              const canRequestRefund = 
                ["paid", "processing", "shipped", "delivered", "collected"].includes(order.status) &&
                !hasPendingRefund &&
                order.refundedAmountInCents < order.totalInCents;

              return (
                <Card key={order.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">
                          Order {order.orderNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="w-fit">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          <div className="h-12 w-12 shrink-0 rounded-md bg-muted overflow-hidden relative">
                            {item.product?.imageUrl ? (
                              <Image
                                src={item.product.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            {(item.color || item.size) && (
                              <p className="text-xs text-muted-foreground">
                                {[item.color, item.material, item.size].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {item.cuttingSpec && (() => {
                              try {
                                const spec = typeof item.cuttingSpec === "string" ? JSON.parse(item.cuttingSpec) : item.cuttingSpec;
                                return <div className="mt-0.5"><CuttingSpecBadge spec={spec} /></div>;
                              } catch { return null; }
                            })()}
                          </div>
                          <span className="text-sm text-muted-foreground shrink-0">
                            × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Order Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Delivery: </span>
                          {order.deliveryMethod === "click_collect"
                            ? "Click & Collect"
                            : order.deliveryMethod === "local_delivery"
                            ? "Local Delivery"
                            : order.deliveryMethod === "interstate"
                            ? "Interstate Shipping"
                            : "International Shipping"}
                        </p>
                        {order.deliveryMethod === "click_collect" &&
                          order.collectionDate && (
                            <p>
                              <span className="text-muted-foreground">Collection: </span>
                              {new Intl.DateTimeFormat("en-AU", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }).format(new Date(order.collectionDate + "T00:00:00"))}
                              {order.collectionSlot && (
                                <span className="text-muted-foreground">
                                  {" "}({order.collectionSlot === "morning" ? "8:00 AM – 11:30 AM" : "11:30 AM – 3:00 PM"})
                                </span>
                              )}
                            </p>
                          )}
                        {order.deliveryMethod === "click_collect" &&
                          order.holdingExpiresAt && (
                            <p className="text-amber-600">
                              Collect by {formatDate(order.holdingExpiresAt)}
                            </p>
                          )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">
                          {formatPrice(order.totalInCents)}
                        </p>
                        {order.refundedAmountInCents > 0 && (
                          <p className="text-sm text-green-600">
                            {formatPrice(order.refundedAmountInCents)} refunded
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Refund Request Status */}
                    {order.refundRequests && order.refundRequests.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        {order.refundRequests.map((request: any) => (
                          <div key={request.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {request.status === "pending" && "Refund request pending review"}
                              {request.status === "approved" && "Refund approved"}
                              {request.status === "rejected" && "Refund request declined"}
                              {request.status === "processed" && "Refund processed"}
                            </span>
                            {request.status === "pending" && (
                              <CancelRefundButton
                                requestId={request.id}
                                orderNumber={order.orderNumber}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/orders/${order.id}`}>View Details</Link>
                      </Button>
                      {order.status === "shipped" && (
                        <Button variant="outline" size="sm">
                          Track Delivery
                        </Button>
                      )}
                      {canRequestRefund && (
                        <RefundRequestButton
                          orderId={order.id}
                          orderNumber={order.orderNumber}
                          items={order.items.map((item) => ({
                            id: item.id,
                            name: item.name,
                            partNumber: item.partNumber,
                            color: item.color,
                            material: item.material,
                            size: item.size,
                            quantity: item.quantity,
                            refundedQuantity: item.refundedQuantity,
                            unitPriceInCents: item.unitPriceInCents,
                          }))}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
