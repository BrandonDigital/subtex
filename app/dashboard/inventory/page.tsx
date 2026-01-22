import type { Metadata } from "next";
import { getActiveVariants } from "@/server/actions/products";
import { InventoryTable } from "./inventory-table";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Manage stock levels and holding fees.",
};

export default async function DashboardInventoryPage() {
  const variants = await getActiveVariants();

  // Calculate summary stats
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const lowStockCount = variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).length;
  const outOfStockCount = variants.filter((v) => v.stock === 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">Manage stock levels and holding fees</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Stock</div>
          <div className="text-2xl font-bold">{totalStock}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">Variants</div>
          <div className="text-2xl font-bold">{variants.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 border-yellow-500/50">
          <div className="text-sm font-medium text-yellow-600">Low Stock</div>
          <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 border-red-500/50">
          <div className="text-sm font-medium text-red-600">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable variants={variants} />
    </div>
  );
}
