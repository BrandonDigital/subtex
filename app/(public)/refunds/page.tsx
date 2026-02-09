import type { Metadata } from "next";
import { siteConfig, seoContent, generateBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: seoContent.refunds.title,
  description: seoContent.refunds.description,
  keywords: seoContent.refunds.keywords,
  alternates: {
    canonical: `${siteConfig.url}/refunds`,
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

export default function RefundsPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Refund Policy", url: "/refunds" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Page Header */}
      <div className="bg-zinc-50 border-b">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 mb-4 tracking-tight">
              Refund Policy
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto">
              We want you to be completely satisfied with your ACM sheet purchase from Subtex. 
              Please read our refund policy carefully.
            </p>
            <p className="text-sm text-zinc-400 mt-4">Last updated: January 2026</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert prose-lg">
            <h2>1. Eligibility for Refunds</h2>
            <p>You may be eligible for a refund if:</p>
            <ul>
              <li>The ACM sheets arrive damaged or defective</li>
              <li>You received the wrong product (colour, finish, or size)</li>
              <li>The product is significantly different from the description</li>
            </ul>

            <h2>2. Inspection on Delivery</h2>
            <p>
              <strong>Important:</strong> Please inspect your ACM sheets upon delivery. Any damage or 
              defects must be reported within <strong>48 hours</strong> of delivery. Take photos of any 
              damage for your records and our assessment.
            </p>

            <h2>3. How to Request a Refund</h2>
            <ol>
              <li>Log into your account and go to &quot;My Orders&quot;</li>
              <li>Find the relevant order and click &quot;Request Refund&quot;</li>
              <li>Provide a detailed reason for your refund request</li>
              <li>Include photos if the product is damaged or defective</li>
              <li>Submit your request for review</li>
            </ol>
            <p>
              Alternatively, you can contact us directly via our <a href="/contact">contact form</a>.
            </p>

            <h2>4. Refund Processing</h2>
            <ul>
              <li>We review all refund requests within 1-2 business days</li>
              <li>Approved refunds are processed via your original payment method</li>
              <li>Refunds typically appear in your account within 5-10 business days</li>
              <li>You will receive an email confirmation when your refund is processed</li>
            </ul>

            <h2>5. Non-Refundable Items</h2>
            <p>The following are not eligible for refunds:</p>
            <ul>
              <li>ACM sheets that have been cut, fabricated, or modified</li>
              <li>Products damaged due to improper handling or storage by the customer</li>
              <li>Change-of-mind purchases (unless the product is returned unopened and undamaged within 7 days)</li>
              <li>Click & Collect holding fees for orders not collected within the holding period</li>
            </ul>

            <h2>6. Returns</h2>
            <p>If you need to return ACM sheets:</p>
            <ul>
              <li>Contact us first to arrange the return</li>
              <li>Products must be in original condition, undamaged</li>
              <li>Return shipping costs may apply depending on the reason for return</li>
              <li>We do not accept returns for products that have been cut or modified</li>
            </ul>

            <h2>7. Partial Refunds</h2>
            <p>
              In some cases, we may offer a partial refund if:
            </p>
            <ul>
              <li>Only some sheets in your order are damaged</li>
              <li>The damage is minor and does not significantly affect usability</li>
              <li>You agree to keep the product at a reduced price</li>
            </ul>

            <h2>8. Consumer Guarantees</h2>
            <p>
              Our refund policy does not limit your rights under Australian Consumer Law. 
              Products come with guarantees that cannot be excluded under Australian Consumer Law. 
              You are entitled to a replacement or refund for a major failure and compensation for 
              any other reasonably foreseeable loss or damage.
            </p>

            <h2>9. Contact Us</h2>
            <p>
              For questions about refunds or to discuss a specific issue with your order, please contact us:
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
