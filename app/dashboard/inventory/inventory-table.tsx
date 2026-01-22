"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, Bell, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateStock, updateHoldingFee, updateLowStockThreshold } from "@/server/actions/admin";
import { toast } from "sonner";

interface Variant {
  id: string;
  sku: string;
  color: "white" | "black";
  material: "gloss" | "matte";
  size: "standard" | "xl";
  priceInCents: number;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
  active: boolean;
}

interface InventoryTableProps {
  variants: Variant[];
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function InventoryTable({ variants }: InventoryTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    stock: 0,
    lowStockThreshold: 5,
    holdingFeeInCents: 5000,
    notifySubscribers: false,
  });

  const filteredVariants = variants.filter(
    (v) =>
      v.sku.toLowerCase().includes(search.toLowerCase()) ||
      v.color.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (variant: Variant) => {
    setSelectedVariant(variant);
    setFormData({
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
      holdingFeeInCents: variant.holdingFeeInCents,
      notifySubscribers: false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant) return;

    setIsLoading(true);
    try {
      // Update stock
      if (formData.stock !== selectedVariant.stock) {
        await updateStock(selectedVariant.id, formData.stock, formData.notifySubscribers);
      }

      // Update threshold
      if (formData.lowStockThreshold !== selectedVariant.lowStockThreshold) {
        await updateLowStockThreshold(selectedVariant.id, formData.lowStockThreshold);
      }

      // Update holding fee
      if (formData.holdingFeeInCents !== selectedVariant.holdingFeeInCents) {
        await updateHoldingFee(selectedVariant.id, formData.holdingFeeInCents);
      }

      toast.success("Inventory updated");
      setDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update inventory");
    } finally {
      setIsLoading(false);
    }
  };

  const showNotifyOption =
    selectedVariant && selectedVariant.stock === 0 && formData.stock > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Stock Levels</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU..."
                className="pl-9 w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Low Stock Alert</TableHead>
                <TableHead className="text-right">Holding Fee</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVariants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border ${
                          variant.color === "white"
                            ? "bg-white border-gray-300"
                            : "bg-gray-900 border-gray-700"
                        }`}
                      />
                      <span className="capitalize">
                        {variant.color} {variant.material} {variant.size}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        variant.stock === 0
                          ? "destructive"
                          : variant.stock <= variant.lowStockThreshold
                          ? "secondary"
                          : "outline"
                      }
                      className="text-sm"
                    >
                      {variant.stock}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    ≤ {variant.lowStockThreshold}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(variant.holdingFeeInCents)}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(variant)}>
                      <Package className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Update Inventory</DialogTitle>
              <DialogDescription>
                {selectedVariant && (
                  <>
                    <span className="capitalize">
                      {selectedVariant.color} {selectedVariant.material} {selectedVariant.size}
                    </span>
                    <span className="text-muted-foreground"> ({selectedVariant.sku})</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              {showNotifyOption && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Notify subscribers</p>
                      <p className="text-xs text-muted-foreground">
                        Email customers waiting for this item
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

              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
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
                <p className="text-xs text-muted-foreground">
                  You&apos;ll be notified when stock falls to this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holdingFee">Holding Fee (Click & Collect)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="holdingFee"
                    type="number"
                    step="0.01"
                    value={(formData.holdingFeeInCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        holdingFeeInCents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Fee charged for click & collect orders
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
