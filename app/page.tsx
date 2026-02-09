import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { ProductConfiguratorWrapper } from "@/components/product-configurator-wrapper";
import { AcmInfoSection } from "@/components/acm-info-section";
import { FaqSection } from "@/components/faq-section";
import { PromoScrollSentinel } from "@/components/promo-dialog";
import { getAcmProducts } from "@/server/actions/products";
import { siteConfig, seoContent, acmFAQs, generateFAQSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: seoContent.homepage.title,
  description: seoContent.homepage.description,
  keywords: seoContent.homepage.keywords,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: seoContent.homepage.title,
    description: seoContent.homepage.description,
    url: siteConfig.url,
    type: "website",
    images: [
      {
        url: "/Subtex_ACM_Stack.png",
        width: 1200,
        height: 630,
        alt: "Subtex ACM Sheets - Premium Aluminium Composite Panels Perth",
      },
    ],
  },
};

// JSON-LD Component
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function HomePage() {
  // Fetch ACM products from database
  const acmProductsData = await getAcmProducts();

  // Transform ACM products for the configurator
  const acmProducts = acmProductsData
    .filter((p) => p.acmColor && p.acmSize)
    .map((p) => ({
      id: p.id,
      acmColor: p.acmColor,
      acmSize: p.acmSize,
      name: p.name,
      basePriceInCents: p.basePriceInCents,
      imageUrl: p.imageUrl,
      partNumber: p.partNumber,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      bulkDiscounts: p.bulkDiscounts?.map((d) => ({
        minQuantity: d.minQuantity,
        discountPercent: d.discountPercent,
      })),
    }));

  // Generate structured data
  const faqSchema = generateFAQSchema(acmFAQs);

  // Product schema for the main product offering
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "ACM Sheets - Aluminium Composite Panels",
    description:
      "Premium aluminium composite material (ACM) sheets for signage, trailer alignment, caravan panels, and kitchen splashboards. Available in white and black, gloss and matte finishes. Note: PE core ACM is not fireproof and not suitable for building cladding.",
    image: `${siteConfig.url}/Subtex_ACM_Stack.png`,
    brand: {
      "@type": "Brand",
      name: "Subtex",
    },
    manufacturer: {
      "@type": "Organization",
      name: "Subtex",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "AUD",
      lowPrice:
        acmProducts.length > 0
          ? Math.min(...acmProducts.map((p) => p.basePriceInCents)) / 100
          : 65,
      highPrice:
        acmProducts.length > 0
          ? Math.max(...acmProducts.map((p) => p.basePriceInCents)) / 100
          : 125,
      offerCount: acmProducts.length || 8,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Subtex",
      },
    },
    category: "Building Materials > Signage > Composite Panels",
    material: "Aluminium Composite Material",
    color: ["White", "Black"],
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Finish",
        value: "Gloss, Matte",
      },
      {
        "@type": "PropertyValue",
        name: "Size",
        value: "Standard (1220x2440mm), XL",
      },
    ],
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <JsonLd data={faqSchema} />
      <JsonLd data={productSchema} />

      <Hero />

      {/* Promo scroll trigger - fires when user scrolls past this point */}
      <PromoScrollSentinel />

      {/* SEO-friendly heading structure */}
      <section className='sr-only'>
        <h1>ACM Sheets Perth - Aluminium Composite Panels Supplier</h1>
        <p>
          Subtex is Perth&apos;s trusted local supplier of premium ACM
          (Aluminium Composite Material) sheets. We offer high-quality aluminium
          composite panels for signage, trailer alignment, caravan panels, and
          kitchen splashboards across Western Australia. Available in white and
          black colours with gloss and matte finishes. Note: Our ACM sheets are
          not fireproof and cannot be used as building cladding.
        </p>
      </section>

      <ProductConfiguratorWrapper acmProducts={acmProducts} />

      <AcmInfoSection />

      {/* FAQ Section for SEO */}
      <FaqSection faqs={acmFAQs.slice(0, 6)} />
    </>
  );
}
