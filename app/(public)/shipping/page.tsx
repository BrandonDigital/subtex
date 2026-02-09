import type { Metadata } from "next";
import { Truck, MapPin, Package, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { siteConfig, seoContent, generateBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: seoContent.shipping.title,
  description: seoContent.shipping.description,
  keywords: seoContent.shipping.keywords,
  alternates: {
    canonical: `${siteConfig.url}/shipping`,
  },
  openGraph: {
    title: seoContent.shipping.title,
    description: seoContent.shipping.description,
    url: `${siteConfig.url}/shipping`,
  },
};

const deliveryOptions = [
  {
    title: "Perth Metro Delivery",
    description: "Local delivery across the Perth metropolitan area",
    icon: Truck,
    features: [
      "Delivery within 25km of Canning Vale",
      "Typically 1-3 business days",
      "Flat rate delivery fee",
      "Delivery to residential and commercial addresses",
    ],
    badge: "Most Popular",
  },
  {
    title: "Greater Perth Delivery",
    description: "Extended delivery area covering greater Perth region",
    icon: MapPin,
    features: [
      "Delivery within 50km of our warehouse",
      "Typically 2-5 business days",
      "Distance-based delivery fee",
      "Per-sheet surcharge may apply",
    ],
  },
  {
    title: "Click & Collect",
    description: "Collect from our Canning Vale warehouse",
    icon: Package,
    features: [
      "Reserve online, collect in-store",
      "Holding fee applies (refundable against balance)",
      "7-day holding period",
      "Balance due on collection",
    ],
    badge: "Save on Delivery",
  },
  {
    title: "Interstate & International",
    description: "Shipping to other Australian states and overseas",
    icon: Clock,
    features: [
      "Custom quote required",
      "We'll contact you with shipping options",
      "Freight costs calculated per order",
      "Secure packaging for long-distance transport",
    ],
    badge: "Quote Required",
  },
];

// JSON-LD Component
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function ShippingPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shipping & Delivery", url: "/shipping" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      {/* Page Header */}
      <div className="bg-zinc-50 border-b">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-semibold text-zinc-900 mb-4 tracking-tight">
              Shipping & Delivery
            </h1>
            <p className="text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto">
              We offer multiple delivery options for ACM sheets across Perth and Western Australia. 
              Choose the option that best suits your project timeline and location.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-12 sm:py-16">
        <div className="container mx-auto px-4">

          {/* Delivery Options Grid */}
          <div className="grid gap-6 md:grid-cols-2 mb-12">
            {deliveryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.title} className="relative">
                  {option.badge && (
                    <Badge className="absolute top-4 right-4" variant="secondary">
                      {option.badge}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{option.title}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Important Information */}
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Important Delivery Information</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• All prices on our website include GST (10%)</li>
                    <li>• ACM sheets are fragile during transport - please inspect on delivery</li>
                    <li>• Delivery requires a signature - please ensure someone is available</li>
                    <li>• For bulk orders (50+ sheets), contact us for special delivery arrangements</li>
                    <li>• Click & Collect orders have a 7-day holding period</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Location */}
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Our Perth Warehouse Location</h2>
            <p className="text-muted-foreground mb-2">
              <strong>Subtex</strong>
            </p>
            <address className="text-muted-foreground not-italic">
              {siteConfig.business.address.street}<br />
              {siteConfig.business.address.suburb}, {siteConfig.business.address.state} {siteConfig.business.address.postcode}
            </address>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(`${siteConfig.business.address.street}, ${siteConfig.business.address.suburb}, ${siteConfig.business.address.state}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline mt-2 inline-block"
            >
              View on Google Maps →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
