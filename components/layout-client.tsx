"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { CartSheet } from "@/components/cart-sheet";
import { useCart } from "@/hooks/use-cart";

interface LayoutClientProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    image?: string;
    isAdmin?: boolean;
  } | null;
  notificationCount?: number;
}

export function LayoutClient({ children, user, notificationCount = 0 }: LayoutClientProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <>
      <Navbar
        user={user}
        notificationCount={notificationCount}
        cartCount={totalItems}
        onCartClick={() => setCartOpen(true)}
      />
      
      <main className="min-h-screen">{children}</main>
      
      <MobileBottomNav
        cartCount={totalItems}
        onCartClick={() => setCartOpen(true)}
      />
      
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
      />
    </>
  );
}
