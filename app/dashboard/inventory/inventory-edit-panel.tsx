"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Bell, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  updateStock,
  updateHoldingFee,
  updateLowStockThreshold,
} from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";

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

interface InventoryEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function InventoryEditPanel({
  isOpen,
  onClose,
  product,
}: InventoryEditPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    stock: 0,
    lowStockThreshold: 5,
    holdingFeeInCents: 5000,
    notifySubscribers: false,
  });

  // Handle open/close animations and form data initialization
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        holdingFeeInCents: product.holdingFeeInCents,
        notifySubscribers: false,
      });
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [isOpen, product]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsLoading(true);
    try {
      // Update stock
      if (formData.stock !== product.stock) {
        await updateStock(
          product.id,
          formData.stock,
          formData.notifySubscribers
        );
      }

      // Update threshold
      if (formData.lowStockThreshold !== product.lowStockThreshold) {
        await updateLowStockThreshold(product.id, formData.lowStockThreshold);
      }

      // Update holding fee
      if (formData.holdingFeeInCents !== product.holdingFeeInCents) {
        await updateHoldingFee(product.id, formData.holdingFeeInCents);
      }

      toast.success("Inventory updated");
      router.refresh();
      handleClose();
    } catch {
      toast.error("Failed to update inventory");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotifyOption = product && product.stock === 0 && formData.stock > 0;
  const stockChange = product ? formData.stock - product.stock : 0;

  if (!isVisible || !product) return null;

  return (
    <div
      className={`fixed top-16 bottom-0 left-0 right-0 z-40 bg-background transition-transform duration-300 ease-in-out ${
        isClosing ? "translate-x-full" : "translate-x-0"
      } ${!isClosing && isOpen ? "animate-in slide-in-from-right" : ""}`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b bg-background">
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Update Inventory</h1>
            <p className="text-sm text-muted-foreground">
              {product.name}
              {product.partNumber && (
                <span className="ml-1">({product.partNumber})</span>
              )}
            </p>
          </div>
          <Badge
            variant={
              product.stock === 0
                ? "destructive"
                : product.stock <= product.lowStockThreshold
                  ? "secondary"
                  : "outline"
            }
          >
            <Package className="h-3 w-3 mr-1" />
            {product.stock} in stock
          </Badge>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Product Info Card */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  {product.isAcm && product.acmColor && (
                    <div
                      className={`h-8 w-8 rounded-full border-2 ${
                        product.acmColor === "white"
                          ? "bg-white border-gray-300"
                          : "bg-gray-900 border-gray-700"
                      }`}
                    />
                  )}
                  <div>
                    <p className="font-medium">{product.name}</p>
                    {product.isAcm &&
                      product.acmColor &&
                      product.acmMaterial &&
                      product.acmSize && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {product.acmColor} {product.acmMaterial} {product.acmSize}
                        </p>
                      )}
                    <p className="text-sm text-muted-foreground">
                      Base price: {formatPrice(product.basePriceInCents)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock Quantity */}
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-base">
                  Stock Quantity
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="text-lg"
                />
                {stockChange !== 0 && (
                  <p
                    className={`text-sm ${
                      stockChange > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stockChange > 0 ? "+" : ""}
                    {stockChange} from current stock
                  </p>
                )}
              </div>

              {/* Notify Subscribers Option */}
              {showNotifyOption && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Notify subscribers</p>
                      <p className="text-sm text-muted-foreground">
                        Email customers waiting for this item to come back in stock
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notifySubscribers}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notifySubscribers: checked })
                    }
                  />
                </div>
              )}

              <Separator />

              {/* Low Stock Alert Threshold */}
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold" className="text-base">
                  Low Stock Alert Threshold
                </Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lowStockThreshold: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  You&apos;ll receive a notification when stock falls to or below this
                  level
                </p>
                {formData.stock > 0 &&
                  formData.stock <= formData.lowStockThreshold && (
                    <div className="flex items-center gap-2 text-yellow-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Current stock is at or below this threshold
                    </div>
                  )}
              </div>

              <Separator />

              {/* Holding Fee */}
              <div className="space-y-2">
                <Label htmlFor="holdingFee" className="text-base">
                  Holding Fee (Click & Collect)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="holdingFee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={(formData.holdingFeeInCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        holdingFeeInCents: Math.round(
                          parseFloat(e.target.value || "0") * 100
                        ),
                      })
                    }
                    className="pl-7"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Fee charged when customers choose Click & Collect. This covers the
                  cost of holding stock for {product.holdingPeriodDays} days.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-background">
            <div className="max-w-2xl mx-auto flex items-center justify-end gap-3 px-6 py-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
