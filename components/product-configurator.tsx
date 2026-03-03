"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, Bell, ShoppingCart, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BackorderNotice } from "@/components/backorder-notice";
import {
  CutPlanConfigurator,
  SHEET_DIMENSIONS,
  type CuttingSpec,
} from "@/components/cut-plan-configurator";

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
  onAddToCart?: (productId: string, quantity: number, cuttingSpec?: CuttingSpec) => void;
  onNotifyMe?: (productId: string, email: string) => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

const sizeInfo: Record<Size, { label: string; dimensions: string }> = {
  standard: { label: "Standard", dimensions: "2440 × 1220 mm" },
  xl: { label: "XL", dimensions: "3050 × 1500 mm" },
};

function QuantityAndCart({
  quantity,
  setQuantity,
  currentStock,
  discountPercent,
  bulkDiscounts,
  subtotal,
  unitPrice,
  formatPrice: fmt,
  onAddToCart,
}: {
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
  currentStock: number;
  discountPercent: number;
  bulkDiscounts: BulkDiscount[];
  subtotal: number;
  unitPrice: number;
  formatPrice: (n: number) => string;
  onAddToCart: () => void;
}) {
  return (
    <>
      <div className="space-y-6">
        <h4 className="text-xl font-bold uppercase tracking-tight">Quantity</h4>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center border-2 border-black/10 overflow-hidden bg-white">
            <button
              type="button"
              className="w-14 h-14 flex items-center justify-center hover:bg-black/5 transition-colors disabled:opacity-50"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(() => Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 h-14 text-center font-bold text-xl border-x-2 border-black/10 focus:outline-none"
            />
            <button
              type="button"
              className="w-14 h-14 flex items-center justify-center hover:bg-black/5 transition-colors"
              onClick={() => setQuantity((prev) => prev + 1)}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-1">
            <p className="font-medium text-black/60">{currentStock} in stock</p>
            {discountPercent > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                {discountPercent}% bulk discount applied
              </Badge>
            )}
          </div>
        </div>

        <BackorderNotice
          availableStock={currentStock}
          requestedQuantity={quantity}
        />

        {bulkDiscounts.some((d) => d.minQuantity > quantity) && (
          <p className="text-sm font-medium text-black/50">
            Order {bulkDiscounts.find((d) => d.minQuantity > quantity)?.minQuantity}+ sheets for {bulkDiscounts.find((d) => d.minQuantity > quantity)?.discountPercent}% off
          </p>
        )}
      </div>

      <div className="bg-[#0A0A0A] text-white p-8 sm:p-10 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white/50 font-medium mb-1 uppercase tracking-wider text-sm">Subtotal</p>
            <div className="flex items-baseline gap-3">
              <p className="text-4xl sm:text-5xl font-black tracking-tighter">
                {fmt(subtotal)}
              </p>
              {discountPercent > 0 && (
                <p className="text-lg text-white/40 line-through font-medium mb-1">
                  {fmt(unitPrice * quantity)}
                </p>
              )}
            </div>
          </div>
          <p className="text-white/50 text-sm pb-2 font-medium">inc. GST</p>
        </div>
        
        <Button
          size="lg"
          className="w-full h-16 text-lg bg-white text-black hover:bg-white/90 font-bold uppercase tracking-wide transition-all hover:scale-[1.02]"
          onClick={onAddToCart}
        >
          <ShoppingCart className="mr-3 h-6 w-6" />
          Add to Cart
        </Button>
      </div>
    </>
  );
}

