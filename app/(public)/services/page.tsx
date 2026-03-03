import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import {
  Scissors,
  Ruler,
  Package,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig, seoContent, generateBreadcrumbSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: seoContent.services.title,
  description: seoContent.services.description,
  keywords: seoContent.services.keywords,
  alternates: {
    canonical: `${siteConfig.url}/services`,
  },
  openGraph: {
    title: seoContent.services.title,
    description: seoContent.services.description,
    url: `${siteConfig.url}/services`,
  },
};

const howItWorks = [
  {
    step: "01",
    title: "Choose Sheets",
    description: "Browse our range of ACM sheets and select the colour, finish, and quantity you need.",
    icon: Package,
  },
  {
    step: "02",
    title: "Dimensions",
    description: "Tell us the exact measurements you need. We accept dimensions in millimetres for maximum precision.",
    icon: Ruler,
  },
  {
    step: "03",
    title: "We Cut",
    description: "Our team precision-cuts your panels to spec, so they're ready to use straight out of the box.",
    icon: Scissors,
  },
  {
    step: "04",
    title: "Delivery",
    description: "Pick up your cut panels from our Canning Vale warehouse, or we'll deliver them across Perth.",
    icon: Truck,
  },
];

const benefits = [
  "Precision cuts to your exact specifications",
  "Reduced material waste — order only what you need",
  "No need for your own cutting equipment",
  "Panels arrive ready to install or fabricate",
  "Consistent, clean edges on every cut",
  "Faster project turnaround — skip the cutting step",
];

function JsonLd({ id, data }: { id: string; data: object }) {
  return (
    <Script
      id={id}
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function ServicesPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Services", url: "/services" },
  ]);

  return (
    <div className="min-h-screen bg-white">
      <JsonLd id="schema-services" data={breadcrumbSchema} />

      {/* Hero Section */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 border-b border-black/10">
        <div className="max-w-5xl">
          <h1 className="text-6xl sm:text-8xl lg:text-[9rem] font-black tracking-tighter uppercase leading-[0.85] mb-8">
            Precision<br />Cutting.
          </h1>
          <p className="text-xl sm:text-2xl font-medium opacity-60 max-w-2xl leading-relaxed">
            Need ACM panels cut to specific dimensions? We offer a precision cutting service so your sheets arrive ready to use — no waste, no hassle.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8">
          <div className="lg:col-span-4 mb-8">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">How It Works</h2>
          </div>
          {howItWorks.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="group relative pt-8 border-t-2 border-black/10 hover:border-black transition-colors duration-300">
                <div className="flex justify-between items-start mb-12">
                  <span className="text-4xl font-black tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity">{item.step}</span>
                  <Icon className="w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold uppercase tracking-tight mb-4">{item.title}</h3>
                <p className="font-medium opacity-60 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits & Info Split */}
      <section className="w-full bg-[#0A0A0A] text-white py-24 sm:py-32">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            
            <div className="space-y-12">
              <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
                Why Use<br />Us?
              </h2>
              <ul className="space-y-6">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-6 group">
                    <ArrowRight className="w-6 h-6 opacity-30 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-300" strokeWidth={1.5} />
                    <span className="text-xl sm:text-2xl font-bold tracking-tight">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-12 lg:border-l-2 lg:border-white/20 lg:pl-16">
              <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none">
                Good To<br />Know.
              </h2>
              <ul className="space-y-8 text-lg font-medium opacity-70">
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-white mt-2.5 shrink-0" />
                  <p>Cutting is available for all ACM sheet sizes and colours in our range.</p>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-white mt-2.5 shrink-0" />
                  <p>Provide dimensions in millimetres for the most accurate results.</p>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-white mt-2.5 shrink-0" />
                  <p>Cut panels can be collected from our Canning Vale warehouse or delivered across Perth.</p>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-white mt-2.5 shrink-0" />
                  <p>For complex or bulk cutting jobs, contact us for a custom quote.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
        <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none mb-8">
          Ready To Cut?
        </h2>
        <p className="text-xl font-medium opacity-60 max-w-2xl mx-auto mb-12">
          Get in touch and let us know your dimensions. We'll have your panels precision-cut and ready for collection or delivery.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/contact">
            <Button size="lg" className="h-16 px-10 text-lg font-bold uppercase tracking-wide bg-black text-white hover:bg-black/90 hover:scale-105 transition-all">
              Contact Us
            </Button>
          </Link>
          <Link href="/products">
            <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-bold uppercase tracking-wide border-2 border-black hover:bg-black hover:text-white hover:scale-105 transition-all">
              Shop Panels
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
