"use client";

import PusherClient from "pusher-js";

// Client-side Pusher instance (lazy initialized)
let pusherInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherInstance) {
    pusherInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherInstance;
}

// Re-export channel prefix and events for client use
export const INVENTORY_CHANNEL_PREFIX = "inventory-";

export const PUSHER_EVENTS = {
  STOCK_RESERVED: "stock-reserved",
  STOCK_RELEASED: "stock-released",
  STOCK_UPDATED: "stock-updated",
} as const;

export function getInventoryChannel(productId: string) {
  return `${INVENTORY_CHANNEL_PREFIX}${productId}`;
}
