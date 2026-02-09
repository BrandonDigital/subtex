"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  Truck,
  Users,
  Bell,
  Megaphone,
  Ticket,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
];

interface SidebarContentProps {
  isCollapsed?: boolean;
  onLinkClick?: () => void;
}

function SidebarContent({ isCollapsed, onLinkClick }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className='flex h-full flex-col'>
      {/* Navigation */}
      <ScrollArea className='flex-1'>
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
                    onClick={onLinkClick}
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

  // Handle hover for desktop
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

  // If not admin, just render children with scroll wrapper
  if (!isAdmin) {
    return <div className='w-full h-full overflow-y-auto'>{children}</div>;
  }

  // Mobile layout - sidebar opens as a Sheet
  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setOpen}>
          <SheetContent side='left' className='w-64 p-0'>
            <SheetTitle className='sr-only'>Admin Navigation</SheetTitle>
            <SidebarContent onLinkClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className='w-full h-full overflow-y-auto'>{children}</div>
      </>
    );
  }

  // Desktop layout with collapsible sidebar
  return (
    <div className='w-full flex h-full'>
      {/* Collapsible Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300 ease-in-out flex-none overflow-hidden relative z-10",
          isOpen ? "w-56" : "w-14"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SidebarContent isCollapsed={!isOpen} />
      </aside>

      {/* Main Content */}
      <ScrollArea className='flex-1 h-full'>
        <div className='w-full'>{children}</div>
      </ScrollArea>
    </div>
  );
}
