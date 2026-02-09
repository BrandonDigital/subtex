"use client";

import { useState, useCallback } from "react";
import { InventoryTable } from "./inventory-table";
import { InventoryEditPanel } from "./inventory-edit-panel";

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

interface InventoryPageClientProps {
  products: Product[];
  stats: {
    totalStock: number;
    productCount: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export function InventoryPageClient({
  products,
  stats,
}: InventoryPageClientProps) {
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleEdit = useCallback((product: Product) => {
    setSelectedProduct(product);
    setShowEditPanel(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setShowEditPanel(false);
    setSelectedProduct(null);
  }, []);

  return (
    <>
      <InventoryTable
        products={products}
        stats={stats}
        onEdit={handleEdit}
      />

      {/* Edit Inventory Panel Overlay */}
      <InventoryEditPanel
        isOpen={showEditPanel}
        onClose={handleClosePanel}
        product={selectedProduct}
      />
    </>
  );
}
