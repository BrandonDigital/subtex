"use client";

import { useState, useEffect } from "react";
import { Check, Minus, Plus, Bell, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
type Color = "white" | "black";
type Material = "gloss" | "matte";
type Size = "standard" | "xl";

interface ProductVariant {
  id: string;
  color: Color;
  material: Material;
  size: Size;
  sku: string;
  priceInCents: number;
  stock: number;
}

interface BulkDiscount {
  minQuantity: number;
  discountPercent: number;
}

interface ProductConfiguratorProps {
  variants?: ProductVariant[];
  bulkDiscounts?: BulkDiscount[];
  onAddToCart?: (variantId: string, quantity: number) => void;
  onNotifyMe?: (variantId: string, email: string) => void;
}

// Default mock data - will be replaced with real data from server
const defaultVariants: ProductVariant[] = [
  { id: "1", color: "white", material: "gloss", size: "standard", sku: "WHT-GLS-STD", priceInCents: 8500, stock: 25 },
  { id: "2", color: "white", material: "gloss", size: "xl", sku: "WHT-GLS-XL", priceInCents: 12500, stock: 12 },
  { id: "3", color: "white", material: "matte", size: "standard", sku: "WHT-MAT-STD", priceInCents: 8500, stock: 8 },
  { id: "4", color: "white", material: "matte", size: "xl", sku: "WHT-MAT-XL", priceInCents: 12500, stock: 0 },
  { id: "5", color: "black", material: "gloss", size: "standard", sku: "BLK-GLS-STD", priceInCents: 8500, stock: 18 },
  { id: "6", color: "black", material: "gloss", size: "xl", sku: "BLK-GLS-XL", priceInCents: 12500, stock: 5 },
  { id: "7", color: "black", material: "matte", size: "standard", sku: "BLK-MAT-STD", priceInCents: 8500, stock: 15 },
  { id: "8", color: "black", material: "matte", size: "xl", sku: "BLK-MAT-XL", priceInCents: 12500, stock: 3 },
];

const defaultBulkDiscounts: BulkDiscount[] = [
  { minQuantity: 10, discountPercent: 5 },
  { minQuantity: 25, discountPercent: 10 },
  { minQuantity: 50, discountPercent: 15 },
];

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

function getStockStatus(stock: number): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (stock === 0) return { label: "Out of stock", variant: "destructive" };
  if (stock <= 10) return { label: `Low stock - ${stock} left`, variant: "secondary" };
  return { label: `${stock} in stock`, variant: "default" };
}

const sizeLabels: Record<Size, { name: string; dimensions: string }> = {
  standard: { name: "Standard", dimensions: "2440 × 1220mm" },
  xl: { name: "XL", dimensions: "3050 × 1500mm" },
};

