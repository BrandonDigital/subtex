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
import { authClient } from "@/lib/clients/auth-client";
import { toast } from "@/components/ui/toast";
import { syncCart, getUserCart } from "@/server/actions/cart";

export interface BulkDiscount {
  minQuantity: number;
  discountPercent: number;
}

export interface CuttingSpec {
  cutType: "horizontal" | "vertical" | "both";
  xCutMm: number; // Horizontal cut position (mm from top edge)
  yCutMm: number; // Vertical cut position (mm from left edge)
}

export interface CartItem {
  cartItemId: string; // Unique identifier for this cart entry
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
  cuttingSpec?: CuttingSpec; // Optional CNC cutting specification
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "cartItemId"> & { quantity?: number; cartItemId?: string }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
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

// Recalculate bulk discounts for ALL items based on total quantity per product.
// This ensures items with cutting specs share the same discount tier as uncut
// entries of the same product.
function recalculateAllDiscounts(items: CartItem[]): CartItem[] {
  // Sum quantities by productId
  const productTotals = new Map<string, number>();
  for (const item of items) {
    productTotals.set(
      item.productId,
      (productTotals.get(item.productId) || 0) + item.quantity
    );
  }

  return items.map((item) => {
    const totalQty = productTotals.get(item.productId) || item.quantity;
    const { discountPercent } = getApplicableDiscount(
      totalQty,
      item.bulkDiscounts
    );
    const basePrice = item.basePriceInCents || item.priceInCents;
    return {
      ...item,
      basePriceInCents: basePrice,
      priceInCents: calculateDiscountedPrice(basePrice, discountPercent),
      appliedDiscountPercent: discountPercent,
    };
  });
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
            // Ensure cartItemId exists (fallback to productId for old items)
            cartItemId: item.cartItemId || item.productId || item.variantId,
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
              cartItemId: item.cartItemId || item.productId,
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
              cuttingSpec: item.cuttingSpec || undefined,
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
        "quantity" | "basePriceInCents" | "appliedDiscountPercent" | "cartItemId"
      > & { quantity?: number; basePriceInCents?: number; cartItemId?: string }
    ) => {
      const quantity = newItem.quantity || 1;
      // Use basePriceInCents if provided, otherwise use priceInCents as the base
      const basePriceInCents = newItem.basePriceInCents || newItem.priceInCents;

      // Match existing items by productId AND cuttingSpec
      const existingItem = items.find((item) => {
        if (item.productId !== newItem.productId) return false;
        // Both have no cutting — merge
        if (!item.cuttingSpec && !newItem.cuttingSpec) return true;
        // One has cutting, the other doesn't — don't merge
        if (!item.cuttingSpec || !newItem.cuttingSpec) return false;
        // Both have cutting — compare specs
        return (
          item.cuttingSpec.cutType === newItem.cuttingSpec.cutType &&
          item.cuttingSpec.xCutMm === newItem.cuttingSpec.xCutMm &&
          item.cuttingSpec.yCutMm === newItem.cuttingSpec.yCutMm
        );
      });

      if (existingItem) {
        // Update existing item quantity, then recalculate discounts for all items
        // of this product (cut + uncut share the same discount tier)
        const newQuantity = existingItem.quantity + quantity;

        setItems((prev) =>
          recalculateAllDiscounts(
            prev.map((item) =>
              item.cartItemId === existingItem.cartItemId
                ? { ...item, quantity: newQuantity }
                : item
            )
          )
        );
        toast.success(`Updated quantity in cart`);
      } else {
        // Generate cartItemId: use productId for non-cut items, unique ID for cut items
        const cartItemId = newItem.cuttingSpec
          ? `${newItem.productId}__cut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
          : newItem.cartItemId || newItem.productId;

        // Add new item, then recalculate discounts for all items of this product
        setItems((prev) =>
          recalculateAllDiscounts([
            ...prev,
            {
              ...newItem,
              cartItemId,
              quantity,
              basePriceInCents,
              priceInCents: basePriceInCents, // Will be recalculated
              appliedDiscountPercent: 0,
            },
          ])
        );
        toast.success(`Added to cart`);
      }
    },
    [items]
  );

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) =>
      recalculateAllDiscounts(
        prev.filter(
          (item) => (item.cartItemId || item.productId) !== cartItemId
        )
      )
    );
    toast.success("Removed from cart");
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) =>
        recalculateAllDiscounts(
          prev.filter(
            (item) => (item.cartItemId || item.productId) !== cartItemId
          )
        )
      );
      toast.success("Removed from cart");
      return;
    }

    setItems((prev) =>
      recalculateAllDiscounts(
        prev.map((item) => {
          if ((item.cartItemId || item.productId) !== cartItemId) return item;
          return { ...item, quantity };
        })
      )
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
