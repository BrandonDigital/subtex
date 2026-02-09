"use client";

import { useState, useEffect } from "react";
import { Check, Minus, Plus, Bell, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BackorderNotice } from "@/components/backorder-notice";

// Types
type Color = "white" | "black";
type Size = "standard" | "xl";

interface BulkDiscount {
  minQuantity: number;
  discountPercent: number;
}

interface AcmProduct {
  id: string;
  acmColor: Color | null;
  acmSize: Size | null;
  name: string;
  basePriceInCents: number;
  imageUrl: string | null;
  partNumber: string | null;
  stock: number;
  lowStockThreshold: number;
  bulkDiscounts?: BulkDiscount[];
}

interface ProductConfiguratorProps {
  acmProducts: AcmProduct[];
  onAddToCart?: (productId: string, quantity: number) => void;
  onNotifyMe?: (productId: string, email: string) => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

function getStockStatus(
  stock: number,
  lowStockThreshold: number = 10
): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  if (stock === 0) return { label: "Out of stock", variant: "destructive" };
  if (stock <= lowStockThreshold)
    return { label: `Low stock - ${stock} left`, variant: "secondary" };
  return { label: `${stock} in stock`, variant: "default" };
}

const sizeLabels: Record<Size, { name: string; dimensions: string }> = {
  standard: { name: "Standard", dimensions: "2440 × 1220mm" },
  xl: { name: "XL", dimensions: "3050 × 1500mm" },
};

