"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  ChevronLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useIsMobile } from "@/hooks/use-mobile";
import { BackorderNotice } from "@/components/backorder-notice";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotalInCents,
  } = useCart();
  const isMobile = useIsMobile();

  // Shared cart content component
  const CartContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Mobile header with back button */}
      {isMobile && (
        <div className='flex items-center border-b px-2 py-3 relative'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className='h-5 w-5' />
            <span className='sr-only'>Back</span>
          </Button>
          <h1 className='absolute left-1/2 -translate-x-1/2 font-semibold text-base flex items-center gap-2'>
            Your Cart
            {totalItems > 0 && <Badge variant='secondary'>{totalItems}</Badge>}
          </h1>
        </div>
      )}

      {/* Desktop header */}
      {!isMobile && (
        <SheetHeader className='px-6 pt-6 pb-4 border-b'>
          <SheetTitle className='flex items-center gap-2'>
            <ShoppingCart className='h-5 w-5' />
            Your Cart
            {totalItems > 0 && (
              <Badge variant='secondary' className='ml-2'>
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
      )}

      {items.length === 0 ? (
        <div className='flex-1 flex flex-col items-center justify-center gap-4 py-12 px-6'>
          <div className='h-20 w-20 rounded-full bg-muted flex items-center justify-center'>
            <ShoppingCart className='h-10 w-10 text-muted-foreground' />
          </div>
          <div className='text-center'>
            <p className='text-lg font-medium'>Your cart is empty</p>
            <p className='text-sm text-muted-foreground mt-1'>
              Add some products to get started
            </p>
          </div>
          <Button onClick={() => onOpenChange(false)} variant='outline'>
            Continue Shopping
          </Button>
        </div>
      ) : (
        <>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-4'>
              {items.map((item) => {
                const hasDiscount =
                  item.appliedDiscountPercent &&
                  item.appliedDiscountPercent > 0;
                const basePrice =
                  item.basePriceInCents || item.priceInCents || 0;
                const currentPrice = item.priceInCents || basePrice;
                const originalLineTotal = basePrice * item.quantity;
                const discountedLineTotal = currentPrice * item.quantity;

                // Find next discount tier
                const nextDiscount = item.bulkDiscounts
                  ?.filter((d) => d.minQuantity > item.quantity)
                  .sort((a, b) => a.minQuantity - b.minQuantity)[0];

                return (
                  <div key={item.productId} className='flex gap-4'>
                    {/* Product Image */}
                    <div className='h-20 w-20 shrink-0 rounded-lg bg-muted overflow-hidden relative'>
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName || "Product"}
                          fill
                          className='object-cover'
                          sizes='80px'
                        />
                      ) : (
                        <div className='h-full w-full flex items-center justify-center text-muted-foreground'>
                          <Package className='h-8 w-8' />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className='flex-1 min-w-0'>
                      <h4 className='text-sm font-medium truncate'>
                        {item.productName || "Product"}
                      </h4>
                      {item.color && item.color !== "default" && (
                        <p className='text-xs text-muted-foreground mt-0.5 capitalize'>
                          {item.color} {item.material && `• ${item.material}`}{" "}
                          {item.size && `• ${item.size}`}
                        </p>
                      )}
                      <p className='text-xs text-muted-foreground'>
                        Part Number: {item.partNumber}
                      </p>
                      <div className='flex items-center gap-2 mt-1'>
                        <p className='text-sm font-medium'>
                          {formatPrice(currentPrice)}
                        </p>
                        {hasDiscount && (
                          <p className='text-xs text-muted-foreground line-through'>
                            {formatPrice(basePrice)}
                          </p>
                        )}
                        {hasDiscount && (
                          <Badge
                            variant='secondary'
                            className='text-xs bg-green-100 text-green-700'
                          >
                            {item.appliedDiscountPercent}% off
                          </Badge>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className='flex items-center gap-2 mt-2'>
                        <div className='flex items-center border rounded-md'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 rounded-none'
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                Math.max(1, item.quantity - 1)
                              )
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className='h-3 w-3' />
                          </Button>
                          <span className='w-10 text-center text-sm font-medium'>
                            {item.quantity}
                          </span>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 rounded-none'
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                          >
                            <Plus className='h-3 w-3' />
                          </Button>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 text-destructive hover:text-destructive'
                          onClick={() => removeItem(item.productId)}
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>

                      {/* Backorder Notice */}
                      {item.stock !== undefined &&
                        item.quantity > item.stock &&
                        item.stock > 0 && (
                          <BackorderNotice
                            availableStock={item.stock}
                            requestedQuantity={item.quantity}
                            variant='compact'
                            className='mt-2'
                          />
                        )}

                      {/* Next discount tier hint */}
                      {nextDiscount && (
                        <p className='text-xs text-muted-foreground mt-1'>
                          Add {nextDiscount.minQuantity - item.quantity} more
                          for {nextDiscount.discountPercent}% off
                        </p>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className='text-right'>
                      <p className='text-sm font-medium'>
                        {formatPrice(discountedLineTotal)}
                      </p>
                      {hasDiscount && (
                        <p className='text-xs text-muted-foreground line-through'>
                          {formatPrice(originalLineTotal)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className='border-t px-6 py-4'>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-muted-foreground'>Subtotal</span>
                <span className='font-medium'>
                  {formatPrice(subtotalInCents)}
                </span>
              </div>
              <div className='flex justify-between text-xs text-muted-foreground'>
                <span>Delivery calculated at checkout</span>
              </div>
            </div>

            <Separator className='my-4' />

            <div className='flex justify-between text-base font-medium mb-4'>
              <span>Total</span>
              <span>{formatPrice(subtotalInCents)} inc. GST</span>
            </div>

            <SheetFooter className='flex-col gap-2 sm:flex-col p-0'>
              <Button asChild className='w-full' size='lg'>
                <Link href='/checkout' onClick={() => onOpenChange(false)}>
                  Proceed to Checkout
                </Link>
              </Button>
              <Button
                variant='outline'
                className='w-full'
                onClick={() => onOpenChange(false)}
              >
                Continue Shopping
              </Button>
              <Button
                variant='ghost'
                className='w-full text-destructive hover:text-destructive hover:bg-destructive/10'
                onClick={() => {
                  clearCart();
                  onOpenChange(false);
                }}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Empty Cart
              </Button>
            </SheetFooter>
          </div>
        </>
      )}
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {isMobile ? (
        // Mobile: Sheet with back button (leaves room for mobile nav)
        <SheetContent
          side='right'
          hideOverlay
          className='h-[calc(100dvh-65px)] w-full flex flex-col p-0 [&>button]:hidden top-0 bottom-auto shadow-none'
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>Your Cart</SheetTitle>
          </SheetHeader>
          <CartContent isMobile />
        </SheetContent>
      ) : (
        // Desktop: Regular sheet
        <SheetContent className='flex flex-col w-full sm:max-w-lg p-0'>
          <CartContent />
        </SheetContent>
      )}
    </Sheet>
  );
}
