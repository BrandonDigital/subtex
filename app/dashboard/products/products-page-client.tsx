"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsGrid } from "./products-grid";
import { CreateProductPanel } from "./create-product-panel";
import { EditProductPanel } from "./edit-product-panel";

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

interface ProductsPageClientProps {
  products: Product[];
}

interface EditProductFormData {
  id: string;
  status: "draft" | "active";
  partNumber: string;
  slug: string;
  name: string;
  description: string;
  basePriceInCents: number;
  imageUrl: string;
  isAcm: boolean;
  acmColor: string;
  acmMaterial: string;
  acmSize: string;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
  width: string;
  height: string;
  depth: string;
  weight: string;
  metaTitle: string;
  metaDescription: string;
  bulkDiscounts: {
    id?: string;
    minQuantity: number;
    discountPercent: number;
  }[];
}

export function ProductsPageClient({ products }: ProductsPageClientProps) {
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editProduct, setEditProduct] = useState<EditProductFormData | null>(
    null,
  );

  const handleOpenCreate = useCallback(() => {
    setShowCreatePanel(true);
  }, []);

  const handleCloseCreate = useCallback(() => {
    setShowCreatePanel(false);
  }, []);

  const handleOpenEdit = useCallback((product: Product) => {
    setEditProduct({
      id: product.id,
      status: product.status,
      partNumber: product.partNumber || "",
      slug: product.slug || "",
      name: product.name,
      description: product.description || "",
      basePriceInCents: product.basePriceInCents,
      imageUrl: product.imageUrl || "",
      isAcm: product.isAcm,
      acmColor: product.acmColor || "",
      acmMaterial: product.acmMaterial || "",
      acmSize: product.acmSize || "",
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      holdingFeeInCents: product.holdingFeeInCents,
      holdingPeriodDays: product.holdingPeriodDays,
      width: product.width || "",
      height: product.height || "",
      depth: product.depth || "",
      weight: product.weight || "",
      metaTitle: product.metaTitle || "",
      metaDescription: product.metaDescription || "",
      bulkDiscounts: product.bulkDiscounts
        .filter((d) => d.active)
        .map((d) => ({
          id: d.id,
          minQuantity: d.minQuantity,
          discountPercent: d.discountPercent,
        })),
    });
    setShowEditPanel(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setShowEditPanel(false);
    setEditProduct(null);
  }, []);

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold'>Products</h1>
            <p className='text-muted-foreground'>
              Manage products, pricing, and inventory
            </p>
          </div>
          <Button size='lg' onClick={handleOpenCreate}>
            <Plus className='h-5 w-5 mr-2' />
            Create Product
          </Button>
        </div>

        {/* Products Grid */}
        <ProductsGrid products={products} onEditProduct={handleOpenEdit} />
      </div>

      {/* Create Product Panel Overlay */}
      <CreateProductPanel
        isOpen={showCreatePanel}
        onClose={handleCloseCreate}
      />

      {/* Edit Product Panel Overlay */}
      <EditProductPanel
        isOpen={showEditPanel}
        onClose={handleCloseEdit}
        product={editProduct}
      />
    </>
  );
}