export function ProductConfigurator({
  variants = defaultVariants,
  bulkDiscounts = defaultBulkDiscounts,
  onAddToCart,
  onNotifyMe,
}: ProductConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notifyEmail, setNotifyEmail] = useState("");

  // Get available options based on current selection
  const availableColors = [...new Set(variants.map((v) => v.color))];
  const availableMaterials = selectedColor
    ? [...new Set(variants.filter((v) => v.color === selectedColor).map((v) => v.material))]
    : [];
  const availableSizes =
    selectedColor && selectedMaterial
      ? [...new Set(
          variants
            .filter((v) => v.color === selectedColor && v.material === selectedMaterial)
            .map((v) => v.size)
        )]
      : [];

  // Get selected variant
  const selectedVariant =
    selectedColor && selectedMaterial && selectedSize
      ? variants.find(
          (v) =>
            v.color === selectedColor &&
            v.material === selectedMaterial &&
            v.size === selectedSize
        )
      : null;

  // Calculate discount
  const applicableDiscount = bulkDiscounts
    .filter((d) => quantity >= d.minQuantity)
    .sort((a, b) => b.discountPercent - a.discountPercent)[0];

  const discountPercent = applicableDiscount?.discountPercent || 0;
  const unitPrice = selectedVariant?.priceInCents || 0;
  const discountedPrice = unitPrice * (1 - discountPercent / 100);
  const subtotal = discountedPrice * quantity;

  // Reset downstream selections when upstream changes
  useEffect(() => {
    setSelectedMaterial(null);
    setSelectedSize(null);
  }, [selectedColor]);

  useEffect(() => {
    setSelectedSize(null);
  }, [selectedMaterial]);

  // Reset quantity when variant changes
  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant?.id]);

  const handleAddToCart = () => {
    if (selectedVariant && onAddToCart) {
      onAddToCart(selectedVariant.id, quantity);
    }
  };

  const handleNotifyMe = () => {
    if (selectedVariant && notifyEmail && onNotifyMe) {
      onNotifyMe(selectedVariant.id, notifyEmail);
      setNotifyEmail("");
    }
  };

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Step 1: Select Colour */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">1. Select Colour</h2>
            <div className="flex gap-4">
              {availableColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "flex-1 relative rounded-lg border-2 p-6 transition-all",
                    "hover:border-primary/50",
                    selectedColor === color
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-full border-2",
                        color === "white"
                          ? "bg-white border-gray-300"
                          : "bg-gray-900 border-gray-700"
                      )}
                    />
                    <span className="font-medium capitalize">{color}</span>
                  </div>
                  {selectedColor === color && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Material */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              selectedColor ? "opacity-100" : "opacity-40 pointer-events-none"
            )}
          >
            <h2 className="text-lg font-semibold">2. Select Material</h2>
            <div className="flex gap-4">
              {(selectedColor ? availableMaterials : ["gloss", "matte"] as Material[]).map((material) => (
                <button
                  key={material}
                  onClick={() => selectedColor && setSelectedMaterial(material)}
                  className={cn(
                    "flex-1 relative rounded-lg border-2 p-6 transition-all",
                    "hover:border-primary/50",
                    selectedMaterial === material
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-medium capitalize">{material}</span>
                    <span className="text-sm text-muted-foreground">
                      {material === "gloss" ? "Reflective finish" : "Non-reflective finish"}
                    </span>
                  </div>
                  {selectedMaterial === material && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Select Size */}
          <div
            className={cn(
              "space-y-4 transition-all duration-300",
              selectedMaterial ? "opacity-100" : "opacity-40 pointer-events-none"
            )}
          >
            <h2 className="text-lg font-semibold">3. Select Size</h2>
            <div className="flex gap-4">
              {(selectedMaterial ? availableSizes : ["standard", "xl"] as Size[]).map((size) => (
                <button
                  key={size}
                  onClick={() => selectedMaterial && setSelectedSize(size)}
                  className={cn(
                    "flex-1 relative rounded-lg border-2 p-6 transition-all",
                    "hover:border-primary/50",
                    selectedSize === size
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-medium">{sizeLabels[size].name}</span>
                    <span className="text-sm text-muted-foreground">
                      {sizeLabels[size].dimensions}
                    </span>
                  </div>
                  {selectedSize === size && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Quantity and Add to Cart */}
          <div
            className={cn(
              "space-y-6 transition-all duration-300",
              selectedVariant ? "opacity-100" : "opacity-40 pointer-events-none"
            )}
          >
            {selectedVariant && (
              <>
                {/* Selection Summary */}
                <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">Your Selection</h3>
                      <p className="text-muted-foreground capitalize">
                        {selectedColor} {selectedMaterial} {selectedSize && sizeLabels[selectedSize].name} ACM Sheet
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        SKU: {selectedVariant.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        {formatPrice(selectedVariant.priceInCents)}
                      </p>
                      <p className="text-sm text-muted-foreground">inc. GST each</p>
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div>
                    <Badge variant={getStockStatus(selectedVariant.stock).variant}>
                      {getStockStatus(selectedVariant.stock).label}
                    </Badge>
                  </div>
                </div>

                {selectedVariant.stock > 0 ? (
                  <>
                    {/* Quantity Selector */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold">4. Select Quantity</h2>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-none rounded-l-lg"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            max={selectedVariant.stock}
                            value={quantity}
                            onChange={(e) =>
                              setQuantity(
                                Math.min(
                                  selectedVariant.stock,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              )
                            }
                            className="h-12 w-20 text-center border-0 rounded-none focus-visible:ring-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-12 w-12 rounded-none rounded-r-lg"
                            onClick={() =>
                              setQuantity(Math.min(selectedVariant.stock, quantity + 1))
                            }
                            disabled={quantity >= selectedVariant.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          Max: {selectedVariant.stock}
                        </span>
                      </div>

                      {/* Bulk Discount Info */}
                      {discountPercent > 0 && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {discountPercent}% bulk discount applied
                          </Badge>
                        </div>
                      )}

                      {/* Next discount tier hint */}
                      {bulkDiscounts.some((d) => d.minQuantity > quantity) && (
                        <p className="text-sm text-muted-foreground">
                          💡 Order{" "}
                          {bulkDiscounts.find((d) => d.minQuantity > quantity)?.minQuantity}+ sheets
                          for{" "}
                          {bulkDiscounts.find((d) => d.minQuantity > quantity)?.discountPercent}% off
                        </p>
                      )}
                    </div>

                    {/* Subtotal and Add to Cart */}
                    <div className="rounded-lg border bg-primary/5 p-6 space-y-4">
                      <div className="flex items-center justify-between text-lg">
                        <span className="font-medium">Subtotal</span>
                        <div className="text-right">
                          {discountPercent > 0 && (
                            <p className="text-sm text-muted-foreground line-through">
                              {formatPrice(unitPrice * quantity)}
                            </p>
                          )}
                          <p className="text-xl font-bold">{formatPrice(subtotal)}</p>
                          <p className="text-sm text-muted-foreground">inc. GST</p>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-14 text-lg"
                        onClick={handleAddToCart}
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Add to Cart
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Out of Stock - Notify Me */
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      <h3 className="font-semibold">Get notified when back in stock</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter your email and we&apos;ll let you know when this product is available
                      again.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        className="flex-1"
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
