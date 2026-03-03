"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBasket,
  Boxes,
  Truck,
  Users,
  UserCheck,
  Building2,
  Bell,
  Megaphone,
  Ticket,
  CalendarClock,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const gridItems = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { title: "Appointments", href: "/dashboard/appointments", icon: CalendarClock },
  { title: "Products", href: "/dashboard/products", icon: Package },
  { title: "Inventory", href: "/dashboard/inventory", icon: Boxes },
  { title: "Deliveries", href: "/dashboard/deliveries", icon: Truck },
  { title: "Users", href: "/dashboard/users", icon: Users },
  { title: "Customers", href: "/dashboard/customers", icon: UserCheck },
  { title: "Companies", href: "/dashboard/companies", icon: Building2 },
  { title: "Carts", href: "/dashboard/carts", icon: ShoppingBasket },
  { title: "Discount Codes", href: "/dashboard/discount-codes", icon: Ticket },
  { title: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { title: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface MobileGridSidebarProps {
  onClose?: () => void;
}

export function MobileGridSidebar({ onClose }: MobileGridSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-fr min-h-full border-l border-t border-border">
          {gridItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const IconComponent = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="block"
                onClick={onClose}
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center p-6 transition-all duration-200 cursor-pointer h-full w-full border-r border-b border-border",
                    "hover:bg-accent/50",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="flex items-center justify-center w-16 h-16 mb-2">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-medium text-center leading-tight">
                    {item.title}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
