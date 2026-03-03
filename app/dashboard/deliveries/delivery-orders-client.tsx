"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Package,
  Truck,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  CheckCircle2,
  Loader2,
  Globe,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  markOrderPacking,
  markOrderShipped,
  markOrderDelivered,
} from "@/server/actions/orders";
import { toast } from "@/components/ui/toast";

interface DeliveryUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  partNumber: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  quantity: number;
  unitPriceInCents: number;
  totalInCents: number;
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  status: string;
  deliveryMethod: string;
  totalInCents: number;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  deliveryAddressSnapshot: string | null;
  customerNotes: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: DeliveryUser | null;
  items: OrderItem[];
}

interface DeliveryOrdersClientProps {
  needsShipping: DeliveryOrder[];
  inTransit: DeliveryOrder[];
  recentlyDelivered: DeliveryOrder[];
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDeliveryMethodLabel(method: string) {
  switch (method) {
    case "local_delivery":
      return "Local Delivery";
    case "interstate":
      return "Interstate";
    case "international":
      return "International";
    default:
      return method;
  }
}

function getDeliveryMethodBadge(method: string) {
  switch (method) {
    case "local_delivery":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
          <Truck className="h-3 w-3 mr-1" />
          Local
        </Badge>
      );
    case "interstate":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800">
          <ArrowRight className="h-3 w-3 mr-1" />
          Interstate
        </Badge>
      );
    case "international":
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800">
          <Globe className="h-3 w-3 mr-1" />
          International
        </Badge>
      );
    default:
      return <Badge variant="outline">{method}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800">
          Needs Packing
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
          Packing
        </Badge>
      );
    case "shipped":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800">
          In Transit
        </Badge>
      );
    case "delivered":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
          Delivered
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function parseAddress(snapshot: string | null): Record<string, string> | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot);
  } catch {
    return null;
  }
}

function formatAddress(addr: Record<string, string> | null): string {
  if (!addr) return "No address provided";
  const parts = [
    addr.unit ? `${addr.unit}/` : "",
    addr.address,
    addr.city,
    addr.state,
    addr.postalCode,
  ].filter(Boolean);
  return parts.join(", ").replace(", /", "/");
}

type Tab = "needs_shipping" | "in_transit" | "delivered";

export function DeliveryOrdersClient({
  needsShipping,
  inTransit,
  recentlyDelivered,
}: DeliveryOrdersClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("needs_shipping");
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  const handleMarkPacking = async (orderId: string) => {
    setLoadingActions((prev) => ({ ...prev, [orderId]: true }));
    try {
      await markOrderPacking(orderId);
      toast.success("Order marked as packing");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleMarkShipped = async (orderId: string) => {
    setLoadingActions((prev) => ({ ...prev, [orderId]: true }));
    try {
      await markOrderShipped(orderId);
      toast.success("Order marked as shipped");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    setLoadingActions((prev) => ({ ...prev, [orderId]: true }));
    try {
      await markOrderDelivered(orderId);
      toast.success("Order marked as delivered");
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoadingActions((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const currentOrders =
    activeTab === "needs_shipping"
      ? needsShipping
      : activeTab === "in_transit"
        ? inTransit
        : recentlyDelivered;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Shipping</p>
                <p className="text-3xl font-bold">{needsShipping.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-3xl font-bold">{inTransit.length}</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recently Delivered</p>
                <p className="text-3xl font-bold">{recentlyDelivered.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "needs_shipping", label: "Needs Shipping", count: needsShipping.length },
          { key: "in_transit", label: "In Transit", count: inTransit.length },
          { key: "delivered", label: "Recently Delivered", count: recentlyDelivered.length },
        ] as const).map(({ key, label, count }) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(key)}
          >
            {label}
            {count > 0 && (
              <Badge
                variant={activeTab === key ? "secondary" : "outline"}
                className="ml-2 h-5 min-w-[20px] flex items-center justify-center text-xs"
              >
                {count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Orders list */}
      {currentOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No orders</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === "needs_shipping"
                ? "No delivery orders waiting to be shipped."
                : activeTab === "in_transit"
                  ? "No orders currently in transit."
                  : "No recently delivered orders."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {currentOrders.map((order) => (
            <DeliveryOrderCard
              key={order.id}
              order={order}
              isLoading={!!loadingActions[order.id]}
              onMarkPacking={() => handleMarkPacking(order.id)}
              onMarkShipped={() => handleMarkShipped(order.id)}
              onMarkDelivered={() => handleMarkDelivered(order.id)}
              isCompleted={order.status === "delivered"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryOrderCard({
  order,
  isLoading,
  onMarkPacking,
  onMarkShipped,
  onMarkDelivered,
  isCompleted = false,
}: {
  order: DeliveryOrder;
  isLoading: boolean;
  onMarkPacking: () => void;
  onMarkShipped: () => void;
  onMarkDelivered: () => void;
  isCompleted?: boolean;
}) {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const address = parseAddress(order.deliveryAddressSnapshot);

  return (
    <Card className={isCompleted ? "opacity-60" : ""}>
      <CardContent className="pt-6 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-sm">
                #{order.orderNumber}
              </span>
              {getStatusBadge(order.status)}
              {getDeliveryMethodBadge(order.deliveryMethod)}
            </div>

            {/* Customer info */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">
                  {order.user?.name || order.guestName || "Guest"}
                </span>
                {order.user?.company && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {order.user.company}
                  </span>
                )}
              </div>
              {(order.user?.phone || order.guestPhone) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <a
                    href={`tel:${order.user?.phone || order.guestPhone}`}
                    className="hover:underline"
                  >
                    {order.user?.phone || order.guestPhone}
                  </a>
                </div>
              )}
              {(order.user?.email || order.guestEmail) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a
                    href={`mailto:${order.user?.email || order.guestEmail}`}
                    className="hover:underline truncate"
                  >
                    {order.user?.email || order.guestEmail}
                  </a>
                </div>
              )}
            </div>

            {/* Delivery address */}
            {address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{formatAddress(address)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isCompleted && (
            <div className="flex flex-col gap-2 shrink-0">
              {order.status === "paid" && (
                <Button
                  size="sm"
                  onClick={onMarkPacking}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Package className="mr-1.5 h-3.5 w-3.5" />
                      Pack Order
                    </>
                  )}
                </Button>
              )}
              {order.status === "processing" && (
                <Button
                  size="sm"
                  onClick={onMarkShipped}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Truck className="mr-1.5 h-3.5 w-3.5" />
                      Mark Shipped
                    </>
                  )}
                </Button>
              )}
              {order.status === "shipped" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMarkDelivered}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Mark Delivered
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Items ({totalItems} {totalItems === 1 ? "sheet" : "sheets"})
          </p>
          <div className="space-y-1">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{item.name}</span>
                  {item.color && item.color !== "default" && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {item.color}
                    </span>
                  )}
                  {item.partNumber && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.partNumber}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  &times;{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium">{formatPrice(order.totalInCents)}</span>
            {order.deliveryFeeInCents > 0 && (
              <span className="text-xs text-muted-foreground">
                (incl. {formatPrice(order.deliveryFeeInCents)} delivery)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {order.customerNotes && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                Note: {order.customerNotes}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(order.createdAt)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
