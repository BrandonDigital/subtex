"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  Package,
  Truck,
  AlertCircle,
  Tag,
  Check,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/server/actions/notifications";
import type { Notification } from "@/server/schemas/notifications";

interface NotificationPopoverProps {
  notifications: Notification[];
  unreadCount: number;
}

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

export function NotificationPopover({
  notifications,
  unreadCount,
}: NotificationPopoverProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);
  const router = useRouter();

  const closeAll = () => {
    setSheetOpen(false);
    setPopoverOpen(false);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      // Optimistically update UI
      setLocalNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setLocalUnreadCount((prev) => Math.max(0, prev - 1));

      // Mark as read in background
      startTransition(async () => {
        await markNotificationAsRead(notification.id);
        router.refresh();
      });
    }

    closeAll();

    // Navigate if there's a link
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    // Optimistically update UI
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setLocalUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsAsRead();
      router.refresh();
    });
  };

  const displayNotifications = localNotifications.slice(0, 5);
  const hasMore = localNotifications.length > 5;

  // Shared notification content
  const NotificationContent = ({
    isMobile = false,
  }: {
    isMobile?: boolean;
  }) => (
    <>
      {/* Header - only shown on desktop */}
      {!isMobile && (
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <div>
            <h4 className='font-semibold text-sm'>Notifications</h4>
            {localUnreadCount > 0 && (
              <p className='text-xs text-muted-foreground'>
                {localUnreadCount} unread
              </p>
            )}
          </div>
          {localUnreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 text-xs'
              onClick={handleMarkAllRead}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className='h-3 w-3 mr-1 animate-spin' />
              ) : (
                <Check className='h-3 w-3 mr-1' />
              )}
              Mark all read
            </Button>
          )}
        </div>
      )}

      {/* Mobile: Mark all read button */}
      {isMobile && localUnreadCount > 0 && (
        <div className='flex justify-end px-4 py-2 border-b'>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 text-xs'
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className='h-3 w-3 mr-1 animate-spin' />
            ) : (
              <Check className='h-3 w-3 mr-1' />
            )}
            Mark all read
          </Button>
        </div>
      )}

      {/* Notifications List */}
      {displayNotifications.length === 0 ? (
        <div className='py-8 text-center flex-1 flex flex-col items-center justify-center'>
          <Bell className='h-8 w-8 mx-auto text-muted-foreground/50 mb-2' />
          <p className='text-sm text-muted-foreground'>No notifications yet</p>
        </div>
      ) : (
        <ScrollArea className={isMobile ? "flex-1" : "max-h-[300px]"}>
          <div className='divide-y'>
            {displayNotifications.map((notification) => {
              const Icon = notificationIcons[notification.type] || Bell;
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "flex gap-3 p-3 w-full text-left hover:bg-muted/50 transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  {notification.imageUrl ? (
                    <div className='h-8 w-8 rounded-md overflow-hidden shrink-0 bg-muted'>
                      <Image
                        src={notification.imageUrl}
                        alt=''
                        width={32}
                        height={32}
                        className='h-full w-full object-cover'
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        notification.read ? "bg-muted" : "bg-primary/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          notification.read
                            ? "text-muted-foreground"
                            : "text-primary"
                        )}
                      />
                    </div>
                  )}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2'>
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          !notification.read && "text-primary"
                        )}
                      >
                        {notification.title}
                      </p>
                      <div className='flex items-center gap-1 shrink-0'>
                        <span className='text-[10px] text-muted-foreground'>
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        {!notification.read && (
                          <span className='h-1.5 w-1.5 rounded-full bg-primary' />
                        )}
                      </div>
                    </div>
                    <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
                      {notification.message}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      <div className='border-t p-2'>
        <Link href='/notifications' onClick={closeAll}>
          <Button variant='ghost' className='w-full h-8 text-xs'>
            View all notifications
          </Button>
        </Link>
      </div>
    </>
  );

  // Trigger button
  const TriggerButton = (
    <Button variant='ghost' size='icon' className='relative'>
      <Bell className='h-5 w-5' />
      {localUnreadCount > 0 && (
        <span className='absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive' />
      )}
      <span className='sr-only'>Notifications</span>
    </Button>
  );

  return (
    <>
      {/* Mobile: Full-screen sheet from right (leaves room for mobile nav) */}
      <div className='lg:hidden'>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>{TriggerButton}</SheetTrigger>
          <SheetContent
            side='right'
            hideOverlay
            className='h-[calc(100dvh-65px)] w-full flex flex-col p-0 [&>button]:hidden top-0 bottom-auto shadow-none'
          >
            {/* Header with back button and centered title */}
            <div className='flex items-center border-b px-2 py-3 relative'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => setSheetOpen(false)}
              >
                <ChevronLeft className='h-5 w-5' />
                <span className='sr-only'>Back</span>
              </Button>
              <h1 className='absolute left-1/2 -translate-x-1/2 font-semibold text-base'>
                Notifications
              </h1>
            </div>
            <SheetHeader className='sr-only'>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <NotificationContent isMobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Popover */}
      <div className='hidden lg:block'>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
          <PopoverContent align='end' className='w-80 p-0'>
            <NotificationContent />
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
