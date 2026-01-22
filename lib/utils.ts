import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price in cents to Australian dollars
 */
export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

/**
 * Format a price in cents to Australian dollars with GST label
 */
export function formatPriceWithGst(priceInCents: number): string {
  return `${formatPrice(priceInCents)} inc. GST`;
}

/**
 * Calculate GST amount from a GST-inclusive price
 * GST in Australia is 10%, so GST = price / 11
 */
export function calculateGst(priceInCentsIncGst: number): number {
  return Math.round(priceInCentsIncGst / 11);
}

/**
 * Calculate the ex-GST price from a GST-inclusive price
 */
export function calculateExGst(priceInCentsIncGst: number): number {
  return priceInCentsIncGst - calculateGst(priceInCentsIncGst);
}

/**
 * Generate a unique order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SUB-${timestamp}-${random}`;
}

/**
 * Calculate bulk discount for a given quantity
 */
export function calculateBulkDiscount(
  quantity: number,
  discounts: { minQuantity: number; discountPercent: number }[]
): number {
  const sortedDiscounts = [...discounts].sort(
    (a, b) => b.minQuantity - a.minQuantity
  );
  
  const applicableDiscount = sortedDiscounts.find(
    (d) => quantity >= d.minQuantity
  );
  
  return applicableDiscount?.discountPercent || 0;
}

/**
 * Calculate discounted price
 */
export function applyDiscount(priceInCents: number, discountPercent: number): number {
  return Math.round(priceInCents * (1 - discountPercent / 100));
}
