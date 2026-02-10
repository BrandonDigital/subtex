"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "pusher-js";
import {
  getPusherClient,
  getInventoryChannel,
  PURCHASES_CHANNEL,
  PUSHER_EVENTS,
} from "@/lib/pusher-client";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/components/ui/toast";

// Event types (matching server-side)
interface StockReservedEvent {
  productId: string;
  productName: string;
  reservedQuantity: number;
  availableStock: number;
  reservedByUserId?: string;
  reservedBySessionId?: string;
}

interface StockReleasedEvent {
  productId: string;
  productName: string;
  releasedQuantity: number;
  availableStock: number;
}

interface ProductPurchasedEvent {
  buyerName: string;
  productName: string;
  productImage?: string;
}

interface PusherContextType {
  isConnected: boolean;
}

const PusherContext = createContext<PusherContextType | undefined>(undefined);

// Get the guest session ID from localStorage
function getGuestSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("subtex-guest-session-id");
}

// Get the user ID from the session cookie (if available)
// This is a simple check - in production you might want to use the auth client
function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  // We can't easily get the user ID on the client, so we rely on sessionId comparison
  return null;
}

export function PusherProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { items } = useCart();
  const subscribedChannels = useRef<Map<string, Channel>>(new Map());
  const isConnected = useRef(false);

  // Get product IDs in cart for checking if events are relevant
  const cartProductIds = useRef<Set<string>>(new Set());

  // Update cart product IDs when cart changes
  useEffect(() => {
    cartProductIds.current = new Set(items.map((item) => item.productId));
  }, [items]);

  // Check if the current user/session initiated the reservation
  const isOwnReservation = useCallback((event: StockReservedEvent): boolean => {
    const guestSessionId = getGuestSessionId();
    const userId = getCurrentUserId();

    // If the event was triggered by the same session, don't show notification
    if (guestSessionId && event.reservedBySessionId === guestSessionId) {
      return true;
    }
    if (userId && event.reservedByUserId === userId) {
      return true;
    }
    return false;
  }, []);

  // Look up product image from cart items
  const getProductImage = useCallback(
    (productId: string): string | undefined => {
      const cartItem = items.find((item) => item.productId === productId);
      return cartItem?.imageUrl;
    },
    [items]
  );

  // Handle stock reserved event
  const handleStockReserved = useCallback(
    (event: StockReservedEvent) => {
      // Don't show notification if this user made the reservation
      if (isOwnReservation(event)) {
        return;
      }

      // Only show notification if user has this product in their cart
      if (!cartProductIds.current.has(event.productId)) {
        return;
      }

      const image = getProductImage(event.productId);

      // Show appropriate toast based on remaining stock
      if (event.availableStock === 0) {
        toast.error(
          `"${event.productName}" in your cart has been reserved by another customer!`,
          {
            description:
              "Complete your checkout soon or the item may become unavailable.",
            image,
          }
        );
      } else if (event.availableStock <= 3) {
        toast.warning(
          `Hurry! Only ${event.availableStock} "${event.productName}" left in stock!`,
          {
            description:
              "Someone just reserved some. Complete your checkout soon.",
            image,
          }
        );
      } else {
        toast.info(`"${event.productName}" is in demand!`, {
          description: `Someone just reserved ${event.reservedQuantity}. ${event.availableStock} still available.`,
          image,
        });
      }

      // Refresh the page to update stock displays
      router.refresh();
    },
    [isOwnReservation, router, getProductImage]
  );

  // Handle stock released event
  const handleStockReleased = useCallback(
    (event: StockReleasedEvent) => {
      // Only show notification if user has this product in their cart
      if (!cartProductIds.current.has(event.productId)) {
        return;
      }

      const image = getProductImage(event.productId);

      // Show a positive notification that stock is available
      toast.success(`Good news! "${event.productName}" is back in stock!`, {
        description: `${event.availableStock} now available.`,
        image,
      });

      // Refresh to update stock displays
      router.refresh();
    },
    [router, getProductImage]
  );

  // Handle product purchased event (social proof)
  const handleProductPurchased = useCallback(
    (event: ProductPurchasedEvent) => {
      toast(`${event.buyerName} just bought ${event.productName}`, {
        image: event.productImage,
      });
    },
    []
  );

  // Subscribe to global purchases channel for social proof notifications
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(PURCHASES_CHANNEL);

    channel.bind(PUSHER_EVENTS.PRODUCT_PURCHASED, handleProductPurchased);

    return () => {
      channel.unbind(PUSHER_EVENTS.PRODUCT_PURCHASED, handleProductPurchased);
      pusher.unsubscribe(PURCHASES_CHANNEL);
    };
  }, [handleProductPurchased]);

  // Subscribe to inventory channels for products in cart
  useEffect(() => {
    if (items.length === 0) {
      // Unsubscribe from all channels if cart is empty
      subscribedChannels.current.forEach((channel, channelName) => {
        getPusherClient().unsubscribe(channelName);
      });
      subscribedChannels.current.clear();
      return;
    }

    const pusher = getPusherClient();
    const currentProductIds = new Set(items.map((item) => item.productId));

    // Unsubscribe from channels for products no longer in cart
    subscribedChannels.current.forEach((channel, channelName) => {
      const productId = channelName.replace("inventory-", "");
      if (!currentProductIds.has(productId)) {
        pusher.unsubscribe(channelName);
        subscribedChannels.current.delete(channelName);
      }
    });

    // Subscribe to channels for products in cart
    currentProductIds.forEach((productId) => {
      const channelName = getInventoryChannel(productId);

      if (!subscribedChannels.current.has(channelName)) {
        const channel = pusher.subscribe(channelName);

        channel.bind(PUSHER_EVENTS.STOCK_RESERVED, handleStockReserved);
        channel.bind(PUSHER_EVENTS.STOCK_RELEASED, handleStockReleased);

        subscribedChannels.current.set(channelName, channel);
      }
    });

    isConnected.current = true;

    return () => {
      // Cleanup on unmount
      subscribedChannels.current.forEach((channel, channelName) => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      });
      subscribedChannels.current.clear();
      isConnected.current = false;
    };
  }, [items, handleStockReserved, handleStockReleased]);

  return (
    <PusherContext.Provider value={{ isConnected: isConnected.current }}>
      {children}
    </PusherContext.Provider>
  );
}

export function usePusher() {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
}
