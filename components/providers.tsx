"use client";

import { ThemeProvider } from "next-themes";
import { CartProvider } from "@/hooks/use-cart";
import { PusherProvider } from "@/components/pusher-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      <CartProvider>
        <PusherProvider>{children}</PusherProvider>
      </CartProvider>
    </ThemeProvider>
  );
}