export function ProductConfigurator({
  acmProducts,
  onAddToCart,
  onNotifyMe,
}: ProductConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notifyEmail, setNotifyEmail] = useState("");

  // Get available colors from ACM products
  const availableColors = [
    ...new Set(
      acmProducts.filter((p) => p.acmColor).map((p) => p.acmColor as Color)
    ),
  ];

  // Get available sizes for selected color
  const availableSizes = selectedColor
    ? [
        ...new Set(
          acmProducts
            .filter((p) => p.acmColor === selectedColor && p.acmSize)
            .map((p) => p.acmSize as Size)
        ),
      ]
    : [];

  // Get selected product
  const selectedProduct =
    selectedColor && selectedSize
      ? acmProducts.find(
          (p) => p.acmColor === selectedColor && p.acmSize === selectedSize
        )
      : null;

  // Helper to check if a color option is available
  const isColorAvailable = (color: Color): boolean => {
    return acmProducts.some((p) => p.acmColor === color);
  };

  // Helper to check if a color option has stock
  const isColorInStock = (color: Color): boolean => {
    const colorProducts = acmProducts.filter((p) => p.acmColor === color);
    if (colorProducts.length === 0) return false;
    return colorProducts.some((p) => p.stock > 0);
  };

  // Helper to check if a size option is available for selected color
  const isSizeAvailable = (size: Size): boolean => {
    if (!selectedColor) return false;
    return acmProducts.some(
      (p) => p.acmColor === selectedColor && p.acmSize === size
    );
  };

  // Helper to check if a size option has stock
  const isSizeInStock = (size: Size): boolean => {
    if (!selectedColor) return false;
    const product = acmProducts.find(
      (p) => p.acmColor === selectedColor && p.acmSize === size
    );
    return product ? product.stock > 0 : false;
  };

  // Get bulk discounts from selected product
  const bulkDiscounts = selectedProduct?.bulkDiscounts || [];

  // Calculate discount
  const applicableDiscount = bulkDiscounts
    .filter((d) => quantity >= d.minQuantity)
    .sort((a, b) => b.discountPercent - a.discountPercent)[0];

  const discountPercent = applicableDiscount?.discountPercent || 0;
  const unitPrice = selectedProduct?.basePriceInCents || 0;
  const discountedPrice = unitPrice * (1 - discountPercent / 100);
  const subtotal = discountedPrice * quantity;

  const currentStock = selectedProduct?.stock ?? 0;
  const isInStock = currentStock > 0;

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSelectedSize(null);
  }, [selectedColor]);

  // Reset quantity when product changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedProduct?.id]);

  const handleAddToCart = () => {
    if (onAddToCart && selectedProduct) {
      onAddToCart(selectedProduct.id, quantity);
    }
  };

  const handleNotifyMe = () => {
    if (selectedProduct && notifyEmail && onNotifyMe) {
      onNotifyMe(selectedProduct.id, notifyEmail);
      setNotifyEmail("");
    }
  };

  return (
    <section className='py-12 bg-background'>
      <div className='container mx-auto px-4'>
        <div className='max-w-2xl mx-auto space-y-8'>
          {/* Step 1: Select Colour */}
          <div className='space-y-4'>
            <h2 className='text-lg font-semibold'>1. Select Colour</h2>
            <div className='flex gap-4'>
              {(["white", "black"] as Color[]).map((color) => {
                const available = isColorAvailable(color);
                const inStock = isColorInStock(color);
                const isDisabled = !available || !inStock;
                return (
                  <button
                    key={color}
                    onClick={() => !isDisabled && setSelectedColor(color)}
                    disabled={isDisabled}
                    className={cn(
                      "flex-1 relative rounded-lg border-2 p-6 transition-all",
                      !isDisabled && "hover:border-primary/50 cursor-pointer",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      selectedColor === color
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <div className='flex flex-col items-center gap-3'>
                      <div
                        className={cn(
                          "h-12 w-12 rounded-full border-2",
                          color === "white"
                            ? "bg-white border-gray-300"
                            : "bg-gray-900 border-gray-700"
                        )}
                      />
                      <span className='font-medium capitalize'>{color}</span>
                      {!available && (
                        <span className='text-xs text-muted-foreground'>
                          Not available
                        </span>
                      )}
                      {available && !inStock && (
                        <Badge variant='destructive' className='text-xs'>
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    {selectedColor === color && (
                      <div className='absolute top-2 right-2'>
                        <Check className='h-5 w-5 text-primary' />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Size */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              selectedColor ? "opacity-100" : "opacity-40 pointer-events-none"
            )}
          >
            <h2 className='text-lg font-semibold'>2. Select Size</h2>
            <div className='flex gap-4'>
              {(["standard", "xl"] as Size[]).map((size) => {
                const available = isSizeAvailable(size);
                const inStock = isSizeInStock(size);
                const isDisabled = !selectedColor || !available || !inStock;
                return (
                  <button
                    key={size}
                    onClick={() => !isDisabled && setSelectedSize(size)}
                    disabled={isDisabled}
                    className={cn(
                      "flex-1 relative rounded-lg border-2 p-6 transition-all",
                      selectedColor &&
                        !isDisabled &&
                        "hover:border-primary/50 cursor-pointer",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      selectedSize === size
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <div className='flex flex-col items-center gap-2'>
                      <span className='font-medium'>
                        {sizeLabels[size].name}
                      </span>
                      <span className='text-sm text-muted-foreground'>
                        {sizeLabels[size].dimensions}
                      </span>
                      {selectedColor && !available && (
                        <span className='text-xs text-muted-foreground'>
                          Not available
                        </span>
                      )}
                      {selectedColor && available && !inStock && (
                        <Badge variant='destructive' className='text-xs'>
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    {selectedSize === size && (
                      <div className='absolute top-2 right-2'>
                        <Check className='h-5 w-5 text-primary' />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Image Display */}
          {selectedProduct?.imageUrl && (
            <div className='space-y-4'>
              <div className='rounded-lg border bg-muted/30 overflow-hidden'>
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className='w-full h-64 object-contain bg-white'
                />
              </div>
            </div>
          )}

          {/* Step 4: Quantity and Add to Cart */}
          <div
            className={cn(
              "space-y-6 transition-all duration-300",
              selectedProduct ? "opacity-100" : "opacity-40 pointer-events-none"
            )}
          >
            {selectedProduct && (
              <>
                {/* Selection Summary */}
                <div className='rounded-lg border bg-muted/30 p-6 space-y-4'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <h3 className='font-semibold'>Your Selection</h3>
                      <p className='text-muted-foreground capitalize'>
                        {selectedProduct.name}
                      </p>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Part Number:{" "}
                        {selectedProduct.partNumber || selectedProduct.id}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-xl font-bold'>
                        {formatPrice(selectedProduct.basePriceInCents)}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        inc. GST each
                      </p>
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div>
                    <Badge
                      variant={
                        getStockStatus(
                          selectedProduct.stock,
                          selectedProduct.lowStockThreshold
                        ).variant
                      }
                    >
                      {
                        getStockStatus(
                          selectedProduct.stock,
                          selectedProduct.lowStockThreshold
                        ).label
                      }
                    </Badge>
                  </div>
                </div>

                {isInStock ? (
                  <>
                    {/* Quantity Selector */}
                    <div className='space-y-4'>
                      <h2 className='text-lg font-semibold'>
                        3. Select Quantity
                      </h2>
                      <div className='flex items-center gap-4'>
                        <div className='flex items-center border rounded-lg'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-12 w-12 rounded-none rounded-l-lg'
                            onClick={() =>
                              setQuantity(Math.max(1, quantity - 1))
                            }
                            disabled={quantity <= 1}
                          >
                            <Minus className='h-4 w-4' />
                          </Button>
                          <Input
                            type='number'
                            min={1}
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className='h-12 w-20 text-center border-0 rounded-none focus-visible:ring-0'
                          />
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-12 w-12 rounded-none rounded-r-lg'
                            onClick={() => setQuantity(quantity + 1)}
                          >
                            <Plus className='h-4 w-4' />
                          </Button>
                        </div>
                        <span className='text-sm text-muted-foreground'>
                          {currentStock} in stock
                        </span>
                      </div>

                      {/* Backorder Notice */}
                      <BackorderNotice
                        availableStock={currentStock}
                        requestedQuantity={quantity}
                      />

                      {/* Bulk Discount Info */}
                      {discountPercent > 0 && (
                        <div className='flex items-center gap-2 text-green-600'>
                          <Badge
                            variant='secondary'
                            className='bg-green-100 text-green-700'
                          >
                            {discountPercent}% bulk discount applied
                          </Badge>
                        </div>
                      )}

                      {/* Next discount tier hint */}
                      {bulkDiscounts.some((d) => d.minQuantity > quantity) && (
                        <p className='text-sm text-muted-foreground'>
                          Order{" "}
                          {
                            bulkDiscounts.find((d) => d.minQuantity > quantity)
                              ?.minQuantity
                          }
                          + sheets for{" "}
                          {
                            bulkDiscounts.find((d) => d.minQuantity > quantity)
                              ?.discountPercent
                          }
                          % off
                        </p>
                      )}
                    </div>

                    {/* Subtotal and Add to Cart */}
                    <div className='rounded-lg border bg-primary/5 p-6 space-y-4'>
                      <div className='flex items-center justify-between text-lg'>
                        <span className='font-medium'>Subtotal</span>
                        <div className='text-right'>
                          {discountPercent > 0 && (
                            <p className='text-sm text-muted-foreground line-through'>
                              {formatPrice(unitPrice * quantity)}
                            </p>
                          )}
                          <p className='text-xl font-bold'>
                            {formatPrice(subtotal)}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            inc. GST
                          </p>
                        </div>
                      </div>

                      <Button
                        size='lg'
                        className='w-full h-14 text-lg'
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className='mr-2 h-5 w-5' />
                        Add to Cart
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Out of Stock - Notify Me */
                  <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-4'>
                    <div className='flex items-center gap-2'>
                      <Bell className='h-5 w-5' />
                      <h3 className='font-semibold'>
                        Get notified when back in stock
                      </h3>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Enter your email and we&apos;ll let you know when this
                      product is available again.
                    </p>
                    <div className='flex gap-2'>
                      <Input
                        type='email'
                        placeholder='your@email.com'
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className='flex-1'
                      />
                      <Button onClick={handleNotifyMe} disabled={!notifyEmail}>
                        Notify Me
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
