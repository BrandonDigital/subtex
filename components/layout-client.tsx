"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { CartSheet } from "@/components/cart-sheet";
import { Footer } from "@/components/footer";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { AdminSidebar } from "@/components/admin-sidebar";
import { PromoDialog, PromoFooterBanner } from "@/components/promo-dialog";
import { useCart } from "@/hooks/use-cart";
import type { Announcement } from "@/server/schemas/announcements";
import type { Notification } from "@/server/schemas/notifications";

interface LayoutClientProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    image?: string;
    isAdmin?: boolean;
  } | null;
  notifications?: Notification[];
  unreadCount?: number;
  announcements?: Announcement[];
}

export function LayoutClient({
  children,
  user,
  notifications = [],
  unreadCount = 0,
  announcements = [],
}: LayoutClientProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems, clearCartForSignOut } = useCart();
  const pathname = usePathname();

  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <div className='flex flex-col h-dvh max-h-dvh overflow-hidden'>
      {/* Navbar - fixed height */}
      <div className='flex-none z-50'>
        <Navbar
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          cartCount={totalItems}
          onCartClick={() => setCartOpen(true)}
          onSignOut={clearCartForSignOut}
        />

        {/* Show announcement banners on non-dashboard pages */}
        {!isDashboard && announcements.length > 0 && (
          <AnnouncementBanner announcements={announcements} />
        )}
      </div>

      {/* Main content area with sidebar */}
      <div className='flex-1 overflow-hidden'>
        <AdminSidebar isAdmin={user?.isAdmin}>
          <main>{children}</main>
          {!isDashboard && (
            <>
              <PromoFooterBanner />
              <Footer />
            </>
          )}
        </AdminSidebar>
      </div>

      {/* Mobile bottom nav */}
      <div className='lg:hidden flex-none z-50'>
        <MobileBottomNav
          cartCount={totalItems}
          onCartClick={() => setCartOpen(true)}
        />
      </div>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      {/* Promo dialog - only show on non-dashboard pages */}
      {!isDashboard && <PromoDialog />}
    </div>
  );
}
