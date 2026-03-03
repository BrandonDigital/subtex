import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CuttingSpecBadge } from "@/components/cut-plan-configurator";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  ArrowLeft,
  RotateCcw,
  CreditCard,
  FileText,
  CalendarDays,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getUserOrderById } from "@/server/actions/orders";
import { siteConfig } from "@/lib/seo";
import { RefundRequestButton } from "../refund-request-button";
import { CancelRefundButton } from "../cancel-refund-button";
import { CollectionTimeslotManager } from "../collection-timeslot-manager";

export const metadata: Metadata = {
  title: "Order Details",
  description: "View your order details and tracking information.",
};

const statusConfig: Record<
  string,
  {
    label: string;
    icon: any;
    variant: "secondary" | "default" | "destructive" | "outline";
    color: string;
  }
> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary", color: "text-muted-foreground" },
  paid: { label: "Paid", icon: CreditCard, variant: "default", color: "text-blue-600" },
  processing: { label: "Processing", icon: Package, variant: "default", color: "text-blue-600" },
  shipped: { label: "Shipped", icon: Truck, variant: "default", color: "text-blue-600" },
  delivered: { label: "Delivered", icon: CheckCircle, variant: "outline", color: "text-green-600" },
  collected: { label: "Collected", icon: MapPin, variant: "outline", color: "text-green-600" },
  cancelled: { label: "Cancelled", icon: Clock, variant: "destructive", color: "text-destructive" },
  refund_requested: { label: "Refund Requested", icon: RotateCcw, variant: "secondary", color: "text-amber-600" },
  refunded: { label: "Refunded", icon: RotateCcw, variant: "secondary", color: "text-amber-600" },
};

const statusSteps = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

