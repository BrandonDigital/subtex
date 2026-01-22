import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getActiveVariants, getBulkDiscounts } from "@/server/actions/products";
import { ProductsTable } from "./products-table";
import { BulkDiscountsCard } from "./bulk-discounts-card";

export const metadata: Metadata = {
  title: "Products",
  description: "Manage ACM sheet products and variants.",
};

export default async function DashboardProductsPage() {
  const [variants, bulkDiscounts] = await Promise.all([
    getActiveVariants(),
    getBulkDiscounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage ACM sheet variants and pricing</p>
        </div>
      </div>

      {/* Bulk Discounts Card */}
      <BulkDiscountsCard bulkDiscounts={bulkDiscounts} />

      {/* Variants Table */}
      <ProductsTable variants={variants} />
    </div>
  );
}
