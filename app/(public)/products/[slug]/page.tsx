import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { Package, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductBySlug, getActiveProducts } from "@/server/actions/products";
import { isSubscribedToStock } from "@/server/actions/stock-subscriptions";
import { auth } from "@/server/auth";
import { AddToCartSection } from "./add-to-cart-section";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Subtex",
    };
  }

  return {
    title: product.metaTitle || `${product.name} | Subtex`,
    description:
      product.metaDescription ||
      product.description ||
      `Buy ${product.name} from Subtex. Quality building materials in Perth, WA.`,
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.description || undefined,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products
    .filter((p) => p.slug)
    .map((product) => ({
      slug: product.slug!,
    }));
}

function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceInCents / 100);
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    getProductBySlug(slug),
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!product) {
    notFound();
  }

  // Check if user is subscribed to stock notifications
  const isSubscribed = await isSubscribedToStock(product.id);

  return (
    <main>
      {/* Breadcrumb */}
      <div className='bg-muted/50'>
        <div className='container mx-auto px-4 py-4'>
          <nav className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Link
              href='/products'
              className='hover:text-foreground transition-colors'
            >
              Products
            </Link>
            <span>/</span>
            <span className='text-foreground'>{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Content */}
      <section className='py-8 md:py-12'>
        <div className='container mx-auto px-4'>
          <div className='flex flex-col lg:flex-row gap-8'>
            {/* Image */}
            <div className='w-full lg:w-1/2'>
              <div className='sticky top-24'>
                <div className='relative aspect-square rounded-lg overflow-hidden bg-muted'>
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
                </div>
              </div>
            </div>

            {/* Details */}
            <div className='w-full lg:w-1/2 space-y-6'>
              <div>
                <h1 className='text-3xl md:text-4xl font-bold mb-2'>
                  {product.name}
                </h1>
                {product.partNumber && (
                  <p className='text-muted-foreground'>
                    Part Number: {product.partNumber}
                  </p>
                )}
              </div>

              <div className='flex items-center gap-4'>
                <p className='text-3xl font-bold'>
                  {formatPrice(product.basePriceInCents)}
                </p>
                <Badge variant='secondary'>Inc. GST</Badge>
              </div>

              {/* ACM Configuration Display */}
              {product.isAcm &&
                (product.acmColor ||
                  product.acmMaterial ||
                  product.acmSize) && (
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

              {product.description && (
                <p className='text-muted-foreground'>{product.description}</p>
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
                product.weight) && (
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg flex items-center gap-2'>
                      <Ruler className='h-5 w-5' />
                      Specifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className='grid grid-cols-2 gap-4 text-sm'>
                      {product.width && (
                        <div>
                          <dt className='text-muted-foreground'>Width</dt>
                          <dd className='font-medium'>{product.width}mm</dd>
                        </div>
                      )}
                      {product.height && (
                        <div>
                          <dt className='text-muted-foreground'>Height</dt>
                          <dd className='font-medium'>{product.height}mm</dd>
                        </div>
                      )}
                      {product.depth && (
                        <div>
                          <dt className='text-muted-foreground'>Depth</dt>
                          <dd className='font-medium'>{product.depth}mm</dd>
                        </div>
                      )}
                      {product.weight && (
                        <div>
                          <dt className='text-muted-foreground'>Weight</dt>
                          <dd className='font-medium'>{product.weight}kg</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              )}

              {/* Add to Cart Section */}
              <AddToCartSection
                productId={product.id}
                productName={product.name}
                partNumber={product.partNumber}
                priceInCents={product.basePriceInCents}
                imageUrl={product.imageUrl}
                stock={product.stock}
                color={product.acmColor}
                material={product.acmMaterial}
                size={product.acmSize}
                bulkDiscounts={product.bulkDiscounts.map((d) => ({
                  id: d.id,
                  minQuantity: d.minQuantity,
                  discountPercent: d.discountPercent,
                }))}
                isSubscribedToStock={isSubscribed}
                userEmail={session?.user?.email}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
