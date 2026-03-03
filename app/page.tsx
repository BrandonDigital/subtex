import type { Metadata } from "next";
import Script from "next/script";
import { Hero } from "./_components/hero";
import { BentoGrid } from "./_components/bento-grid";
import { ProductConfiguratorWrapper } from "@/components/product-configurator-wrapper";
import { AcmInfoSection } from "./_components/acm-info-section";
import { FaqSection } from "./_components/faq-section";
import { ServicesSection } from "./_components/services-section";
import { FeaturesApplicationsSection } from "./_components/features-applications-section";
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

function JsonLd({ id, data }: { id: string; data: object }) {
  return (
    <Script
      id={id}
      type='application/ld+json'
      strategy='afterInteractive'
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
    name: "ACM Sheets - Wholesale Aluminium Composite Panels Perth",
    description:
      "Perth's best price quality ACM sheets at wholesale prices. Premium aluminium composite panels for signage, trailers, caravans, and splashbacks. Cut-to-size service and local delivery available. White and black, gloss and matte finishes. Note: PE core ACM is not fireproof and not suitable for building cladding.",
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
      <JsonLd id='schema-homepage-faq' data={faqSchema} />
      <JsonLd id='schema-homepage-product' data={productSchema} />

      <ProductConfiguratorWrapper acmProducts={acmProducts} />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h2 className="text-7xl font-black tracking-tighter uppercase leading-[0.85]">
          More Info.
        </h2>
      </div>

      <BentoGrid />

      {/* Promo scroll trigger - fires when user scrolls past this point */}
      <PromoScrollSentinel />

      {/* SEO-friendly heading structure */}
      <section className='sr-only'>
        <h1>Perth&apos;s Best Price Quality ACM Sheets - Wholesale Aluminium Composite Panels</h1>
        <p>
          Subtex is Perth&apos;s best-priced quality ACM wholesaler, offering
          premium aluminium composite panels at unbeatable wholesale prices.
          We supply ACM sheets for signage, trailers, caravans, and kitchen
          splashbacks across Western Australia. Available in white and black
          colours with gloss and matte finishes. Custom cut-to-size service
          and local delivery available. Bulk discounts on larger orders. Note:
          Our ACM sheets are not fireproof and cannot be used as building cladding.
        </p>
      </section>


      <FeaturesApplicationsSection />

      <ServicesSection />

      <AcmInfoSection />

      {/* FAQ Section for SEO */}
      <FaqSection faqs={acmFAQs.slice(0, 6)} />
    </>
  );
}