export function ProductConfigurator({
  acmProducts,
  onAddToCart,
  onNotifyMe,
}: ProductConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [cuttingSpec, setCuttingSpec] = useState<CuttingSpec | null>(null);
  const [cuttingEnabled, setCuttingEnabled] = useState(false);

  const getSizesForColor = (color: Color) =>
    acmProducts.filter((p) => p.acmColor === color && p.acmSize);

  const hasStock = (color: Color) =>
    acmProducts.some((p) => p.acmColor === color && p.stock > 0);

  const handleColorClick = (color: Color) => {
    if (selectedColor === color) {
      setSelectedColor(null);
      setSelectedSize(null);
    } else {
      setSelectedColor(color);
      setSelectedSize(null);
    }
    setQuantity(1);
    setCuttingSpec(null);
  };

  const handleSizeSelect = (color: Color, size: Size) => {
    setSelectedColor(color);
    setSelectedSize(size);
    setQuantity(1);
    setCuttingSpec(null);
  };

  const whiteSizes = getSizesForColor("white");
  const blackSizes = getSizesForColor("black");

  // Get selected product
  const selectedProduct =
    selectedColor && selectedSize
      ? acmProducts.find(
          (p) => p.acmColor === selectedColor && p.acmSize === selectedSize
        )
      : null;

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

  const handleAddToCartClick = () => {
    if (onAddToCart && selectedProduct) {
      onAddToCart(selectedProduct.id, quantity, cuttingSpec || undefined);
    }
  };

  const handleNotifyMeClick = () => {
    if (selectedProduct && notifyEmail && onNotifyMe) {
      onNotifyMe(selectedProduct.id, notifyEmail);
      setNotifyEmail("");
    }
  };

  return (
    <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
      <div className="mb-12">
        <h2 className="text-6xl sm:text-8xl lg:text-[9rem] font-black tracking-tighter uppercase leading-[0.85] mb-4">
          Shop Panels
        </h2>
        <p className="text-base sm:text-lg font-medium text-black/50 max-w-lg">
          Select your colour to view available sizes and pricing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* White Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleColorClick("white")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleColorClick("white");
            }
          }}
          className={cn(
            "group relative overflow-hidden text-left transition-all duration-500 border-2 cursor-pointer",
            "bg-white text-black",
            selectedColor === "white"
              ? "border-black"
              : "border-black/10 hover:border-black/30"
          )}
        >
          <div className="p-8 sm:p-10">
            <div className="flex justify-between items-start mb-16 sm:mb-24">
              <div
                className={cn(
                  "w-14 h-14 rounded-full border-2 border-black/15 bg-white shadow-inner transition-all duration-300 flex items-center justify-center",
                  selectedColor === "white" && "ring-4 ring-black/10"
                )}
              >
                {selectedColor === "white" && (
                  <Check className="w-6 h-6 text-black" strokeWidth={3} />
                )}
              </div>
              <ArrowUpRight
                className="w-16 h-16 sm:w-20 sm:h-20 opacity-15 group-hover:opacity-40 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
                strokeWidth={1}
              />
            </div>
            <h3 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-none mb-2">
              White.
            </h3>
            <p className="text-sm font-medium text-black/50">
              {hasStock("white") ? "In Stock" : "Out of Stock"} &middot;{" "}
              {whiteSizes.length} size{whiteSizes.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Size reveal */}
          <div
            className={cn(
              "grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              selectedColor === "white"
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col">
                {whiteSizes.map((product) => {
                  const size = product.acmSize as Size;
                  const info = sizeInfo[size];
                  const inStock = product.stock > 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeSelect("white", size);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between border-t px-8 sm:px-10 py-6 transition-all duration-300",
                        selectedSize === size && selectedColor === "white"
                          ? "border-black bg-black text-white"
                          : inStock
                          ? "border-black/10 hover:bg-black hover:text-white"
                          : "border-black/5 opacity-40 pointer-events-none"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-bold text-lg">{info.label}</p>
                          <p className="text-sm opacity-60">
                            {info.dimensions}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xl">
                          {formatPrice(product.basePriceInCents)}
                        </p>
                        <p className="text-xs opacity-50">inc. GST</p>
                      </div>
                    </button>
                  );
                })}
                {whiteSizes.length === 0 && (
                  <p className="text-sm text-black/40 py-4 text-center">
                    No sizes available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Black Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleColorClick("black")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleColorClick("black");
            }
          }}
          className={cn(
            "group relative overflow-hidden text-left transition-all duration-500 border-2 cursor-pointer",
            "bg-[#0A0A0A] text-white",
            selectedColor === "black"
              ? "border-white"
              : "border-white/10 hover:border-white/30"
          )}
        >
          <div className="p-8 sm:p-10">
            <div className="flex justify-between items-start mb-16 sm:mb-24">
              <div
                className={cn(
                  "w-14 h-14 rounded-full border-2 border-white/15 bg-black shadow-inner transition-all duration-300 flex items-center justify-center",
                  selectedColor === "black" && "ring-4 ring-white/10"
                )}
              >
                {selectedColor === "black" && (
                  <Check className="w-6 h-6 text-white" strokeWidth={3} />
                )}
              </div>
              <ArrowUpRight
                className="w-16 h-16 sm:w-20 sm:h-20 opacity-15 group-hover:opacity-40 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
                strokeWidth={1}
              />
            </div>
            <h3 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-none mb-2">
              Black.
            </h3>
            <p className="text-sm font-medium text-white/50">
              {hasStock("black") ? "In Stock" : "Out of Stock"} &middot;{" "}
              {blackSizes.length} size{blackSizes.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Size reveal */}
          <div
            className={cn(
              "grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              selectedColor === "black"
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col">
                {blackSizes.map((product) => {
                  const size = product.acmSize as Size;
                  const info = sizeInfo[size];
                  const inStock = product.stock > 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSizeSelect("black", size);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between border-t px-8 sm:px-10 py-6 transition-all duration-300",
                        selectedSize === size && selectedColor === "black"
                          ? "border-white bg-white text-black"
                          : inStock
                          ? "border-white/10 hover:bg-white hover:text-black"
                          : "border-white/5 opacity-40 pointer-events-none"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="font-bold text-lg">{info.label}</p>
                          <p className="text-sm opacity-60">
                            {info.dimensions}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xl">
                          {formatPrice(product.basePriceInCents)}
                        </p>
                        <p className="text-xs opacity-50">inc. GST</p>
                      </div>
                    </button>
                  );
                })}
                {blackSizes.length === 0 && (
                  <p className="text-sm text-white/40 py-4 text-center">
                    No sizes available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Panel (appears when a size is selected) */}
      <div
        className={cn(
          "grid transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          selectedProduct ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {selectedProduct && (
            <div className="p-8 sm:p-12 border-2 border-t-0 border-black/10 bg-white text-black">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                
                {/* Left Column: Details & Image */}
                <div className="space-y-12">
                  <div>
                    <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-2">
                      Configuration.
                    </h3>
                    <p className="text-black/50 font-medium text-lg">
                      {selectedProduct.name} &middot; {selectedProduct.partNumber || selectedProduct.id}
                    </p>
                  </div>

                  {selectedProduct.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden bg-black/5">
                      <Image
                        src={selectedProduct.imageUrl}
                        alt={selectedProduct.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>
                  )}

                  {!isInStock && (
                    <div className="p-8 space-y-6 border border-black/10">
                      <div className="flex items-center gap-3">
                        <Bell className="w-6 h-6" />
                        <h4 className="text-xl font-bold uppercase tracking-tight">Out of Stock</h4>
                      </div>
                      <p className="text-black/60 font-medium">
                        Enter your email to be notified when this panel is back in stock.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          className="h-14 border-black/20 bg-white text-base"
                        />
                        <Button 
                          className="h-14 px-8 font-bold uppercase tracking-wide shrink-0" 
                          onClick={handleNotifyMeClick} 
                          disabled={!notifyEmail}
                        >
                          Notify Me
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Quantity & Cart (when cutting is disabled) */}
                {isInStock && !cuttingEnabled && (
                  <div className="space-y-12">
                    <QuantityAndCart
                      quantity={quantity}
                      setQuantity={setQuantity}
                      currentStock={currentStock}
                      discountPercent={discountPercent}
                      bulkDiscounts={bulkDiscounts}
                      subtotal={subtotal}
                      unitPrice={unitPrice}
                      formatPrice={formatPrice}
                      onAddToCart={handleAddToCartClick}
                    />
                  </div>
                )}

              </div>

              {/* Cutting Service - full width */}
              {isInStock && selectedSize && (
                <div className="space-y-6 mt-12">
                  <div className="flex items-center gap-4">
                    <h4 className="text-xl font-bold uppercase tracking-tight">Cutting Service</h4>
                  </div>
                  <CutPlanConfigurator
                    sheetWidthMm={SHEET_DIMENSIONS[selectedSize]?.width || 2440}
                    sheetHeightMm={SHEET_DIMENSIONS[selectedSize]?.height || 1220}
                    cuttingSpec={cuttingSpec}
                    onCuttingSpecChange={setCuttingSpec}
                    onEnabledChange={setCuttingEnabled}
                  />
                </div>
              )}

              {/* Quantity & Subtotal below cutting (when cutting is enabled) */}
              {isInStock && cuttingEnabled && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mt-12">
                  <QuantityAndCart
                    quantity={quantity}
                    setQuantity={setQuantity}
                    currentStock={currentStock}
                    discountPercent={discountPercent}
                    bulkDiscounts={bulkDiscounts}
                    subtotal={subtotal}
                    unitPrice={unitPrice}
                    formatPrice={formatPrice}
                    onAddToCart={handleAddToCartClick}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
