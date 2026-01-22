"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { toast } from "sonner";

export interface CartItem {
  variantId: string;
  sku: string;
  color: string;
  material: string;
  size: string;
  priceInCents: number;
  quantity: number;
  holdingFeeInCents?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotalInCents: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "subtex-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isHydrated]);

  const addItem = useCallback(
    (newItem: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const quantity = newItem.quantity || 1;

      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.variantId === newItem.variantId
        );

        if (existingIndex >= 0) {
          // Update existing item
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          toast.success(`Updated quantity in cart`);
          return updated;
        }

        // Add new item
        toast.success(`Added to cart`);
        return [...prev, { ...newItem, quantity }];
      });
    },
    []
  );

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((item) => item.variantId !== variantId));
    toast.success("Removed from cart");
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.variantId !== variantId));
      toast.success("Removed from cart");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    toast.success("Cart cleared");
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotalInCents,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
