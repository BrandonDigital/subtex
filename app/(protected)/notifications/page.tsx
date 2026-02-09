import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Bell, Package, Truck, AlertCircle, Tag, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getUserNotifications } from "@/server/actions/notifications";
import { MarkAllReadButton } from "./mark-all-read-button";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View your Subtex notifications and alerts.",
};

const notificationIcons: Record<string, typeof Package> = {
  order_update: Package,
  stock_alert: Bell,
  quote_ready: Truck,
  payment_link: Tag,
  promotion: Tag,
  system: AlertCircle,
  low_stock_admin: AlertCircle,
};

function formatTimeAgo(date: Date | string): string {
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
  const notifications = await getUserNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (notifications.length === 0) {
    return (
      <div className='py-12'>
        <div className='container mx-auto px-4'>
          <div className='max-w-2xl mx-auto text-center'>
            <div className='h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6'>
              <Bell className='h-12 w-12 text-muted-foreground' />
            </div>
            <h1 className='text-2xl font-bold mb-4'>No notifications</h1>
            <p className='text-muted-foreground mb-6'>
              You&apos;re all caught up! We&apos;ll notify you about orders,
              stock alerts, and more.
            </p>
            <Button asChild>
              <Link href='/'>Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='py-12'>
      <div className='container mx-auto px-4'>
        <div className='max-w-2xl mx-auto'>
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h1 className='text-3xl font-bold'>Notifications</h1>
              {unreadCount > 0 && (
                <p className='text-muted-foreground mt-1'>
                  {unreadCount} unread notification
                  {unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className='flex gap-2'>
              <MarkAllReadButton />
            </div>
          </div>

          <Card>
            <CardHeader className='pb-0'>
              <CardTitle className='sr-only'>Notification List</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='divide-y'>
                {notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type] || Bell;
                  const href = notification.link || "#";
                  return (
                    <Link
                      key={notification.id}
                      href={href}
                      className={cn(
                        "flex gap-4 p-4 hover:bg-muted/50 transition-colors",
                        !notification.read && "bg-primary/5"
                      )}
                    >
                      {notification.imageUrl ? (
                        <div className='h-10 w-10 rounded-md overflow-hidden flex-shrink-0 bg-muted'>
                          <Image
                            src={notification.imageUrl}
                            alt=''
                            width={40}
                            height={40}
                            className='h-full w-full object-cover'
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                            notification.read ? "bg-muted" : "bg-primary/10"
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
                      )}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <div>
                            <p
                              className={cn(
                                "font-medium",
                                !notification.read && "text-primary"
                              )}
                            >
                              {notification.title}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5 line-clamp-2'>
                              {notification.message}
                            </p>
                          </div>
                          <div className='flex items-center gap-2 flex-shrink-0'>
                            <span className='text-xs text-muted-foreground'>
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <Badge
                                variant='default'
                                className='h-2 w-2 p-0 rounded-full'
                              />
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
          <p className='text-center text-sm text-muted-foreground mt-6'>
            Manage your notification preferences in{" "}
            <Link href='/account' className='text-primary hover:underline'>
              Account Settings
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
