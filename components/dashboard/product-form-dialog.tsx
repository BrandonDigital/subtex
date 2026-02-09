"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProduct,
  updateProduct,
  createBulkDiscount,
  updateBulkDiscount,
  deleteBulkDiscount,
} from "@/server/actions/admin";
import { toast } from "@/components/ui/toast";

interface BulkDiscount {
  id?: string;
  minQuantity: number;
  discountPercent: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface ProductFormData {
  id?: string;
  status: "draft" | "active";
  partNumber: string;
  name: string;
  description: string;
  basePriceInCents: number;
  imageUrl: string;
  // Dimensions
  width: string;
  height: string;
  depth: string;
  weight: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  bulkDiscounts: BulkDiscount[];
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Partial<ProductFormData>;
  mode: "create" | "edit";
}

const defaultProduct: ProductFormData = {
  status: "draft",
  partNumber: "",
  name: "",
  description: "",
  basePriceInCents: 0,
  imageUrl: "",
  width: "",
  height: "",
  depth: "",
  weight: "",
  metaTitle: "",
  metaDescription: "",
  bulkDiscounts: [],
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  mode,
}: ProductFormDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    ...defaultProduct,
    ...product,
  });

  // Reset form when dialog opens with new product data
  useEffect(() => {
    if (open) {
      setFormData({
        ...defaultProduct,
        ...product,
        bulkDiscounts: product?.bulkDiscounts || [],
      });
    }
  }, [open, product]);

  const handleChange = (
    field: keyof Omit<ProductFormData, "bulkDiscounts">,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addDiscount = () => {
    setFormData((prev) => ({
      ...prev,
      bulkDiscounts: [
        ...prev.bulkDiscounts,
        { minQuantity: 10, discountPercent: 5, isNew: true },
      ],
    }));
  };

  const updateDiscount = (
    index: number,
    field: "minQuantity" | "discountPercent",
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      bulkDiscounts: prev.bulkDiscounts.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      ),
    }));
  };

  const removeDiscount = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bulkDiscounts: prev.bulkDiscounts.map((d, i) =>
        i === index ? { ...d, isDeleted: true } : d
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let productId = formData.id;

      const productData = {
        status: formData.status,
        partNumber: formData.partNumber || null,
        name: formData.name,
        description: formData.description || null,
        basePriceInCents: formData.basePriceInCents,
        imageUrl: formData.imageUrl || null,
        width: formData.width || null,
        height: formData.height || null,
        depth: formData.depth || null,
        weight: formData.weight || null,
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
      };

      if (mode === "create") {
        const newProduct = await createProduct(productData);
        productId = newProduct.id;
      } else {
        await updateProduct(formData.id!, productData);
      }

      // Handle bulk discounts
      for (const discount of formData.bulkDiscounts) {
        if (discount.isDeleted && discount.id) {
          await deleteBulkDiscount(discount.id);
        } else if (discount.isNew && !discount.isDeleted) {
          await createBulkDiscount({
            productId: productId!,
            minQuantity: discount.minQuantity,
            discountPercent: discount.discountPercent,
            active: true,
          });
        } else if (discount.id && !discount.isDeleted) {
          await updateBulkDiscount(discount.id, {
            minQuantity: discount.minQuantity,
            discountPercent: discount.discountPercent,
          });
        }
      }

      toast.success(
        mode === "create"
          ? "Product created successfully"
          : "Product updated successfully"
      );
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setIsLoading(false);
    }
  };

  const visibleDiscounts = formData.bulkDiscounts.filter((d) => !d.isDeleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create New Product" : "Edit Product"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Add a new product to your catalog."
                : "Update the product details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "draft" | "active") =>
                  handleChange("status", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Part Number */}
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) => handleChange("partNumber", e.target.value)}
                placeholder="ACM-001"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="ACM Sheet"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="High-quality aluminium composite material..."
                rows={3}
              />
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <Separator className="my-2" />

            {/* Price Section */}
            <div className="space-y-3">
              <Label>Pricing</Label>
              
              {/* Base Price */}
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-xs text-muted-foreground">
                  Base Price (inc. GST)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={(formData.basePriceInCents / 100).toFixed(2)}
                    onChange={(e) =>
                      handleChange(
                        "basePriceInCents",
                        Math.round(parseFloat(e.target.value || "0") * 100)
                      )
                    }
                    className="pl-7"
                  />
                </div>
              </div>

              {/* Bulk Discounts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Bulk Discounts
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDiscount}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>

                {visibleDiscounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No bulk discounts configured.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.bulkDiscounts.map(
                      (discount, index) =>
                        !discount.isDeleted && (
                          <div
                            key={discount.id || `new-${index}`}
                            className="flex items-center gap-2"
                          >
                            <div className="flex-1">
                              <Input
                                type="number"
                                min="1"
                                value={discount.minQuantity}
                                onChange={(e) =>
                                  updateDiscount(
                                    index,
                                    "minQuantity",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                placeholder="Min qty"
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              + sheets =
                            </span>
                            <div className="w-20 relative">
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={discount.discountPercent}
                                onChange={(e) =>
                                  updateDiscount(
                                    index,
                                    "discountPercent",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                %
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              off
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeDiscount(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-2" />

            {/* Dimensions */}
            <div className="space-y-3">
              <Label>Dimensions</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-xs text-muted-foreground">
                    Width (mm)
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.width}
                    onChange={(e) => handleChange("width", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-xs text-muted-foreground">
                    Height (mm)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.height}
                    onChange={(e) => handleChange("height", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depth" className="text-xs text-muted-foreground">
                    Depth (mm)
                  </Label>
                  <Input
                    id="depth"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.depth}
                    onChange={(e) => handleChange("depth", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-xs text-muted-foreground">
                    Weight (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <Separator className="my-2" />

            {/* SEO Section */}
            <div className="space-y-3">
              <Label>SEO</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle" className="text-xs text-muted-foreground">
                    Meta Title
                  </Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => handleChange("metaTitle", e.target.value)}
                    placeholder="Page title for search engines"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription" className="text-xs text-muted-foreground">
                    Meta Description
                  </Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => handleChange("metaDescription", e.target.value)}
                    placeholder="Brief description for search engine results..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Product" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
