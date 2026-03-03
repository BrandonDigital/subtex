"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Search,
  Package,
  Clock,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Product {
  id: string;
  name: string;
  partNumber: string | null;
  basePriceInCents: number;
  imageUrl: string | null;
  isAcm: boolean;
  acmColor: "white" | "black" | null;
  acmMaterial: "gloss/matte" | "gloss/primer" | null;
  acmSize: "standard" | "xl" | null;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
  reserved: number;
  sold: number;
  available: number;
}

interface InventoryTableProps {
  products: Product[];
  stats: {
    totalStock: number;
    totalReserved: number;
    totalSold: number;
    totalAvailable: number;
    productCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  onEdit: (product: Product) => void;
}

type FilterType = "all" | "low" | "out" | "reserved";

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function InventoryTable({
  products,
  stats,
  onEdit,
}: InventoryTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.partNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);

    if (!matchesSearch) return false;

    switch (filter) {
      case "low":
        return p.available > 0 && p.available <= p.lowStockThreshold;
      case "out":
        return p.available === 0;
      case "reserved":
        return p.reserved > 0;
      default:
        return true;
    }
  });

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Inventory</h1>
        <p className='text-muted-foreground'>
          Manage stock levels, view reservations and purchase history
        </p>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-3 lg:grid-cols-6'>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm font-medium text-muted-foreground'>
            Total Stock
          </div>
          <div className='text-2xl font-bold'>{stats.totalStock}</div>
          <p className='text-xs text-muted-foreground mt-1'>In warehouse</p>
        </div>
        <div className='rounded-lg border bg-card p-4'>
          <div className='text-sm font-medium text-muted-foreground'>
            Available
          </div>
          <div className='text-2xl font-bold text-green-600'>
            {stats.totalAvailable}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>Ready to sell</p>
        </div>
        <div className='rounded-lg border bg-card p-4 border-blue-500/50'>
          <div className='text-sm font-medium text-blue-600'>Reserved</div>
          <div className='text-2xl font-bold text-blue-600'>
            {stats.totalReserved}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>In checkout</p>
        </div>
        <div className='rounded-lg border bg-card p-4 border-purple-500/50'>
          <div className='text-sm font-medium text-purple-600'>Purchased</div>
          <div className='text-2xl font-bold text-purple-600'>
            {stats.totalSold}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>Active orders</p>
        </div>
        <div className='rounded-lg border bg-card p-4 border-yellow-500/50'>
          <div className='text-sm font-medium text-yellow-600'>Low Stock</div>
          <div className='text-2xl font-bold text-yellow-600'>
            {stats.lowStockCount}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>Need restock</p>
        </div>
        <div className='rounded-lg border bg-card p-4 border-red-500/50'>
          <div className='text-sm font-medium text-red-600'>Out of Stock</div>
          <div className='text-2xl font-bold text-red-600'>
            {stats.outOfStockCount}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>Unavailable</p>
        </div>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <CardTitle>Stock Levels</CardTitle>
            <div className='flex items-center gap-3'>
              {/* Filter buttons */}
              <div className='flex gap-1'>
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "reserved", label: "Reserved" },
                    { key: "low", label: "Low Stock" },
                    { key: "out", label: "Out" },
                  ] as const
                ).map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={filter === key ? "default" : "outline"}
                    size='sm'
                    onClick={() => setFilter(key)}
                    className='text-xs'
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search by name or part number...'
                  className='pl-9 w-[250px]'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead className='text-center'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center gap-1 mx-auto'>
                        Stock
                      </TooltipTrigger>
                      <TooltipContent>Total units in warehouse</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className='text-center'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center gap-1 mx-auto text-blue-600'>
                        <Clock className='h-3.5 w-3.5' />
                        Reserved
                      </TooltipTrigger>
                      <TooltipContent>
                        Units currently held in checkout
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className='text-center'>
                    <Tooltip>
                      <TooltipTrigger className='flex items-center gap-1 mx-auto text-purple-600'>
                        <ShoppingCart className='h-3.5 w-3.5' />
                        Purchased
                      </TooltipTrigger>
                      <TooltipContent>
                        Units from active orders (paid, processing, shipped,
                        delivered, collected)
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className='text-center'>Available</TableHead>
                  <TableHead className='text-center'>Low Alert</TableHead>
                  <TableHead className='text-right'>Holding Fee</TableHead>
                  <TableHead className='sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className='text-center py-8 text-muted-foreground'
                    >
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className='flex items-center gap-3'>
                          <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted'>
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                className='object-cover'
                                sizes='40px'
                              />
                            ) : (
                              <div className='flex h-full w-full items-center justify-center'>
                                <Package className='h-4 w-4 text-muted-foreground' />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className='flex items-center gap-1.5'>
                              {product.isAcm && product.acmColor && (
                                <div
                                  className={`h-3 w-3 rounded-full border ${
                                    product.acmColor === "white"
                                      ? "bg-white border-gray-300"
                                      : "bg-gray-900 border-gray-700"
                                  }`}
                                />
                              )}
                              <span className='font-medium'>
                                {product.name}
                              </span>
                            </div>
                            {product.isAcm &&
                              product.acmColor &&
                              product.acmMaterial &&
                              product.acmSize && (
                                <p className='text-xs text-muted-foreground capitalize'>
                                  {product.acmColor} {product.acmMaterial}{" "}
                                  {product.acmSize}
                                </p>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className='font-mono text-sm'>
                        {product.partNumber || "-"}
                      </TableCell>
                      <TableCell className='text-center'>
                        <span className='text-sm font-medium'>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell className='text-center'>
                        {product.reserved > 0 ? (
                          <Badge
                            variant='outline'
                            className='bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
                          >
                            {product.reserved}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground text-sm'>
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-center'>
                        {product.sold > 0 ? (
                          <Badge
                            variant='outline'
                            className='bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'
                          >
                            {product.sold}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground text-sm'>
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge
                          variant={
                            product.available === 0
                              ? "destructive"
                              : product.available <= product.lowStockThreshold
                                ? "secondary"
                                : "outline"
                          }
                          className='text-sm'
                        >
                          {product.available}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-center text-muted-foreground'>
                        ≤ {product.lowStockThreshold}
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatPrice(product.holdingFeeInCents)}
                      </TableCell>
                      <TableCell className='sticky right-0 bg-card z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onEdit(product)}
                        >
                          <Package className='h-4 w-4 mr-2' />
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
