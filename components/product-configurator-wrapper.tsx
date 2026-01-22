"use client";

import { ProductConfigurator } from "@/components/product-configurator";
import { useCart } from "@/hooks/use-cart";
import { subscribeToStockAlert } from "@/server/actions/products";
import { toast } from "sonner";

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

interface ProductConfiguratorWrapperProps {
  variants?: ProductVariant[];
  bulkDiscounts?: BulkDiscount[];
}

export function ProductConfiguratorWrapper({
  variants,
  bulkDiscounts,
}: ProductConfiguratorWrapperProps) {
  const { addItem } = useCart();

  const handleAddToCart = (variantId: string, quantity: number) => {
    const variant = variants?.find((v) => v.id === variantId);
    if (!variant) return;

    addItem({
      variantId: variant.id,
      sku: variant.sku,
      color: variant.color,
      material: variant.material,
      size: variant.size,
      priceInCents: variant.priceInCents,
      quantity,
    });
  };

  const handleNotifyMe = async (variantId: string, email: string) => {
    try {
      await subscribeToStockAlert(variantId, email);
      toast.success("You'll be notified when this item is back in stock");
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  return (
    <ProductConfigurator
      variants={variants}
      bulkDiscounts={bulkDiscounts}
      onAddToCart={handleAddToCart}
      onNotifyMe={handleNotifyMe}
    />
  );
}
