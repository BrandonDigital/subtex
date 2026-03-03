"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Package, Ruler, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditable } from "@/components/inline-editable";
import { MediaLibrarySheet } from "@/components/media-library";
import { updateProductFieldInline } from "@/server/actions/admin";
import { toast } from "sonner";

interface ProductData {
  id: string;
  name: string;
  partNumber: string | null;
  description: string | null;
  basePriceInCents: number;
  imageUrl: string | null;
  isAcm: boolean;
  acmColor: string | null;
  acmMaterial: string | null;
  acmSize: string | null;
  stock: number;
  lowStockThreshold: number;
  width: string | null;
  height: string | null;
  depth: string | null;
  weight: string | null;
}

interface ProductDetailClientProps {
  product: ProductData;
  isAdmin: boolean;
  children: React.ReactNode; // AddToCartSection
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function ProductDetailClient({
  product,
  isAdmin,
  children,
}: ProductDetailClientProps) {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(product.acmColor === "black" ? "dark" : "light");
    return () => setTheme("light");
  }, [product.acmColor, setTheme]);

  const handleSave = useCallback(
    async (productId: string, field: string, value: string) => {
      await updateProductFieldInline(productId, field, value);
    },
    [],
  );

  const handleImageSelect = useCallback(
    async (assets: { secure_url: string }[]) => {
      if (assets.length === 0) return;
      setIsSavingImage(true);
      try {
        await updateProductFieldInline(
          product.id,
          "imageUrl",
          assets[0].secure_url,
        );
        toast.success("Product image updated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update image",
        );
      } finally {
        setIsSavingImage(false);
      }
    },
    [product.id],
  );

  return (
    <div className='flex flex-col lg:flex-row gap-8'>
      {/* Image */}
      <div className='w-full lg:w-1/2'>
        <div className='sticky top-24'>
          <div
            className={`relative aspect-square overflow-hidden bg-muted${isAdmin ? " group/image cursor-pointer" : ""}`}
            onDoubleClick={
              isAdmin ? () => setShowMediaLibrary(true) : undefined
            }
            title={isAdmin ? "Double-click to change image" : undefined}
          >
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className='object-cover'
                priority
                sizes='(max-width: 1024px) 100vw, 50vw'
              />
            ) : (
              <div className='absolute inset-0 flex items-center justify-center text-muted-foreground'>
                <Package className='h-24 w-24' />
              </div>
            )}
            {product.isAcm && (
              <Badge className='absolute top-4 left-4 bg-primary text-primary-foreground'>
                ACM Panel
              </Badge>
            )}
            {isAdmin && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover/image:bg-black/40 transition-colors'>
                <div className='flex flex-col items-center gap-2 opacity-0 group-hover/image:opacity-100 transition-opacity text-white'>
                  <Camera className='h-8 w-8' />
                  <span className='text-sm font-medium'>
                    Double-click to change
                  </span>
                </div>
              </div>
            )}
            {isSavingImage && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                <div className='flex flex-col items-center gap-2 text-white'>
                  <div className='h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  <span className='text-sm font-medium'>Updating...</span>
                </div>
              </div>
            )}
          </div>
          {isAdmin && (
            <MediaLibrarySheet
              open={showMediaLibrary}
              onOpenChange={setShowMediaLibrary}
              onSelect={handleImageSelect}
              folder='products'
              multiple={false}
            />
          )}
        </div>
      </div>

      {/* Details */}
      <div className='w-full lg:w-1/2 space-y-6'>
        <div>
          <h1 className='text-3xl md:text-4xl font-bold mb-2'>
            <InlineEditable
              value={product.name}
              fieldName='name'
              fieldType='text'
              productId={product.id}
              onSave={handleSave}
              isAdmin={isAdmin}
              placeholder='Product name'
            >
              {product.name}
            </InlineEditable>
          </h1>

          {(product.partNumber || isAdmin) && (
            <p className='text-muted-foreground'>
              Part Number:{" "}
              <InlineEditable
                value={product.partNumber}
                fieldName='partNumber'
                fieldType='text'
                productId={product.id}
                onSave={handleSave}
                isAdmin={isAdmin}
                placeholder='Part number'
              >
                {product.partNumber || (
                  <span className='italic text-muted-foreground/50'>
                    Not set
                  </span>
                )}
              </InlineEditable>
            </p>
          )}
        </div>

        <div className='flex items-center gap-4'>
          <p className='text-3xl font-bold'>
            <InlineEditable
              value={product.basePriceInCents}
              fieldName='basePriceInCents'
              fieldType='price'
              productId={product.id}
              onSave={handleSave}
              isAdmin={isAdmin}
              placeholder='0.00'
              prefix='$'
            >
              {formatPrice(product.basePriceInCents)}
            </InlineEditable>
          </p>
          <Badge variant='secondary'>Inc. GST</Badge>
        </div>

        {/* ACM Configuration Display */}
        {product.isAcm &&
          (product.acmColor || product.acmMaterial || product.acmSize) && (
            <div className='flex flex-wrap gap-2'>
              {product.acmColor && (
                <Badge variant='outline' className='capitalize'>
                  {product.acmColor}
                </Badge>
              )}
              {product.acmMaterial && (
                <Badge variant='outline' className='capitalize'>
                  {product.acmMaterial}
                </Badge>
              )}
              {product.acmSize && (
                <Badge variant='outline' className='capitalize'>
                  {product.acmSize === "standard"
                    ? "Standard (2440 × 1220mm)"
                    : "XL (3050 × 1500mm)"}
                </Badge>
              )}
            </div>
          )}

        {(product.description || isAdmin) && (
          <p className='text-muted-foreground'>
            <InlineEditable
              value={product.description}
              fieldName='description'
              fieldType='textarea'
              productId={product.id}
              onSave={handleSave}
              isAdmin={isAdmin}
              placeholder='Add a product description...'
            >
              {product.description || (
                <span className='text-muted-foreground/50 italic'>
                  No description — double-click to add
                </span>
              )}
            </InlineEditable>
          </p>
        )}

        {/* Stock Status */}
        <div>
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
                ? `Low Stock - ${product.stock} left`
                : `${product.stock} in stock`}
          </Badge>
        </div>

        {/* Dimensions */}
        {(product.width ||
          product.height ||
          product.depth ||
          product.weight ||
          isAdmin) && (
          <Card>
            <CardHeader>
              <CardTitle className='text-lg flex items-center gap-2'>
                <Ruler className='h-5 w-5' />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className='grid grid-cols-2 gap-4 text-sm'>
                {(product.width || isAdmin) && (
                  <div>
                    <dt className='text-muted-foreground'>Width</dt>
                    <dd className='font-medium'>
                      <InlineEditable
                        value={product.width}
                        fieldName='width'
                        fieldType='number'
                        productId={product.id}
                        onSave={handleSave}
                        isAdmin={isAdmin}
                        placeholder='0'
                        suffix='mm'
                      >
                        <span>
                          {product.width ? (
                            `${product.width}mm`
                          ) : (
                            <span className='italic text-muted-foreground/50'>
                              Not set
                            </span>
                          )}
                        </span>
                      </InlineEditable>
                    </dd>
                  </div>
                )}
                {(product.height || isAdmin) && (
                  <div>
                    <dt className='text-muted-foreground'>Height</dt>
                    <dd className='font-medium'>
                      <InlineEditable
                        value={product.height}
                        fieldName='height'
                        fieldType='number'
                        productId={product.id}
                        onSave={handleSave}
                        isAdmin={isAdmin}
                        placeholder='0'
                        suffix='mm'
                      >
                        <span>
                          {product.height ? (
                            `${product.height}mm`
                          ) : (
                            <span className='italic text-muted-foreground/50'>
                              Not set
                            </span>
                          )}
                        </span>
                      </InlineEditable>
                    </dd>
                  </div>
                )}
                {(product.depth || isAdmin) && (
                  <div>
                    <dt className='text-muted-foreground'>Depth</dt>
                    <dd className='font-medium'>
                      <InlineEditable
                        value={product.depth}
                        fieldName='depth'
                        fieldType='number'
                        productId={product.id}
                        onSave={handleSave}
                        isAdmin={isAdmin}
                        placeholder='0'
                        suffix='mm'
                      >
                        <span>
                          {product.depth ? (
                            `${product.depth}mm`
                          ) : (
                            <span className='italic text-muted-foreground/50'>
                              Not set
                            </span>
                          )}
                        </span>
                      </InlineEditable>
                    </dd>
                  </div>
                )}
                {(product.weight || isAdmin) && (
                  <div>
                    <dt className='text-muted-foreground'>Weight</dt>
                    <dd className='font-medium'>
                      <InlineEditable
                        value={product.weight}
                        fieldName='weight'
                        fieldType='number'
                        productId={product.id}
                        onSave={handleSave}
                        isAdmin={isAdmin}
                        placeholder='0'
                        suffix='kg'
                      >
                        <span>
                          {product.weight ? (
                            `${product.weight}kg`
                          ) : (
                            <span className='italic text-muted-foreground/50'>
                              Not set
                            </span>
                          )}
                        </span>
                      </InlineEditable>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Add to Cart Section */}
        {children}
      </div>
    </div>
  );
}
