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
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileGridSidebar } from "./mobile-grid-sidebar";

const sidebarItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
  },
  {
    title: "Appointments",
    href: "/dashboard/appointments",
    icon: CalendarClock,
  },
  {
    title: "Products",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    title: "Inventory",
    href: "/dashboard/inventory",
    icon: Boxes,
  },
  {
    title: "Deliveries",
    href: "/dashboard/deliveries",
    icon: Truck,
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Customers",
    href: "/dashboard/customers",
    icon: UserCheck,
  },
  {
    title: "Companies",
    href: "/dashboard/companies",
    icon: Building2,
  },
  {
    title: "Carts",
    href: "/dashboard/carts",
    icon: ShoppingBasket,
  },
  {
    title: "Discount Codes",
    href: "/dashboard/discount-codes",
    icon: Ticket,
  },
  {
    title: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    title: "Announcements",
    href: "/dashboard/announcements",
    icon: Megaphone,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarContentProps {
  isCollapsed?: boolean;
}

function DesktopSidebarContent({ isCollapsed }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className='flex h-full flex-col'>
      <ScrollArea className='flex-1 min-h-0'>
        <nav className='py-2'>
          <ul className='space-y-1'>
            {sidebarItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center h-9 rounded-md px-3 text-sm transition-colors overflow-hidden whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <item.icon className='h-4 w-4 shrink-0 ml-2' />
                    <span
                      className={cn(
                        "ml-3 transition-opacity duration-300",
                        isCollapsed ? "opacity-0" : "opacity-100"
                      )}
                    >
                      {item.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </ScrollArea>
    </div>
  );
}

interface AdminSidebarProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function AdminSidebar({ children, isAdmin }: AdminSidebarProps) {
  const isMobile = useIsMobile();
  const isOpen = useSidebarStore((state) => state.isOpen);
  const setOpen = useSidebarStore((state) => state.setOpen);
  const setHovered = useSidebarStore((state) => state.setHovered);

  const handleMouseEnter = React.useCallback(() => {
    if (!isMobile) {
      setHovered(true);
      setOpen(true);
    }
  }, [isMobile, setHovered, setOpen]);

  const handleMouseLeave = React.useCallback(() => {
    if (!isMobile) {
      setHovered(false);
      setOpen(false);
    }
  }, [isMobile, setHovered, setOpen]);

  if (!isAdmin) {
    return <div id="main-scroll-area" className='w-full h-full overflow-y-auto'>{children}</div>;
  }

  // Mobile layout - full-screen grid sidebar that overlays content
  if (isMobile) {
    return (
      <div className='relative flex flex-col w-full h-full'>
        <div
          className={cn(
            "absolute inset-0 z-40 w-full h-full transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <MobileGridSidebar onClose={() => setOpen(false)} />
        </div>
        <div id="main-scroll-area" className='flex-1 w-full overflow-y-auto overflow-x-hidden'>
          {children}
        </div>
      </div>
    );
  }

  // Desktop layout with collapsible sidebar
  return (
    <div className='w-full flex h-full'>
      <aside
        className={cn(
          "flex flex-col h-full border-r bg-background transition-all duration-300 ease-in-out flex-none overflow-hidden relative z-10 pt-16",
          isOpen ? "w-56" : "w-14"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DesktopSidebarContent isCollapsed={!isOpen} />
      </aside>

      <div id="main-scroll-area" className='flex-1 h-full overflow-y-auto'>
        <div className='w-full'>{children}</div>
      </div>
    </div>
  );
}
