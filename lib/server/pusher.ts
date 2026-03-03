import Pusher from "pusher";

// Server-side Pusher instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Channel names
export const INVENTORY_CHANNEL_PREFIX = "inventory-";
export const PURCHASES_CHANNEL = "purchases";

// Event types
export const PUSHER_EVENTS = {
  STOCK_RESERVED: "stock-reserved",
  STOCK_RELEASED: "stock-released",
  STOCK_UPDATED: "stock-updated",
  PRODUCT_PURCHASED: "product-purchased",
} as const;

// Helper to get inventory channel name for a product
export function getInventoryChannel(productId: string) {
  return `${INVENTORY_CHANNEL_PREFIX}${productId}`;
}

// Types for Pusher events
export interface StockReservedEvent {
  productId: string;
  productName: string;
  reservedQuantity: number;
  availableStock: number;
  reservedByUserId?: string; // Exclude from broadcast to reserving user
  reservedBySessionId?: string;
}

export interface StockReleasedEvent {
  productId: string;
  productName: string;
  releasedQuantity: number;
  availableStock: number;
}

export interface StockUpdatedEvent {
  productId: string;
  productName: string;
  availableStock: number;
}

export interface ProductPurchasedEvent {
  buyerName: string; // e.g. "Brandon D."
  productName: string;
  productImage?: string;
}
