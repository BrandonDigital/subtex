"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/hooks/use-cart";

/**
 * Silently clears the cart once on mount. Drop this into any
 * post-checkout success page to ensure the cart is emptied after payment.
 */
export function ClearCartOnSuccess() {
  const { items, clearCartForSignOut } = useCart();
  const hasCleared = useRef(false);

  useEffect(() => {
    if (!hasCleared.current && items.length > 0) {
      hasCleared.current = true;
      clearCartForSignOut();
    }
  }, [items, clearCartForSignOut]);

  return null;
}
