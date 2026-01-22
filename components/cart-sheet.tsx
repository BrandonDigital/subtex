"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
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
  const { items, updateQuantity, removeItem, totalItems, subtotalInCents } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
            {totalItems > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add some ACM sheets to get started
              </p>
            </div>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-4">
                    {/* Product Image Placeholder */}
                    <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <div
                          className={`h-10 w-10 rounded-full border-2 ${
                            item.color === "white"
                              ? "bg-white border-gray-300"
                              : "bg-gray-900 border-gray-700"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">ACM Sheet</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {item.color} • {item.material} • {item.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.sku}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {formatPrice(item.priceInCents)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-none"
                            onClick={() =>
                              updateQuantity(item.variantId, Math.max(1, item.quantity - 1))
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-10 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-none"
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Line Total */}
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatPrice(item.priceInCents * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotalInCents)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Delivery calculated at checkout</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between text-base font-medium mb-4">
                <span>Total</span>
                <span>{formatPrice(subtotalInCents)} inc. GST</span>
              </div>

              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button asChild className="w-full" size="lg">
                  <Link href="/checkout" onClick={() => onOpenChange(false)}>
                    Proceed to Checkout
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Continue Shopping
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
