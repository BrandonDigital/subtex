"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteProduct } from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface BulkDiscount {
  id: string;
  productId: string | null;
  minQuantity: number;
  discountPercent: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Product {
  id: string;
  status: "draft" | "active";
  partNumber: string | null;
  slug: string | null;
  name: string;
  description: string | null;
  basePriceInCents: number;
  imageUrl: string | null;
  isAcm: boolean;
  acmColor: "white" | "black" | null;
  acmMaterial: "gloss" | "matte" | null;
  acmSize: "standard" | "xl" | null;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
  width: string | null;
  height: string | null;
  depth: string | null;
  weight: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
  bulkDiscounts: BulkDiscount[];
}

interface ProductsGridProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function ProductsGrid({ products, onEditProduct }: ProductsGridProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct(productToDelete.id);
      toast.success("Product deleted");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete product " + error);
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className='text-center py-12'>
              <Package className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
              <p className='text-muted-foreground'>
                No products yet. Use the button above to create your first
                product.
              </p>
            </div>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {products.map((product) => {
                return (
                  <Card
                    key={product.id}
                    className='relative overflow-hidden group p-0 gap-0'
                  >
                    <div className='absolute top-3 right-3 z-10'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm'
                          >
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => onEditProduct(product)}
                          >
                            <Pencil className='h-4 w-4 mr-2' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={() => {
                              setProductToDelete(product);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {product.imageUrl ? (
                      <div className='aspect-video bg-muted relative'>
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                          className='object-cover'
                        />
                      </div>
                    ) : (
                      <div className='aspect-video bg-muted flex items-center justify-center'>
                        <Package className='h-12 w-12 text-muted-foreground' />
                      </div>
                    )}

                    <CardContent className='p-4'>
                      <div className='flex items-start justify-between gap-2 mb-2'>
                        <h3 className='font-semibold truncate'>
                          {product.name}
                        </h3>
                        <Badge
                          variant={
                            product.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {product.status === "active" ? "Active" : "Draft"}
                        </Badge>
                      </div>

                      {product.description && (
                        <p className='text-sm text-muted-foreground line-clamp-2 mb-3'>
                          {product.description}
                        </p>
                      )}

                      <div className='flex items-center justify-between text-sm'>
                        <Badge
                          variant={
                            product.stock === 0
                              ? "destructive"
                              : product.stock <= product.lowStockThreshold
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {product.stock === 0
                            ? "Out of Stock"
                            : product.stock <= product.lowStockThreshold
                              ? `Low: ${product.stock}`
                              : `${product.stock} in stock`}
                        </Badge>
                        <span className='font-medium'>
                          {formatPrice(product.basePriceInCents)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{productToDelete?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-destructive text-destructive-foreground'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
