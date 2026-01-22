"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createVariant, updateVariant } from "@/server/actions/admin";
import { toast } from "sonner";

interface VariantFormData {
  id?: string;
  productId: string;
  color: "white" | "black";
  material: "gloss" | "matte";
  size: "standard" | "xl";
  sku: string;
  priceInCents: number;
  stock: number;
  lowStockThreshold: number;
  holdingFeeInCents: number;
  holdingPeriodDays: number;
  active: boolean;
}

interface VariantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  variant?: Partial<VariantFormData>;
  mode: "create" | "edit";
}

const defaultVariant: Omit<VariantFormData, "productId"> = {
  color: "white",
  material: "gloss",
  size: "standard",
  sku: "",
  priceInCents: 8500,
  stock: 0,
  lowStockThreshold: 5,
  holdingFeeInCents: 5000,
  holdingPeriodDays: 7,
  active: true,
};

function generateSku(color: string, material: string, size: string): string {
  const colorCode = color === "white" ? "WHT" : "BLK";
  const materialCode = material === "gloss" ? "GLS" : "MAT";
  const sizeCode = size === "standard" ? "STD" : "XL";
  return `${colorCode}-${materialCode}-${sizeCode}`;
}

export function VariantFormDialog({
  open,
  onOpenChange,
  productId,
  variant,
  mode,
}: VariantFormDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<VariantFormData>({
    ...defaultVariant,
    productId,
    ...variant,
  });

  const handleChange = (field: keyof VariantFormData, value: string | number | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate SKU when color, material, or size changes
      if (field === "color" || field === "material" || field === "size") {
        updated.sku = generateSku(
          field === "color" ? (value as string) : prev.color,
          field === "material" ? (value as string) : prev.material,
          field === "size" ? (value as string) : prev.size
        );
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "create") {
        await createVariant({
          productId: formData.productId,
          color: formData.color,
          material: formData.material,
          size: formData.size,
          sku: formData.sku,
          priceInCents: formData.priceInCents,
          stock: formData.stock,
          lowStockThreshold: formData.lowStockThreshold,
          holdingFeeInCents: formData.holdingFeeInCents,
          holdingPeriodDays: formData.holdingPeriodDays,
          active: formData.active,
        });
        toast.success("Variant created successfully");
      } else {
        await updateVariant(formData.id!, {
          color: formData.color,
          material: formData.material,
          size: formData.size,
          sku: formData.sku,
          priceInCents: formData.priceInCents,
          lowStockThreshold: formData.lowStockThreshold,
          holdingFeeInCents: formData.holdingFeeInCents,
          holdingPeriodDays: formData.holdingPeriodDays,
          active: formData.active,
        });
        toast.success("Variant updated successfully");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving variant:", error);
      toast.error("Failed to save variant");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Add New Variant" : "Edit Variant"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Create a new product variant with specific color, material, and size."
                : "Update the variant details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Colour</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => handleChange("color", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Select
                  value={formData.material}
                  onValueChange={(v) => handleChange("material", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gloss">Gloss</SelectItem>
                    <SelectItem value="matte">Matte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size}
                  onValueChange={(v) => handleChange("size", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="WHT-GLS-STD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (inc. GST)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={(formData.priceInCents / 100).toFixed(2)}
                    onChange={(e) =>
                      handleChange("priceInCents", Math.round(parseFloat(e.target.value) * 100))
                    }
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleChange("stock", parseInt(e.target.value) || 0)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Alert</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={formData.lowStockThreshold}
                  onChange={(e) =>
                    handleChange("lowStockThreshold", parseInt(e.target.value) || 0)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holdingFee">Holding Fee (inc. GST)</Label>
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
                      handleChange(
                        "holdingFeeInCents",
                        Math.round(parseFloat(e.target.value) * 100)
                      )
                    }
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => handleChange("active", checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Variant" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
