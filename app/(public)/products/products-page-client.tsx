"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Filter,
  X,
  ShoppingCart,
  Plus,
  Minus,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { useIsMobile } from "@/hooks/use-mobile";

interface BulkDiscount {
  id: string;
  minQuantity: number;
  discountPercent: number;
}

interface Product {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  basePriceInCents: number;
  imageUrl: string | null;
  isAcm: boolean;
  partNumber: string | null;
  acmColor: string | null;
  acmMaterial: string | null;
  acmSize: string | null;
  stock: number;
  lowStockThreshold: number;
  bulkDiscounts: BulkDiscount[];
}

interface ProductsPageClientProps {
  products: Product[];
}

type SortOption = "newest" | "price-low" | "price-high" | "name";

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export function ProductsPageClient({ products }: ProductsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showAcmOnly, setShowAcmOnly] = useState(false);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.partNumber?.toLowerCase().includes(query)
      );
    }

    // ACM filter
    if (showAcmOnly) {
      result = result.filter((p) => p.isAcm);
    }

    // In stock filter
    if (showInStockOnly) {
      result = result.filter((p) => p.stock > 0);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.basePriceInCents - b.basePriceInCents);
        break;
      case "price-high":
        result.sort((a, b) => b.basePriceInCents - a.basePriceInCents);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
      default:
        // Already sorted by newest from server
        break;
    }

    return result;
  }, [products, searchQuery, sortBy, showAcmOnly, showInStockOnly]);

  const clearFilters = () => {
    setSearchQuery("");
    setShowAcmOnly(false);
    setShowInStockOnly(false);
    setSortBy("newest");
  };

  const hasActiveFilters = searchQuery || showAcmOnly || showInStockOnly;

  const FilterContent = () => (
    <div className='space-y-6'>
      <div>
        <h3 className='font-medium mb-3'>Product Type</h3>
        <div className='flex items-center space-x-2'>
          <Checkbox
            id='acm-only'
            checked={showAcmOnly}
            onCheckedChange={(checked) => setShowAcmOnly(checked === true)}
          />
          <Label htmlFor='acm-only' className='cursor-pointer'>
            ACM Products Only
          </Label>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className='font-medium mb-3'>Availability</h3>
        <div className='flex items-center space-x-2'>
          <Checkbox
            id='in-stock'
            checked={showInStockOnly}
            onCheckedChange={(checked) => setShowInStockOnly(checked === true)}
          />
          <Label htmlFor='in-stock' className='cursor-pointer'>
            In Stock Only
          </Label>
        </div>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant='outline' className='w-full' onClick={clearFilters}>
            <X className='h-4 w-4 mr-2' />
            Clear Filters
          </Button>
        </>
      )}
    </div>
  );

  return (
    <section className='pt-4 pb-8 md:pt-6 md:pb-12'>
      <div className='container mx-auto px-4'>
        {/* Search and Filters Bar */}
        <div className='flex flex-col md:flex-row gap-4 mb-8'>
          {/* Search */}
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search products...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
            {searchQuery && (
              <Button
                variant='ghost'
                size='sm'
                className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0'
                onClick={() => setSearchQuery("")}
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className='w-full md:w-[180px]'>
              <SelectValue placeholder='Sort by' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='newest'>Newest</SelectItem>
              <SelectItem value='price-low'>Price: Low to High</SelectItem>
              <SelectItem value='price-high'>Price: High to Low</SelectItem>
              <SelectItem value='name'>Name</SelectItem>
            </SelectContent>
          </Select>

          {/* Mobile Filters Button */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant='outline' className='md:hidden'>
                <Filter className='h-4 w-4 mr-2' />
                Filters
                {hasActiveFilters && (
                  <Badge variant='secondary' className='ml-2'>
                    Active
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            {isMobile ? (
              <SheetContent
                side='right'
                hideOverlay
                className='h-[calc(100dvh-65px)] w-full flex flex-col p-0 [&>button]:hidden top-0 bottom-auto shadow-none'
              >
                {/* Header with back button */}
                <div className='flex items-center border-b px-2 py-3 relative'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => setMobileFiltersOpen(false)}
                  >
                    <ChevronLeft className='h-5 w-5' />
                    <span className='sr-only'>Back</span>
                  </Button>
                  <h1 className='absolute left-1/2 -translate-x-1/2 font-semibold text-base'>
                    Filters
                  </h1>
                </div>
                <SheetHeader className='sr-only'>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className='flex-1 overflow-y-auto px-6 py-4'>
                  <FilterContent />
                </div>
              </SheetContent>
            ) : (
              <SheetContent side='right'>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className='mt-6'>
                  <FilterContent />
                </div>
              </SheetContent>
            )}
          </Sheet>
        </div>

        <div className='flex gap-8'>
          {/* Desktop Sidebar Filters */}
          <aside className='hidden md:block w-64 shrink-0'>
            <div className='sticky top-24 rounded-lg border p-4'>
              <h2 className='font-semibold mb-4'>Filters</h2>
              <FilterContent />
            </div>
          </aside>

          {/* Products Grid */}
          <div className='flex-1'>
            {/* Results count */}
            <p className='text-sm text-muted-foreground mb-4'>
              {filteredProducts.length} product
              {filteredProducts.length !== 1 ? "s" : ""} found
            </p>

            {filteredProducts.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-muted-foreground mb-4'>
                  No products found matching your criteria.
                </p>
                <Button variant='outline' onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const { items, addItem } = useCart();

  const isOutOfStock = product.stock === 0;
  const productUrl = `/products/${
    product.slug || product.partNumber || product.id
  }`;

  // Calculate total quantity of this product in cart
  const cartQuantityForProduct = useMemo(() => {
    const cartItem = items.find((item) => item.productId === product.id);
    return cartItem?.quantity || 0;
  }, [items, product.id]);

  // Check if bulk discount applies based on cart + current quantity
  const applicableBulkDiscount = useMemo(() => {
    if (product.bulkDiscounts.length === 0) return null;

    const totalQty = cartQuantityForProduct + quantity;
    const sortedDiscounts = [...product.bulkDiscounts].sort(
      (a, b) => b.minQuantity - a.minQuantity
    );

    return sortedDiscounts.find((d) => totalQty >= d.minQuantity) || null;
  }, [product.bulkDiscounts, cartQuantityForProduct, quantity]);

  const handleAddToCart = () => {
    const bulkDiscountsForCart = product.bulkDiscounts.map((d) => ({
      minQuantity: d.minQuantity,
      discountPercent: d.discountPercent,
    }));

    addItem({
      productId: product.id,
      partNumber: product.partNumber || product.id,
      productName: product.name,
      color: product.acmColor || undefined,
      material: product.acmMaterial || undefined,
      size: product.acmSize || undefined,
      priceInCents: product.basePriceInCents,
      basePriceInCents: product.basePriceInCents,
      imageUrl: product.imageUrl || undefined,
      quantity,
      bulkDiscounts: bulkDiscountsForCart,
    });
    setQuantity(1);
  };

  return (
    <Card className='group overflow-hidden flex flex-col py-0 gap-2'>
      <CardHeader className='p-0'>
        <Link href={productUrl}>
          <div className='relative aspect-4/3 bg-muted overflow-hidden'>
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className='object-cover transition-transform group-hover:scale-105'
                sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
              />
            ) : (
              <div className='absolute inset-0 flex items-center justify-center text-muted-foreground'>
                <ShoppingCart className='h-12 w-12' />
              </div>
            )}
            {product.isAcm && (
              <Badge className='absolute top-2 left-2'>ACM</Badge>
            )}
            {isOutOfStock && (
              <Badge variant='destructive' className='absolute top-2 right-2'>
                Out of Stock
              </Badge>
            )}
          </div>
        </Link>
      </CardHeader>

      <CardContent className='flex-1 px-4 py-0'>
        <Link href={productUrl}>
          <h3 className='font-semibold text-lg mb-1 group-hover:text-primary transition-colors'>
            {product.name}
          </h3>
        </Link>
        {product.partNumber && (
          <p className='text-xs text-muted-foreground'>
            Part #: {product.partNumber}
          </p>
        )}
      </CardContent>

      <CardFooter className='p-4 pt-0 flex flex-col gap-3'>
        <div className='w-full'>
          {applicableBulkDiscount ? (
            <>
              <Badge
                variant='secondary'
                className='bg-green-100 text-green-800 border-green-200 mb-1'
              >
                {applicableBulkDiscount.discountPercent}% off
              </Badge>
              <div className='flex items-center gap-2'>
                <p className='text-lg font-bold text-green-600'>
                  {formatPrice(
                    Math.round(
                      product.basePriceInCents *
                        (1 - applicableBulkDiscount.discountPercent / 100)
                    )
                  )}
                </p>
                <p className='text-sm text-muted-foreground line-through'>
                  {formatPrice(product.basePriceInCents)}
                </p>
              </div>
              <p className='text-xs text-muted-foreground'>
                {cartQuantityForProduct} in cart
              </p>
            </>
          ) : (
            <>
              <p className='text-lg font-bold'>
                {formatPrice(product.basePriceInCents)}
              </p>
              {product.bulkDiscounts.length > 0 && (
                <p className='text-xs text-muted-foreground'>
                  Bulk discounts available
                </p>
              )}
            </>
          )}
        </div>

        {!isOutOfStock && (
          <div className='flex flex-col gap-2 w-full'>
            {/* Quantity Controls */}
            <div className='flex items-center justify-between border rounded-md'>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 rounded-l-md rounded-r-none'
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className='h-3 w-3' />
              </Button>
              <span className='flex-1 text-center text-sm font-medium'>
                {quantity}
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 rounded-r-md rounded-l-none'
                onClick={() => setQuantity(quantity + 1)}
                disabled={quantity >= product.stock}
              >
                <Plus className='h-3 w-3' />
              </Button>
            </div>

            {/* Add to Cart Button */}
            <Button size='sm' className='w-full' onClick={handleAddToCart}>
              <ShoppingCart className='h-4 w-4 mr-1' />
              Add to Cart
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
