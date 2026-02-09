"use client";

import { useEffect, useState } from "react";
import { X, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getUserCartDetails,
  type UserCartDetail,
} from "@/server/actions/cart";

interface CartDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

export function CartDetailPanel({
  isOpen,
  onClose,
  userId,
}: CartDetailPanelProps) {
  const [cartDetail, setCartDetail] = useState<UserCartDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      getUserCartDetails(userId)
        .then((data) => {
          setCartDetail(data);
        })
        .catch((error) => {
          console.error("Failed to load cart details:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setCartDetail(null);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-background shadow-lg z-50 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cart Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !cartDetail ? (
            <div className="text-center py-12 text-muted-foreground">
              Cart not found or has been cleared
            </div>
          ) : (
            <>
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={cartDetail.user.image || ""} />
                      <AvatarFallback>
                        {getInitials(cartDetail.user.name, cartDetail.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {cartDetail.user.name || "No name"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cartDetail.user.email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cart Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {cartDetail.totals.itemCount}
                      </p>
                      <p className="text-sm text-muted-foreground">Products</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {cartDetail.totals.totalQuantity}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Qty</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {formatPrice(cartDetail.totals.subtotal)}
                      </p>
                      <p className="text-sm text-muted-foreground">Subtotal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cart Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cart Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartDetail.items.map((item, index) => (
                    <div key={item.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.productName}
                          </p>
                          {item.partNumber && (
                            <p className="text-xs text-muted-foreground">
                              {item.partNumber}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.color && (
                              <Badge variant="outline" className="text-xs">
                                {item.color}
                              </Badge>
                            )}
                            {item.material && (
                              <Badge variant="outline" className="text-xs">
                                {item.material}
                              </Badge>
                            )}
                            {item.size && (
                              <Badge variant="outline" className="text-xs">
                                {item.size}
                              </Badge>
                            )}
                          </div>

                          {/* Stock Warning */}
                          {item.product && item.product.stock < item.quantity && (
                            <p className="text-xs text-destructive mt-1">
                              Only {item.product.stock} in stock
                            </p>
                          )}
                        </div>

                        {/* Price & Quantity */}
                        <div className="text-right shrink-0">
                          <p className="font-medium">
                            {formatPrice(item.priceInCents * item.quantity)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {formatPrice(item.priceInCents)}
                          </p>
                          {item.appliedDiscountPercent &&
                            item.appliedDiscountPercent > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-xs mt-1"
                              >
                                {item.appliedDiscountPercent}% off
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
