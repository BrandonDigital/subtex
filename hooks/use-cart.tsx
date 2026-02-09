"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";
import { syncCart, getUserCart } from "@/server/actions/cart";

export interface BulkDiscount {
  minQuantity: number;
  discountPercent: number;
}

export interface CartItem {
  productId: string;
  partNumber: string;
  productName: string;
  color?: string;
  material?: string;
  size?: string;
  priceInCents: number;
  basePriceInCents: number; // Base price before any bulk discount
  imageUrl?: string;
  quantity: number;
  holdingFeeInCents?: number;
  bulkDiscounts?: BulkDiscount[];
  appliedDiscountPercent?: number; // Currently applied discount percentage
  stock?: number; // Available stock quantity for backorder notifications
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  clearCartForSignOut: () => void;
  totalItems: number;
  subtotalInCents: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "subtex-cart";

// Debounce helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Helper to calculate applicable bulk discount
function getApplicableDiscount(
  quantity: number,
  bulkDiscounts?: BulkDiscount[]
): { discountPercent: number } {
  if (!bulkDiscounts || bulkDiscounts.length === 0) {
    return { discountPercent: 0 };
  }

  const applicable = bulkDiscounts
    .filter((d) => quantity >= d.minQuantity)
    .sort((a, b) => b.discountPercent - a.discountPercent)[0];

  return { discountPercent: applicable?.discountPercent || 0 };
}

// Helper to calculate discounted price
function calculateDiscountedPrice(
  basePriceInCents: number,
  discountPercent: number
): number {
  return Math.round(basePriceInCents * (1 - discountPercent / 100));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);
  const hasLoadedFromServerRef = useRef(false);

  // Sync cart to server (debounced to avoid too many requests)
  const syncToServer = useCallback(
    async (cartItems: CartItem[]) => {
      if (!isPending && session?.user) {
        try {
          await syncCart(cartItems);
        } catch (error) {
          console.error("Failed to sync cart to server:", error);
        }
      }
    },
    [session, isPending]
  );

  const debouncedSync = useDebouncedCallback(syncToServer, 1000);

  // Load cart from localStorage on mount (with migration for old items)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsedItems = JSON.parse(stored);
        // Migrate old items from variantId to productId
        const migratedItems = parsedItems.map(
          (item: Record<string, unknown>) => ({
            ...item,
            // Migrate variantId to productId if needed
            productId: item.productId || item.variantId,
            // Migrate sku to partNumber if needed
            partNumber: item.partNumber || item.sku,
            // If basePriceInCents is missing, use priceInCents as the base
            basePriceInCents: item.basePriceInCents || item.priceInCents,
          })
        );
        setItems(migratedItems);
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
    }
    setIsHydrated(true);
  }, []);

  // Load cart from server when user signs in
  useEffect(() => {
    const currentUserId = session?.user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

    // Detect sign in: previous was null/undefined, now we have a user
    if (
      isHydrated &&
      !isPending &&
      currentUserId &&
      previousUserId === null &&
      !hasLoadedFromServerRef.current
    ) {
      hasLoadedFromServerRef.current = true;
      // Load cart from server
      getUserCart()
        .then((serverCart) => {
          if (serverCart && serverCart.length > 0) {
            // Convert server cart items to client format
            const clientItems: CartItem[] = serverCart.map((item) => ({
              productId: item.productId,
              partNumber: item.partNumber || "",
              productName: item.productName,
              color: item.color || undefined,
              material: item.material || undefined,
              size: item.size || undefined,
              priceInCents: item.priceInCents,
              basePriceInCents: item.basePriceInCents,
              imageUrl: item.imageUrl || undefined,
              quantity: item.quantity,
              holdingFeeInCents: item.holdingFeeInCents || undefined,
              bulkDiscounts: item.bulkDiscounts || undefined,
              appliedDiscountPercent: item.appliedDiscountPercent || undefined,
            }));
            setItems(clientItems);
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(clientItems));
          }
        })
        .catch((error) => {
          console.error("Failed to load cart from server:", error);
        });
    }

    // Reset load flag when user signs out
    if (currentUserId === null && previousUserId) {
      hasLoadedFromServerRef.current = false;
    }

    previousUserIdRef.current = currentUserId;
  }, [session, isPending, isHydrated]);

  // Save cart to localStorage and sync to server whenever it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      // Sync to server if user is logged in
      debouncedSync(items);
    }
  }, [items, isHydrated, debouncedSync]);

  const addItem = useCallback(
    (
      newItem: Omit<
        CartItem,
        "quantity" | "basePriceInCents" | "appliedDiscountPercent"
      > & { quantity?: number; basePriceInCents?: number }
    ) => {
      const quantity = newItem.quantity || 1;
      // Use basePriceInCents if provided, otherwise use priceInCents as the base
      const basePriceInCents = newItem.basePriceInCents || newItem.priceInCents;

      // Check if item exists before updating state
      const existingItem = items.find(
        (item) => item.productId === newItem.productId
      );

      if (existingItem) {
        // Update existing item - recalculate discount for new total quantity
        const newQuantity = existingItem.quantity + quantity;
        const { discountPercent } = getApplicableDiscount(
          newQuantity,
          existingItem.bulkDiscounts
        );
        const discountedPrice = calculateDiscountedPrice(
          existingItem.basePriceInCents,
          discountPercent
        );

        setItems((prev) =>
          prev.map((item) =>
            item.productId === newItem.productId
              ? {
                  ...item,
                  quantity: newQuantity,
                  priceInCents: discountedPrice,
                  appliedDiscountPercent: discountPercent,
                }
              : item
          )
        );
        toast.success(`Updated quantity in cart`);
      } else {
        // Add new item - calculate initial discount
        const { discountPercent } = getApplicableDiscount(
          quantity,
          newItem.bulkDiscounts
        );
        const discountedPrice = calculateDiscountedPrice(
          basePriceInCents,
          discountPercent
        );

        setItems((prev) => [
          ...prev,
          {
            ...newItem,
            quantity,
            basePriceInCents,
            priceInCents: discountedPrice,
            appliedDiscountPercent: discountPercent,
          },
        ]);
        toast.success(`Added to cart`);
      }
    },
    [items]
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
    toast.success("Removed from cart");
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      toast.success("Removed from cart");
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        // Use basePriceInCents, fallback to priceInCents for old items
        const basePrice = item.basePriceInCents || item.priceInCents;

        // Recalculate discount for new quantity
        const { discountPercent } = getApplicableDiscount(
          quantity,
          item.bulkDiscounts
        );
        const discountedPrice = calculateDiscountedPrice(
          basePrice,
          discountPercent
        );

        return {
          ...item,
          quantity,
          basePriceInCents: basePrice,
          priceInCents: discountedPrice,
          appliedDiscountPercent: discountPercent,
        };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    toast.success("Cart cleared");
  }, []);

  // Clear cart for sign out - no toast, just clear the local state
  const clearCartForSignOut = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalInCents = items.reduce((sum, item) => {
    const price = item.priceInCents || item.basePriceInCents || 0;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearCartForSignOut,
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
