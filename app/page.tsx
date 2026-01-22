import type { Metadata } from "next";
import { Hero } from "@/components/hero";
import { ProductConfiguratorWrapper } from "@/components/product-configurator-wrapper";
import { AcmInfoSection } from "@/components/acm-info-section";
import { ContactForm } from "@/components/contact-form";
import { FaqSection } from "@/components/faq-section";
import { Card, CardContent } from "@/components/ui/card";
import { getActiveVariants, getBulkDiscounts } from "@/server/actions/products";
import { siteConfig, seoContent, acmFAQs, generateFAQSchema, generateProductSchema } from "@/lib/seo";

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
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function HomePage() {
  // Fetch real data from database
  const [variantsData, bulkDiscountsData] = await Promise.all([
    getActiveVariants(),
    getBulkDiscounts(),
  ]);

  // Transform variants to match component props
  const variants = variantsData.map((v) => ({
    id: v.id,
    color: v.color,
    material: v.material,
    size: v.size,
    sku: v.sku,
    priceInCents: v.priceInCents,
    stock: v.stock,
  }));

  // Transform bulk discounts
  const bulkDiscounts = bulkDiscountsData.map((d) => ({
    minQuantity: d.minQuantity,
    discountPercent: d.discountPercent,
  }));

  // Generate structured data
  const faqSchema = generateFAQSchema(acmFAQs);
  
  // Product schema for the main product offering
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "ACM Sheets - Aluminium Composite Panels",
    description: "Premium aluminium composite material (ACM) sheets for signage, cladding, and architectural applications. Available in white and black, gloss and matte finishes.",
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
      lowPrice: variants.length > 0 ? Math.min(...variants.map(v => v.priceInCents)) / 100 : 65,
      highPrice: variants.length > 0 ? Math.max(...variants.map(v => v.priceInCents)) / 100 : 125,
      offerCount: variants.length || 8,
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
      
      {/* SEO-friendly heading structure */}
      <section className="sr-only">
        <h1>ACM Sheets Perth - Aluminium Composite Panels Supplier</h1>
        <p>
          Subtex is Perth&apos;s trusted local supplier of premium ACM (Aluminium Composite Material) sheets. 
          We offer high-quality aluminium composite panels for signage, cladding, and architectural applications 
          across Western Australia. Available in white and black colours with gloss and matte finishes.
        </p>
      </section>
      
      <ProductConfiguratorWrapper
        variants={variants.length > 0 ? variants : undefined}
        bulkDiscounts={bulkDiscounts.length > 0 ? bulkDiscounts : undefined}
      />
      
      <AcmInfoSection />
      
      {/* FAQ Section for SEO */}
      <FaqSection faqs={acmFAQs.slice(0, 6)} />
      
      {/* Contact Section */}
      <section id="contact" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get a Quote for ACM Sheets in Perth
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Need ACM sheets for your signage or cladding project? Contact us for pricing, bulk discounts, and delivery options across Perth and Western Australia.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <ContactForm showCard={false} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
