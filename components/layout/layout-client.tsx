"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Navbar } from "./navbar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { CartSheet } from "@/components/cart-sheet";
import { Footer } from "./footer";
import { AnnouncementBanner } from "./announcement-banner";
import { AdminSidebar } from "./admin-sidebar";
import { PromoDialog, PromoFooterBanner } from "@/components/promo-dialog";
import { useCart } from "@/hooks/use-cart";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
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
  cuttingFeePerSheetInCents?: number;
}

const EMPTY_NOTIFICATIONS: Notification[] = [];
const EMPTY_ANNOUNCEMENTS: Announcement[] = [];

export function LayoutClient({
  children,
  user,
  notifications = EMPTY_NOTIFICATIONS,
  unreadCount = 0,
  announcements = EMPTY_ANNOUNCEMENTS,
  cuttingFeePerSheetInCents = 0,
}: LayoutClientProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems, clearCartForSignOut } = useCart();
  const closeSidebar = useSidebarStore((state) => state.setOpen);
  const { setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.match(/^\/products\/.+/)) {
      setTheme("light");
    }
  }, [pathname, setTheme]);

  const isDashboard = pathname?.startsWith("/dashboard");

  return (
    <div className='flex flex-col h-dvh max-h-dvh overflow-hidden'>
      {/* Navbar - fixed overlay so content scrolls behind transparent bg */}
      <div className='fixed top-0 left-0 right-0 z-50' role="button" tabIndex={0} onClick={() => closeSidebar(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeSidebar(false); } }}>
        <Navbar
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          cartCount={totalItems}
          onCartClick={() => setCartOpen(true)}
          onSignOut={clearCartForSignOut}
        />
      </div>

      {/* Main content area with sidebar */}
      <div className='flex-1 overflow-hidden'>
        <AdminSidebar isAdmin={user?.isAdmin}>
          <div className='pt-16'>
            {!isDashboard && announcements.length > 0 && (
              <AnnouncementBanner announcements={announcements} />
            )}
            <main>{children}</main>
            {!isDashboard && (
              <>
                <PromoFooterBanner />
                <Footer />
              </>
            )}
          </div>
        </AdminSidebar>
      </div>

      {/* Mobile bottom nav */}
      <div className='lg:hidden flex-none z-50' role="button" tabIndex={0} onClick={() => closeSidebar(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeSidebar(false); } }}>
        <MobileBottomNav
          cartCount={totalItems}
          onCartClick={() => setCartOpen(true)}
        />
      </div>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} cuttingFeePerSheetInCents={cuttingFeePerSheetInCents} />

      {/* Promo dialog - only show on non-dashboard pages */}
      {!isDashboard && <PromoDialog />}
    </div>
  );
}
