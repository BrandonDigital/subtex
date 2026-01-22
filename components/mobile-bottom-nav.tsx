"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingCart, ClipboardList, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  cartCount?: number;
  onCartClick?: () => void;
}

export function MobileBottomNav({ cartCount = 0, onCartClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Products",
      icon: Package,
      isActive: pathname === "/",
    },
    {
      href: "#cart",
      label: "Cart",
      icon: ShoppingCart,
      isActive: false,
      onClick: onCartClick,
      badge: cartCount,
    },
    {
      href: "/orders",
      label: "Orders",
      icon: ClipboardList,
      isActive: pathname === "/orders",
    },
    {
      href: "/account",
      label: "Profile",
      icon: User,
      isActive: pathname === "/account",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          
          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 px-2 transition-colors",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 px-2 transition-colors",
                item.isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
