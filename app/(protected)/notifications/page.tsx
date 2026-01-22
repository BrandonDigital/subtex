import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Package, Truck, AlertCircle, Tag, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View your Subtex notifications and alerts.",
};

const notificationIcons = {
  order_update: Package,
  stock_alert: Bell,
  quote_ready: Truck,
  payment_link: Tag,
  promotion: Tag,
  system: AlertCircle,
};

function formatTimeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(then);
}

export default async function NotificationsPage() {
  // TODO: Fetch notifications from action
  const notifications = [
    {
      id: "1",
      type: "order_update" as const,
      title: "Order Shipped",
      message: "Your order SUB-ABC123-XYZ has been shipped and is on its way!",
      link: "/orders/1",
      read: false,
      createdAt: "2026-01-18T10:30:00Z",
    },
    {
      id: "2",
      type: "stock_alert" as const,
      title: "Back in Stock",
      message: "White Matte XL ACM Sheets are now back in stock!",
      link: "/",
      read: false,
      createdAt: "2026-01-18T09:00:00Z",
    },
    {
      id: "3",
      type: "quote_ready" as const,
      title: "Shipping Quote Ready",
      message: "Your interstate shipping quote is ready. Click to view and pay.",
      link: "/orders/3",
      read: true,
      createdAt: "2026-01-17T14:00:00Z",
    },
    {
      id: "4",
      type: "order_update" as const,
      title: "Order Delivered",
      message: "Your order SUB-GHI789-DEF has been delivered.",
      link: "/orders/2",
      read: true,
      createdAt: "2026-01-15T16:00:00Z",
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Bell className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-4">No notifications</h1>
            <p className="text-muted-foreground mb-6">
              You&apos;re all caught up! We&apos;ll notify you about orders, stock alerts, and more.
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
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-muted-foreground mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="sr-only">Notification List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <Link
                      key={notification.id}
                      href={notification.link || "#"}
                      className={cn(
                        "flex gap-4 p-4 hover:bg-muted/50 transition-colors",
                        !notification.read && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          notification.read
                            ? "bg-muted"
                            : "bg-primary/10"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            notification.read
                              ? "text-muted-foreground"
                              : "text-primary"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p
                              className={cn(
                                "font-medium",
                                !notification.read && "text-primary"
                              )}
                            >
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Settings Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Manage your notification preferences in{" "}
            <Link href="/account" className="text-primary hover:underline">
              Account Settings
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
