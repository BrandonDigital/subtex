import type { Metadata } from "next";
import { siteConfig, seoContent, generateBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: seoContent.terms.title,
  description: seoContent.terms.description,
  keywords: seoContent.terms.keywords,
  alternates: {
    canonical: `${siteConfig.url}/terms`,
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

export default function TermsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Terms & Conditions", url: "/terms" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Page Header */}
      <div className="bg-zinc-50 border-b">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 mb-4 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto">
              Please read these terms and conditions carefully before purchasing ACM sheets from Subtex.
            </p>
            <p className="text-sm text-zinc-400 mt-4">Last updated: January 2026</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert prose-lg">
            <h2>1. General</h2>
            <p>
              These terms and conditions govern your purchase of aluminium composite material (ACM) sheets
              from Subtex Pty Ltd (&quot;Subtex&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By placing an order, you agree to be bound
              by these terms.
            </p>

            <h2>2. Products</h2>
            <p>
              We sell ACM sheets in various colours (white, black), finishes (gloss, matte), and sizes
              (standard, XL). Product specifications, including dimensions and tolerances, are provided
              on our website. Minor variations in colour or finish may occur between batches.
            </p>

            <h2>3. Pricing</h2>
            <ul>
              <li>All prices displayed on our website are in Australian Dollars (AUD)</li>
              <li>All prices include GST (10%)</li>
              <li>Bulk discounts may apply for larger orders</li>
              <li>Delivery fees are calculated separately at checkout</li>
              <li>We reserve the right to change prices without notice</li>
            </ul>

            <h2>4. Payment</h2>
            <p>
              Payment is processed securely through Stripe. We accept major credit cards and debit cards.
              For Click & Collect orders, a holding fee is required at the time of order, with the balance
              due upon collection.
            </p>

            <h2>5. Delivery</h2>
            <ul>
              <li>We offer local delivery within the Perth metropolitan area</li>
              <li>Delivery times are estimates and not guaranteed</li>
              <li>Risk of damage or loss passes to you upon delivery</li>
              <li>Please inspect goods upon delivery and report any damage immediately</li>
            </ul>

            <h2>6. Click & Collect</h2>
            <ul>
              <li>A holding fee applies to reserve your order</li>
              <li>Orders are held for 7 days from the order date</li>
              <li>If not collected within 7 days, the holding fee is forfeited</li>
              <li>Balance is due upon collection</li>
            </ul>

            <h2>7. Returns & Refunds</h2>
            <p>
              Please refer to our <a href="/refunds">Refund Policy</a> for detailed information about
              returns and refunds.
            </p>

            <h2>8. Product Use</h2>
            <p>
              ACM sheets sold by Subtex are intended for signage, cladding, and general architectural
              applications. They are <strong>not</strong> suitable for fire-rated applications or
              structural use. Users are responsible for ensuring the product is appropriate for their
              intended application.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Subtex&apos;s liability for any claim arising from
              these terms or your purchase is limited to the purchase price of the products.
            </p>

            <h2>10. Governing Law</h2>
            <p>
              These terms are governed by the laws of Western Australia. Any disputes will be subject
              to the exclusive jurisdiction of the courts of Western Australia.
            </p>

            <h2>11. Contact</h2>
            <p>
              For questions about these terms, please contact us:
            </p>
            <address className="not-italic">
              <strong>Subtex</strong><br />
              {siteConfig.business.address.street}<br />
              {siteConfig.business.address.suburb}, {siteConfig.business.address.state} {siteConfig.business.address.postcode}<br />
              Email: {siteConfig.business.email}
            </address>
          </div>
        </div>
      </div>
    </>
  );
}
