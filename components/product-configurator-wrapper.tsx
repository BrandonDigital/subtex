"use client";

import { ProductConfigurator } from "@/components/product-configurator";
import { useCart } from "@/hooks/use-cart";
import { subscribeToStockAlert } from "@/server/actions/products";
import { toast } from "@/components/ui/toast";

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

interface ProductConfiguratorWrapperProps {
  acmProducts: AcmProduct[];
}

export function ProductConfiguratorWrapper({
  acmProducts,
}: ProductConfiguratorWrapperProps) {
  const { addItem } = useCart();

  const handleAddToCart = (productId: string, quantity: number) => {
    const product = acmProducts.find((p) => p.id === productId);
    if (!product) return;

    addItem({
      productId: product.id,
      partNumber: product.partNumber || product.id,
      productName: product.name,
      color: product.acmColor || undefined,
      size: product.acmSize || undefined,
      priceInCents: product.basePriceInCents,
      basePriceInCents: product.basePriceInCents,
      quantity,
      bulkDiscounts: product.bulkDiscounts,
      imageUrl: product.imageUrl || undefined,
      stock: product.stock,
    });
  };

  const handleNotifyMe = async (productId: string, email: string) => {
    try {
      await subscribeToStockAlert(productId, email);
      toast.success("You'll be notified when this item is back in stock");
    } catch {
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  return (
    <ProductConfigurator
      acmProducts={acmProducts}
      onAddToCart={handleAddToCart}
      onNotifyMe={handleNotifyMe}
    />
  );
}
