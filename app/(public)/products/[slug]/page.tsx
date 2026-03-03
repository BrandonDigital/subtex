import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getProductBySlug, getActiveProducts } from "@/server/actions/products";
import { isSubscribedToStock } from "@/server/actions/stock-subscriptions";
import { auth } from "@/server/auth";
import { AddToCartSection } from "./add-to-cart-section";
import { ProductDetailClient } from "./product-detail-client";

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

  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  return (
    <main>
      {/* Breadcrumb */}
      <div className='bg-muted/50'>
        <div className='w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4'>
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
        <div className='w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8'>
          <ProductDetailClient
            product={{
              id: product.id,
              name: product.name,
              partNumber: product.partNumber,
              description: product.description,
              basePriceInCents: product.basePriceInCents,
              imageUrl: product.imageUrl,
              isAcm: product.isAcm,
              acmColor: product.acmColor,
              acmMaterial: product.acmMaterial,
              acmSize: product.acmSize,
              stock: product.stock,
              lowStockThreshold: product.lowStockThreshold,
              width: product.width,
              height: product.height,
              depth: product.depth,
              weight: product.weight,
            }}
            isAdmin={isAdmin}
          >
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
              isAcm={product.isAcm}
              sheetWidthMm={
                product.width ? parseFloat(product.width) : undefined
              }
              sheetHeightMm={
                product.height ? parseFloat(product.height) : undefined
              }
              bulkDiscounts={product.bulkDiscounts.map((d) => ({
                id: d.id,
                minQuantity: d.minQuantity,
                discountPercent: d.discountPercent,
              }))}
              isSubscribedToStock={isSubscribed}
              userEmail={session?.user?.email}
            />
          </ProductDetailClient>
        </div>
      </section>
    </main>
  );
}
