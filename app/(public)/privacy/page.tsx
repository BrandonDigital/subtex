import type { Metadata } from "next";
import { siteConfig, seoContent, generateBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: seoContent.privacy.title,
  description: seoContent.privacy.description,
  keywords: seoContent.privacy.keywords,
  alternates: {
    canonical: `${siteConfig.url}/privacy`,
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

export default function PrivacyPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Privacy Policy", url: "/privacy" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Page Header */}
      <div className="bg-zinc-50 border-b">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto">
              Your privacy is important to us. This policy explains how Subtex collects, uses, and protects your personal information.
            </p>
            <p className="text-sm text-zinc-400 mt-4">Last updated: January 2026</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-zinc dark:prose-invert prose-lg">
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email address, password</li>
              <li><strong>Order information:</strong> Delivery address, phone number, order history</li>
              <li><strong>Payment information:</strong> Processed securely through Stripe (we don&apos;t store card details)</li>
              <li><strong>Communication:</strong> Messages sent through our contact form</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Process and fulfil your orders for ACM sheets</li>
              <li>Send order confirmations and delivery updates</li>
              <li>Respond to your enquiries and customer service requests</li>
              <li>Send product updates and stock notifications (if you opt in)</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul>
              <li><strong>Delivery partners:</strong> To fulfil your order</li>
              <li><strong>Payment processor (Stripe):</strong> To process payments securely</li>
              <li><strong>Email service (Resend):</strong> To send transactional emails</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h2>4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information, including:
            </p>
            <ul>
              <li>SSL/TLS encryption for data transmission</li>
              <li>Secure password hashing</li>
              <li>Regular security updates and monitoring</li>
            </ul>

            <h2>5. Cookies</h2>
            <p>
              Our website uses cookies to improve your experience, remember your preferences, and
              analyse site traffic. You can control cookie settings in your browser.
            </p>

            <h2>6. Your Rights</h2>
            <p>Under Australian Privacy Law, you have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2>7. Email Communications</h2>
            <p>We may send you:</p>
            <ul>
              <li><strong>Transactional emails:</strong> Order confirmations, delivery updates (required)</li>
              <li><strong>Stock alerts:</strong> Back-in-stock notifications (opt-in)</li>
              <li><strong>Marketing emails:</strong> Promotions and offers (opt-in)</li>
            </ul>
            <p>
              You can manage your email preferences in your account settings or by clicking
              &quot;unsubscribe&quot; in any marketing email.
            </p>

            <h2>8. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services
              and comply with legal obligations. Order records are kept for 7 years for tax purposes.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of significant
              changes by posting a notice on our website or sending you an email.
            </p>

            <h2>10. Contact Us</h2>
            <p>
              If you have questions about this privacy policy or want to exercise your privacy rights,
              please contact us:
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
