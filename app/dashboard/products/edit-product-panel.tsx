"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaLibrarySheet } from "@/components/media-library";
import { ImagePlus, X } from "lucide-react";
import {
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
  width: string;
  height: string;
  depth: string;
  weight: string;
  metaTitle: string;
  metaDescription: string;
  bulkDiscounts: BulkDiscount[];
}

interface EditProductPanelProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductFormData | null;
}

export function EditProductPanel({
  isOpen,
  onClose,
  product,
}: EditProductPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState<ProductFormData | null>(null);
  const [originalDiscounts, setOriginalDiscounts] = useState<BulkDiscount[]>(
    [],
  );
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Handle open/close animations and form data initialization
  useEffect(() => {
    if (isOpen && product) {
      setFormData(product);
      setOriginalDiscounts(product.bulkDiscounts.map((d) => ({ ...d })));
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [isOpen, product]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setFormData(null);
      onClose();
    }, 300);
  }, [onClose]);

  const handleChange = (
    field: keyof Omit<ProductFormData, "bulkDiscounts" | "id">,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const addDiscount = () => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            bulkDiscounts: [
              ...prev.bulkDiscounts,
              { minQuantity: 10, discountPercent: 5, isNew: true },
            ],
          }
        : prev,
    );
  };

  const updateDiscount = (
    index: number,
    field: "minQuantity" | "discountPercent",
    value: number,
  ) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            bulkDiscounts: prev.bulkDiscounts.map((d, i) =>
              i === index ? { ...d, [field]: value } : d,
            ),
          }
        : prev,
    );
  };

  const removeDiscount = (index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const discount = prev.bulkDiscounts[index];
      if (discount.id && !discount.isNew) {
        // Mark existing discount as deleted
        return {
          ...prev,
          bulkDiscounts: prev.bulkDiscounts.map((d, i) =>
            i === index ? { ...d, isDeleted: true } : d,
          ),
        };
      } else {
        // Remove new discount entirely
        return {
          ...prev,
          bulkDiscounts: prev.bulkDiscounts.filter((_, i) => i !== index),
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsLoading(true);

    try {
      const productData = {
        status: formData.status,
        partNumber: formData.partNumber || null,
        slug: formData.slug || null,
        name: formData.name,
        description: formData.description || null,
        basePriceInCents: formData.basePriceInCents,
        imageUrl: formData.imageUrl || null,
        isAcm: formData.isAcm,
        acmColor:
          formData.isAcm && formData.acmColor
            ? (formData.acmColor as "white" | "black")
            : null,
        acmMaterial:
          formData.isAcm && formData.acmMaterial
            ? (formData.acmMaterial as "gloss" | "matte")
            : null,
        acmSize:
          formData.isAcm && formData.acmSize
            ? (formData.acmSize as "standard" | "xl")
            : null,
        width: formData.width || null,
        height: formData.height || null,
        depth: formData.depth || null,
        weight: formData.weight || null,
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
      };

      await updateProduct(formData.id, productData);

      // Handle bulk discounts
      for (const discount of formData.bulkDiscounts) {
        if (discount.isDeleted && discount.id) {
          await deleteBulkDiscount(discount.id);
        } else if (discount.isNew && !discount.isDeleted) {
          await createBulkDiscount({
            productId: formData.id,
            minQuantity: discount.minQuantity,
            discountPercent: discount.discountPercent,
            active: true,
          });
        } else if (discount.id && !discount.isDeleted) {
          // Check if discount was modified
          const original = originalDiscounts.find((d) => d.id === discount.id);
          if (
            original &&
            (original.minQuantity !== discount.minQuantity ||
              original.discountPercent !== discount.discountPercent)
          ) {
            await updateBulkDiscount(discount.id, {
              minQuantity: discount.minQuantity,
              discountPercent: discount.discountPercent,
            });
          }
        }
      }

      toast.success("Product updated successfully");
      router.refresh();
      handleClose();
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible || !formData) return null;

  const visibleDiscounts = formData.bulkDiscounts.filter((d) => !d.isDeleted);

  return (
    <div
      className={`fixed top-16 bottom-0 left-0 right-0 z-40 bg-background transition-transform duration-300 ease-in-out ${
        isClosing ? "translate-x-full" : "translate-x-0"
      } ${!isClosing && isOpen ? "animate-in slide-in-from-right" : ""}`}
    >
      <div className='flex flex-col h-full'>
        {/* Header */}
        <div className='flex items-center gap-4 px-6 py-4 border-b bg-background'>
          <Button variant='ghost' size='icon' onClick={handleClose}>
            <ArrowLeft className='h-5 w-5' />
          </Button>
          <div>
            <h1 className='text-xl font-semibold'>Edit Product</h1>
            <p className='text-sm text-muted-foreground'>
              Update product details
            </p>
          </div>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className='flex flex-col flex-1 overflow-hidden'
        >
          <div className='flex-1 overflow-y-auto px-6 py-6'>
            <div className='max-w-2xl mx-auto space-y-6'>
              {/* Status */}
              <div className='space-y-2'>
                <Label htmlFor='status'>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "draft" | "active") =>
                    handleChange("status", value)
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='draft'>Draft</SelectItem>
                    <SelectItem value='active'>Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Part Number */}
              <div className='space-y-2'>
                <Label htmlFor='partNumber'>Part Number</Label>
                <Input
                  id='partNumber'
                  value={formData.partNumber}
                  onChange={(e) => handleChange("partNumber", e.target.value)}
                  placeholder='ACM-001'
                />
              </div>

              {/* Product Name */}
              <div className='space-y-2'>
                <Label htmlFor='name'>Product Name</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder='ACM Sheet'
                  required
                />
              </div>

              {/* Slug */}
              <div className='space-y-2'>
                <Label htmlFor='slug'>URL Slug</Label>
                <Input
                  id='slug'
                  value={formData.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  placeholder='acm-sheet'
                />
                <p className='text-xs text-muted-foreground'>
                  Used in the product URL: /products/{formData.slug || "slug"}
                </p>
              </div>

              {/* Description */}
              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <Textarea
                  id='description'
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder='High-quality aluminium composite material...'
                  rows={3}
                />
              </div>

              {/* Product Image */}
              <div className='space-y-3'>
                <Label>Product Image</Label>
                {formData.imageUrl ? (
                  <div className='relative group'>
                    <div className='relative aspect-video rounded-lg overflow-hidden border bg-muted'>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.imageUrl}
                        alt='Product image'
                        className='w-full h-full object-cover'
                      />
                      <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                        <Button
                          type='button'
                          variant='secondary'
                          size='sm'
                          onClick={() => setShowMediaLibrary(true)}
                        >
                          Change
                        </Button>
                        <Button
                          type='button'
                          variant='destructive'
                          size='sm'
                          onClick={() => handleChange("imageUrl", "")}
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => setShowMediaLibrary(true)}
                    className='w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-muted-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  >
                    <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                      <ImagePlus className='h-10 w-10' />
                      <span className='text-sm font-medium'>Select Image</span>
                      <span className='text-xs'>
                        Click to open media library
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <MediaLibrarySheet
                open={showMediaLibrary}
                onOpenChange={setShowMediaLibrary}
                onSelect={(assets) => {
                  if (assets.length > 0) {
                    handleChange("imageUrl", assets[0].secure_url);
                  }
                }}
                folder='products'
                multiple={false}
              />

              <Separator />

              {/* ACM Product Configuration */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='isAcm' className='text-base'>
                      ACM Product
                    </Label>
                    <p className='text-sm text-muted-foreground'>
                      Enable to configure colour, material, and size for this
                      ACM product
                    </p>
                  </div>
                  <Switch
                    id='isAcm'
                    checked={formData.isAcm}
                    onCheckedChange={(checked) =>
                      handleChange("isAcm", checked)
                    }
                  />
                </div>

                {formData.isAcm && (
                  <div className='space-y-4'>
                    {/* Colour */}
                    <div className='space-y-2'>
                      <Label htmlFor='acmColor'>Colour</Label>
                      <Select
                        value={formData.acmColor}
                        onValueChange={(value) =>
                          handleChange("acmColor", value)
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select colour' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='white'>White</SelectItem>
                          <SelectItem value='black'>Black</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Material */}
                    <div className='space-y-2'>
                      <Label htmlFor='acmMaterial'>Material</Label>
                      <Select
                        value={formData.acmMaterial}
                        onValueChange={(value) =>
                          handleChange("acmMaterial", value)
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select material' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='gloss'>Gloss</SelectItem>
                          <SelectItem value='matte'>Matte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Size */}
                    <div className='space-y-2'>
                      <Label htmlFor='acmSize'>Size</Label>
                      <Select
                        value={formData.acmSize}
                        onValueChange={(value) =>
                          handleChange("acmSize", value)
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select size' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='standard'>
                            Standard (2440 × 1220mm)
                          </SelectItem>
                          <SelectItem value='xl'>XL (3050 × 1500mm)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Price Section */}
              <div className='space-y-4'>
                <Label className='text-base'>Pricing</Label>

                {/* Base Price */}
                <div className='space-y-2'>
                  <Label
                    htmlFor='basePrice'
                    className='text-sm text-muted-foreground'
                  >
                    Base Price (inc. GST)
                  </Label>
                  <div className='relative'>
                    <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                      $
                    </span>
                    <Input
                      id='basePrice'
                      type='number'
                      step='0.01'
                      min='0'
                      value={(formData.basePriceInCents / 100).toFixed(2)}
                      onChange={(e) =>
                        handleChange(
                          "basePriceInCents",
                          Math.round(parseFloat(e.target.value || "0") * 100),
                        )
                      }
                      className='pl-7'
                    />
                  </div>
                </div>

                {/* Bulk Discounts */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-sm text-muted-foreground'>
                      Bulk Discounts
                    </Label>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={addDiscount}
                    >
                      <Plus className='h-4 w-4 mr-1' />
                      Add
                    </Button>
                  </div>

                  {visibleDiscounts.length === 0 ? (
                    <p className='text-sm text-muted-foreground py-2'>
                      No bulk discounts configured.
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {formData.bulkDiscounts.map((discount, index) => {
                        if (discount.isDeleted) return null;
                        return (
                          <div
                            key={discount.id || `new-${index}`}
                            className='flex items-center gap-2'
                          >
                            <div className='flex-1'>
                              <Input
                                type='number'
                                min='1'
                                value={discount.minQuantity}
                                onChange={(e) =>
                                  updateDiscount(
                                    index,
                                    "minQuantity",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                placeholder='Min qty'
                              />
                            </div>
                            <span className='text-sm text-muted-foreground'>
                              + sheets =
                            </span>
                            <div className='w-20 relative'>
                              <Input
                                type='number'
                                min='1'
                                max='100'
                                value={discount.discountPercent}
                                onChange={(e) =>
                                  updateDiscount(
                                    index,
                                    "discountPercent",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                              />
                              <span className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm'>
                                %
                              </span>
                            </div>
                            <span className='text-sm text-muted-foreground'>
                              off
                            </span>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 text-destructive'
                              onClick={() => removeDiscount(index)}
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Dimensions */}
              <div className='space-y-4'>
                <Label className='text-base'>Dimensions</Label>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='width'
                      className='text-sm text-muted-foreground'
                    >
                      Width (mm)
                    </Label>
                    <Input
                      id='width'
                      type='number'
                      step='0.01'
                      min='0'
                      value={formData.width}
                      onChange={(e) => handleChange("width", e.target.value)}
                      placeholder='0'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='height'
                      className='text-sm text-muted-foreground'
                    >
                      Height (mm)
                    </Label>
                    <Input
                      id='height'
                      type='number'
                      step='0.01'
                      min='0'
                      value={formData.height}
                      onChange={(e) => handleChange("height", e.target.value)}
                      placeholder='0'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='depth'
                      className='text-sm text-muted-foreground'
                    >
                      Depth (mm)
                    </Label>
                    <Input
                      id='depth'
                      type='number'
                      step='0.01'
                      min='0'
                      value={formData.depth}
                      onChange={(e) => handleChange("depth", e.target.value)}
                      placeholder='0'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='weight'
                      className='text-sm text-muted-foreground'
                    >
                      Weight (kg)
                    </Label>
                    <Input
                      id='weight'
                      type='number'
                      step='0.01'
                      min='0'
                      value={formData.weight}
                      onChange={(e) => handleChange("weight", e.target.value)}
                      placeholder='0'
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* SEO Section */}
              <div className='space-y-4'>
                <Label className='text-base'>SEO</Label>
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='metaTitle'
                      className='text-sm text-muted-foreground'
                    >
                      Meta Title
                    </Label>
                    <Input
                      id='metaTitle'
                      value={formData.metaTitle}
                      onChange={(e) =>
                        handleChange("metaTitle", e.target.value)
                      }
                      placeholder='Page title for search engines'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label
                      htmlFor='metaDescription'
                      className='text-sm text-muted-foreground'
                    >
                      Meta Description
                    </Label>
                    <Textarea
                      id='metaDescription'
                      value={formData.metaDescription}
                      onChange={(e) =>
                        handleChange("metaDescription", e.target.value)
                      }
                      placeholder='Brief description for search engine results...'
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='border-t bg-background'>
            <div className='max-w-2xl mx-auto flex items-center justify-end gap-3 px-6 py-4'>
              <Button type='button' variant='outline' onClick={handleClose}>
                Cancel
              </Button>
              <Button type='submit' disabled={isLoading || !formData.name}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