const collectSteps = [
  "pending",
  "paid",
  "processing",
  "collected",
];

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

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function getDeliveryMethodLabel(method: string): string {
  switch (method) {
    case "click_collect":
      return "Click & Collect";
    case "local_delivery":
      return "Local Delivery";
    case "interstate":
      return "Interstate Shipping";
    case "international":
      return "International Shipping";
    default:
      return method;
  }
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params;
  const order = await getUserOrderById(id);

  if (!order) {
    notFound();
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const hasPendingRefund = order.refundRequests?.some((r) => r.status === "pending");
  const hasRefundableItems = order.items.some(
    (item) => item.quantity - item.refundedQuantity > 0
  );
  const canRequestRefund =
    ["paid", "processing", "shipped", "delivered", "collected"].includes(order.status) &&
    !hasPendingRefund &&
    hasRefundableItems &&
    order.refundedAmountInCents < order.totalInCents;

  // Determine the progress steps
  const isCollect = order.deliveryMethod === "click_collect";
  const steps = isCollect ? collectSteps : statusSteps;
  const isCancelled = ["cancelled", "refunded", "refund_requested"].includes(order.status);
  const currentStepIndex = isCancelled ? -1 : steps.indexOf(order.status);

  // Parse delivery address snapshot
  let deliveryAddress: {
    recipientName?: string;
    phone?: string;
    street?: string;
    unit?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
  } | null = null;

  if (order.deliveryAddressSnapshot) {
    try {
      deliveryAddress = JSON.parse(order.deliveryAddressSnapshot);
    } catch {
      // fallback to the linked address
    }
  }

  if (!deliveryAddress && order.deliveryAddress) {
    const addr = order.deliveryAddress;
    deliveryAddress = {
      recipientName: addr.recipientName ?? undefined,
      phone: addr.phone ?? undefined,
      street: addr.street ?? undefined,
      unit: addr.unit ?? undefined,
      suburb: addr.suburb ?? undefined,
      state: addr.state ?? undefined,
      postcode: addr.postcode ?? undefined,
      country: addr.country ?? undefined,
    };
  }

  return (
    <div className="py-12">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
              <p className="text-muted-foreground mt-1">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="text-sm px-3 py-1">
                <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                {status.label}
              </Badge>
              {hasPendingRefund && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Refund Pending
                </Badge>
              )}
            </div>
          </div>

          {/* Status Progress Bar */}
          {!isCancelled && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => {
                    const stepStatus = statusConfig[step];
                    const StepIcon = stepStatus.icon;
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                              isCompleted
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-muted-foreground/50"
                            } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}
                          >
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <span
                            className={`text-xs mt-2 font-medium hidden sm:block ${
                              isCompleted ? "text-foreground" : "text-muted-foreground/50"
                            }`}
                          >
                            {stepStatus.label}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-2 sm:mx-3 ${
                              index < currentStepIndex ? "bg-primary" : "bg-muted-foreground/20"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Items ({order.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={item.id}>
                        <div className="flex gap-4">
                          {/* Thumbnail */}
                          <div className="h-20 w-20 shrink-0 rounded-lg bg-muted overflow-hidden relative">
                            {item.product?.imageUrl ? (
                              <Image
                                src={item.product.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                <Package className="h-8 w-8" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{item.name}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-1">
                              {item.partNumber && <span>{item.partNumber}</span>}
                              {item.color && <span>{item.color}</span>}
                              {item.material && <span>{item.material}</span>}
                              {item.size && <span>{item.size}</span>}
                            </div>
                            {item.cuttingSpec && (() => {
                              try {
                                const spec = typeof item.cuttingSpec === "string" ? JSON.parse(item.cuttingSpec) : item.cuttingSpec;
                                return <div className="mt-1"><CuttingSpecBadge spec={spec} /></div>;
                              } catch { return null; }
                            })()}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-muted-foreground">
                                Qty: {item.quantity}
                              </span>
                              <span className="text-muted-foreground">
                                @ {formatPrice(item.unitPriceInCents)} each
                              </span>
                              {item.discountPercent > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.discountPercent}% off
                                </Badge>
                              )}
                              {item.refundedQuantity > 0 && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                  {item.refundedQuantity} of {item.quantity} refunded
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0">
                            <p className="font-semibold">
                              {formatPrice(item.totalInCents)}
                            </p>
                          </div>
                        </div>
                        {index < order.items.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status History / Timeline */}
              {order.statusHistory && order.statusHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Order Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {order.statusHistory.map((entry, index) => {
                        const entryStatus = statusConfig[entry.status] || statusConfig.pending;
                        const EntryIcon = entryStatus.icon;
                        const isLast = index === order.statusHistory.length - 1;

                        return (
                          <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                                  index === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <EntryIcon className="h-3.5 w-3.5" />
                              </div>
                              {!isLast && (
                                <div className="w-px flex-1 bg-border mt-1" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="pt-0.5 pb-1">
                              <p className="font-medium text-sm">
                                {entryStatus.label}
                              </p>
                              {entry.note && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {entry.note}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(entry.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Refund History */}
              {order.refundRequests && order.refundRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Refund Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {order.refundRequests.map((request, index) => (
                        <div key={request.id}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    request.status === "pending"
                                      ? "secondary"
                                      : request.status === "rejected"
                                      ? "destructive"
                                      : request.status === "approved" || request.status === "processed"
                                      ? "outline"
                                      : "secondary"
                                  }
                                >
                                  {request.status === "pending" && "Pending Review"}
                                  {request.status === "approved" && "Approved"}
                                  {request.status === "rejected" && "Declined"}
                                  {request.status === "processed" && "Processed"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTime(request.createdAt)}
                                </span>
                              </div>
                              {request.items && request.items.length > 0 && (
                                <div className="bg-muted/50 rounded-md p-2 mt-1 space-y-1">
                                  {request.items.map((ri: { id: string; quantity: number; amountInCents: number; orderItem: { name: string } }) => (
                                    <div key={ri.id} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        {ri.orderItem.name} &times; {ri.quantity}
                                      </span>
                                      <span>{formatPrice(ri.amountInCents)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {request.reason}
                              </p>
                              {request.approvedAmountInCents && (
                                <p className="text-sm text-green-600">
                                  Refunded: {formatPrice(request.approvedAmountInCents)}
                                </p>
                              )}
                              {request.status === "pending" && (
                                <div className="pt-1">
                                  <CancelRefundButton
                                    requestId={request.id}
                                    orderNumber={order.orderNumber}
                                  />
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-medium shrink-0">
                              {formatPrice(request.requestedAmountInCents)}
                            </p>
                          </div>
                          {index < order.refundRequests.length - 1 && (
                            <Separator className="mt-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotalInCents)}</span>
                  </div>
                  {order.discountInCents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(order.discountInCents)}</span>
                    </div>
                  )}
                  {order.deliveryFeeInCents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>{formatPrice(order.deliveryFeeInCents)}</span>
                    </div>
                  )}
                  {order.holdingFeeInCents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Holding Fee</span>
                      <span>{formatPrice(order.holdingFeeInCents)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total (inc. GST)</span>
                    <span>{formatPrice(order.totalInCents)}</span>
                  </div>
                  {order.refundedAmountInCents > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Refunded</span>
                      <span>{formatPrice(order.refundedAmountInCents)}</span>
                    </div>
                  )}
                  {order.paidAt && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Paid on {formatDateTime(order.paidAt)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Collection Timeslot Manager (for active click & collect orders) */}
              {order.deliveryMethod === "click_collect" &&
                ["paid", "processing"].includes(order.status) && (
                  <CollectionTimeslotManager
                    orderId={order.id}
                    currentDate={order.collectionDate}
                    currentSlot={order.collectionSlot}
                    orderStatus={order.status}
                    hasBackorderItems={order.hasBackorderItems}
                  />
                )}

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {order.deliveryMethod === "click_collect" ? (
                      <MapPin className="h-5 w-5" />
                    ) : (
                      <Truck className="h-5 w-5" />
                    )}
                    {order.deliveryMethod === "click_collect"
                      ? "Collection Details"
                      : "Delivery"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <Badge variant="outline" className="font-medium">
                    {getDeliveryMethodLabel(order.deliveryMethod)}
                  </Badge>

                  {order.deliveryMethod === "click_collect" && (
                    <>
                      {/* Pickup Location */}
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1.5">
                          Pickup Location
                        </p>
                        <p className="font-medium">{siteConfig.business.name} Warehouse</p>
                        <p>{siteConfig.business.address.street}</p>
                        <p>
                          {siteConfig.business.address.suburb},{" "}
                          {siteConfig.business.address.state}{" "}
                          {siteConfig.business.address.postcode}
                        </p>
                      </div>

                      {/* Opening Hours */}
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1.5">
                          Opening Hours
                        </p>
                        <div className="space-y-0.5">
                          {siteConfig.business.openingHours.map((h, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-muted-foreground">{h.days}</span>
                              <span>{h.hours}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Balance Due on Pickup */}
                      {order.balanceDueInCents != null && order.balanceDueInCents > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-blue-800 dark:text-blue-200">
                          <p className="text-xs font-medium">Balance Due on Pickup</p>
                          <p className="font-semibold text-base">
                            {formatPrice(order.balanceDueInCents)}
                          </p>
                        </div>
                      )}

                      {/* Holding Expiry Warning */}
                      {order.holdingExpiresAt && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-amber-800 dark:text-amber-200">
                          <p className="text-xs font-medium">Collect by</p>
                          <p className="font-semibold">
                            {formatDate(order.holdingExpiresAt)}
                          </p>
                          <p className="text-xs mt-1 opacity-80">
                            Items not collected by this date may be released.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {deliveryAddress &&
                    order.deliveryMethod !== "click_collect" && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium mb-1.5">
                          Shipping Address
                        </p>
                        {deliveryAddress.recipientName && (
                          <p className="font-medium">{deliveryAddress.recipientName}</p>
                        )}
                        <p>
                          {deliveryAddress.unit && `${deliveryAddress.unit}/`}
                          {deliveryAddress.street}
                        </p>
                        <p>
                          {deliveryAddress.suburb}, {deliveryAddress.state}{" "}
                          {deliveryAddress.postcode}
                        </p>
                        {deliveryAddress.country &&
                          deliveryAddress.country !== "Australia" && (
                            <p>{deliveryAddress.country}</p>
                          )}
                        {deliveryAddress.phone && (
                          <p className="text-muted-foreground mt-1">
                            {deliveryAddress.phone}
                          </p>
                        )}
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Customer Notes */}
              {order.customerNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {order.customerNotes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="space-y-2">
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
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/contact">Need Help?</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
