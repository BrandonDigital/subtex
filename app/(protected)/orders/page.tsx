import type { Metadata } from "next";
import Link from "next/link";
import { Package, Truck, CheckCircle, Clock, MapPin, AlertCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getUserOrders } from "@/server/actions/orders";
import { RefundRequestButton } from "./refund-request-button";

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

export default async function OrdersPage() {
  const orders = await getUserOrders();

  if (orders.length === 0) {
    return (
      <div className="py-12">
        <div className="container mx-auto px-4">
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
      <div className="container mx-auto px-4">
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
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant} className="w-fit">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {hasPendingRefund && (
                          <Badge variant="secondary" className="w-fit">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Refund Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <span>{item.name}</span>
                          <span className="text-muted-foreground">
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
                        <p className="text-sm font-medium">Refund History</p>
                        {order.refundRequests.map((request: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {request.status === "pending" && "Request pending review"}
                              {request.status === "approved" && "Approved"}
                              {request.status === "rejected" && "Request declined"}
                              {request.status === "processed" && "Refund processed"}
                            </span>
                            <Badge
                              variant={
                                request.status === "pending" ? "secondary" :
                                request.status === "rejected" ? "destructive" :
                                "outline"
                              }
                            >
                              {request.status}
                            </Badge>
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
                          maxRefundable={order.totalInCents - order.refundedAmountInCents}
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
