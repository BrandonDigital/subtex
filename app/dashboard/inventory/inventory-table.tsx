"use client";

import { useState } from "react";
import { Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  partNumber: string | null;
  basePriceInCents: number;
  isAcm: boolean;
  acmColor: "white" | "black" | null;
  acmMaterial: "gloss" | "matte" | null;
  acmSize: "standard" | "xl" | null;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
}

interface InventoryTableProps {
  products: Product[];
  stats: {
    totalStock: number;
    productCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  onEdit: (product: Product) => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function InventoryTable({ products, stats, onEdit }: InventoryTableProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.partNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">
          Manage stock levels and holding fees
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Total Stock
          </div>
          <div className="text-2xl font-bold">{stats.totalStock}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Products
          </div>
          <div className="text-2xl font-bold">{stats.productCount}</div>
        </div>
        <div className="rounded-lg border bg-card p-4 border-yellow-500/50">
          <div className="text-sm font-medium text-yellow-600">Low Stock</div>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.lowStockCount}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 border-red-500/50">
          <div className="text-sm font-medium text-red-600">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">
            {stats.outOfStockCount}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Stock Levels</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or part number..."
                  className="pl-9 w-[250px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Low Stock Alert</TableHead>
                <TableHead className="text-right">Holding Fee</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.isAcm && product.acmColor && (
                          <div
                            className={`h-4 w-4 rounded-full border ${
                              product.acmColor === "white"
                                ? "bg-white border-gray-300"
                                : "bg-gray-900 border-gray-700"
                            }`}
                          />
                        )}
                        <div>
                          <span className="font-medium">{product.name}</span>
                          {product.isAcm &&
                            product.acmColor &&
                            product.acmMaterial &&
                            product.acmSize && (
                              <p className="text-xs text-muted-foreground capitalize">
                                {product.acmColor} {product.acmMaterial}{" "}
                                {product.acmSize}
                              </p>
                            )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.partNumber || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          product.stock === 0
                            ? "destructive"
                            : product.stock <= product.lowStockThreshold
                              ? "secondary"
                              : "outline"
                        }
                        className="text-sm"
                      >
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      ≤ {product.lowStockThreshold}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(product.holdingFeeInCents)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(product)}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
