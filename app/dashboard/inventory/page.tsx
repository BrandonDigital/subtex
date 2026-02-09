import type { Metadata } from "next";
import { getActiveProductsWithStock } from "@/server/actions/products";
import { InventoryPageClient } from "./inventory-page-client";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage stock levels and holding fees.",
};

export default async function DashboardInventoryPage() {
  const products = await getActiveProductsWithStock();

  // Calculate summary stats
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <InventoryPageClient
      products={products}
      stats={{
        totalStock,
        productCount: products.length,
        lowStockCount,
        outOfStockCount,
      }}
    />
  );
}
