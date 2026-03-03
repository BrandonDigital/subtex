import type { Metadata } from "next";
import { getInventoryBreakdown } from "@/server/actions/products";
import { InventoryPageClient } from "./inventory-page-client";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage stock levels and holding fees.",
};

export default async function DashboardInventoryPage() {
  const products = await getInventoryBreakdown();

  // Calculate summary stats
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalReserved = products.reduce((sum, p) => sum + p.reserved, 0);
  const totalSold = products.reduce((sum, p) => sum + p.sold, 0);
  const totalAvailable = products.reduce((sum, p) => sum + p.available, 0);
  const lowStockCount = products.filter(
    (p) => p.available > 0 && p.available <= p.lowStockThreshold
  ).length;
  const outOfStockCount = products.filter((p) => p.available === 0).length;

  return (
    <InventoryPageClient
      products={products}
      stats={{
        totalStock,
        totalReserved,
        totalSold,
        totalAvailable,
        productCount: products.length,
        lowStockCount,
        outOfStockCount,
      }}
    />
  );
}
