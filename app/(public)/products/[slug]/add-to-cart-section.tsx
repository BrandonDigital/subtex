"use client";

import { useState, useMemo } from "react";
import { Minus, Plus, ShoppingCart, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { StockNotifyButton } from "./stock-notify-button";
import { BackorderNotice } from "@/components/backorder-notice";

interface BulkDiscount {
  id: string;
  minQuantity: number;
  discountPercent: number;
}

interface AddToCartSectionProps {
  productId: string;
  productName: string;
  partNumber: string | null;
  priceInCents: number;
  imageUrl: string | null;
  bulkDiscounts: BulkDiscount[];
  stock?: number;
  color?: string | null;
  material?: string | null;
  size?: string | null;
  isSubscribedToStock?: boolean;
  userEmail?: string | null;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function AddToCartSection({
  productId,
  productName,
  partNumber,
  priceInCents,
  imageUrl,
  bulkDiscounts,
  stock = 999,
  color,
  material,
  size,
  isSubscribedToStock = false,
  userEmail,
}: AddToCartSectionProps) {
  const { addItem, items } = useCart();
  const [quantity, setQuantity] = useState(1);

  // Get quantity already in cart for this product
  const cartQuantity = useMemo(() => {
    const cartItem = items.find((item) => item.productId === productId);
    return cartItem?.quantity || 0;
  }, [items, productId]);

  // Total quantity includes what's in cart + what user is about to add
  const totalQuantity = quantity + cartQuantity;

  // Calculate pricing with discounts based on total quantity
  const sortedDiscounts = useMemo(
    () => [...bulkDiscounts].sort((a, b) => a.minQuantity - b.minQuantity),
    [bulkDiscounts]
  );

  const currentDiscount = useMemo(() => {
    return sortedDiscounts
      .filter((d) => totalQuantity >= d.minQuantity)
      .sort((a, b) => b.discountPercent - a.discountPercent)[0];
  }, [sortedDiscounts, totalQuantity]);

  const nextDiscount = useMemo(() => {
    return sortedDiscounts.find((d) => totalQuantity < d.minQuantity);
  }, [sortedDiscounts, totalQuantity]);

  const discountPercent = currentDiscount?.discountPercent || 0;
  const discountedUnitPrice = Math.round(
    priceInCents * (1 - discountPercent / 100)
  );
  const subtotal = discountedUnitPrice * quantity;
  const savings = (priceInCents - discountedUnitPrice) * quantity;

  // Calculate units until next discount (based on total including cart)
  const unitsUntilNextDiscount = nextDiscount
    ? nextDiscount.minQuantity - totalQuantity
    : 0;

  const handleAddToCart = () => {
    addItem({
      productId,
      partNumber: partNumber || productId,
      productName,
      color: color || undefined,
      material: material || undefined,
      size: size || undefined,
      priceInCents: priceInCents,
      basePriceInCents: priceInCents,
      imageUrl: imageUrl || undefined,
      quantity,
      bulkDiscounts: bulkDiscounts.map((d) => ({
        minQuantity: d.minQuantity,
        discountPercent: d.discountPercent,
      })),
      stock,
    });
  };

  const isOutOfStock = stock === 0;
  const availableStock = stock;

  return (
    <div className='space-y-6'>
      {/* Quantity Selector */}
      <div className='space-y-3'>
        <label className='text-sm font-medium'>Quantity</label>
        <div className='flex items-center gap-4'>
          <div className='flex items-center border rounded-lg'>
            <Button
              variant='ghost'
              size='icon'
              className='h-11 w-11 rounded-none rounded-l-lg'
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className='h-4 w-4' />
            </Button>
            <input
              type='number'
              min={1}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setQuantity(Math.max(1, val));
              }}
              className='h-11 w-16 text-center border-x bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            />
            <Button
              variant='ghost'
              size='icon'
              className='h-11 w-11 rounded-none rounded-r-lg'
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className='h-4 w-4' />
            </Button>
          </div>

          {stock > 0 && (
            <span className='text-sm text-muted-foreground'>
              {stock} in stock
            </span>
          )}
        </div>

        {/* Backorder Notice */}
        <BackorderNotice
          availableStock={availableStock}
          requestedQuantity={quantity + cartQuantity}
        />

        {/* Cart quantity indicator */}
        {cartQuantity > 0 && (
          <p className='text-sm text-muted-foreground'>
            You have <span className='font-medium'>{cartQuantity}</span> already
            in your cart
          </p>
        )}

        {/* Bulk Discount Progress */}
        {nextDiscount && unitsUntilNextDiscount <= 10 && (
          <div className='flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200'>
            <Tag className='h-4 w-4 text-green-600 shrink-0' />
            <p className='text-sm text-green-700'>
              Add{" "}
              <span className='font-semibold'>
                {nextDiscount.minQuantity - cartQuantity}{" "}
                {nextDiscount.minQuantity - cartQuantity === 1
                  ? "unit"
                  : "units"}
              </span>{" "}
              to get a{" "}
              <span className='font-semibold'>
                {nextDiscount.discountPercent}% discount!
              </span>
            </p>
          </div>
        )}

        {/* Current discount applied */}
        {discountPercent > 0 && (
          <p className='text-sm text-green-600 font-medium flex items-center gap-1'>
            <Tag className='h-3.5 w-3.5' />
            {discountPercent}% bulk discount applied
          </p>
        )}

        {/* Bulk Discount Tiers */}
        {sortedDiscounts.length > 0 && (
          <div className='text-sm text-muted-foreground'>
            <span className='font-medium'>Bulk pricing: </span>
            {sortedDiscounts.map((d, i) => (
              <span key={d.id}>
                {d.minQuantity}+ = {d.discountPercent}% off
                {i < sortedDiscounts.length - 1 && " • "}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subtotal and Add to Cart */}
      <div className='space-y-4 p-6 rounded-lg bg-muted/50 border'>
        {/* Subtotal */}
        <div className='flex items-center justify-between'>
          <span className='font-medium'>Subtotal</span>
          <div className='text-right'>
            <p className='text-2xl font-bold'>{formatPrice(subtotal)}</p>
            {savings > 0 && (
              <p className='text-sm text-green-600'>
                You save {formatPrice(savings)}
              </p>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        {isOutOfStock ? (
          <StockNotifyButton
            productId={productId}
            isSubscribed={isSubscribedToStock}
            userEmail={userEmail}
          />
        ) : (
          <Button
            size='lg'
            className='w-full h-14 text-lg font-semibold'
            onClick={handleAddToCart}
          >
            <ShoppingCart className='mr-2 h-5 w-5' />
            Add to Cart
          </Button>
        )}
      </div>
    </div>
  );
}
