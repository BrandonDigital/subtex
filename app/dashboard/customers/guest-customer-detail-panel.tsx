"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getGuestCustomerOrderHistory,
  type GuestCustomerOrderHistory,
} from "@/server/actions/customers";

interface GuestCustomerDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  guestEmail: string | null;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function formatDate(date: Date | null): string {
  if (!date) return "Never";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

function getStatusColor(status: string): string {
  switch (status) {
    case "paid":
    case "delivered":
    case "collected":
      return "bg-green-500";
    case "processing":
    case "shipped":
      return "bg-blue-500";
    case "pending":
      return "bg-yellow-500";
    case "cancelled":
    case "refunded":
    case "refund_requested":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function GuestCustomerDetailPanel({
  isOpen,
  onClose,
  guestEmail,
}: GuestCustomerDetailPanelProps) {
  const [data, setData] = useState<GuestCustomerOrderHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && guestEmail) {
      setLoading(true);
      getGuestCustomerOrderHistory(guestEmail)
        .then(setData)
        .catch((error) => {
          console.error("Failed to load guest customer details:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, guestEmail]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />

      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background shadow-lg z-50 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Guest Customer</h2>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Guest
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-muted-foreground">
              Guest customer not found
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Guest Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getInitials(data.guest.name, data.guest.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-lg">
                        {data.guest.name || "No name"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {data.guest.email}
                      </div>
                    </div>
                  </div>

                  {data.guest.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {data.guest.phone}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Order Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">
                        {data.analytics.orderCount}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Orders
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">
                        {formatPrice(data.analytics.totalSpent)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Spent
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-3xl font-bold">
                        {formatPrice(data.analytics.averageOrderValue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Avg. Order Value
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-sm">
                        <p className="text-muted-foreground">First Order</p>
                        <p className="font-medium">
                          {formatDate(data.analytics.firstOrderDate)}
                        </p>
                        <p className="text-muted-foreground mt-2">
                          Last Order
                        </p>
                        <p className="font-medium">
                          {formatDate(data.analytics.lastOrderDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Order History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.orders.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground">
                      No orders yet
                    </p>
                  ) : (
                    data.orders.map((order, index) => (
                      <div key={order.id}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {order.orderNumber}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                <span
                                  className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(order.status)}`}
                                />
                                {formatStatus(order.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(order.createdAt)} •{" "}
                              {order.itemCount}{" "}
                              {order.itemCount === 1 ? "item" : "items"}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatPrice(order.totalInCents)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
