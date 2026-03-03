import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import { headers } from "next/headers";
import { MapPin, Clock, Mail, ArrowRight } from "lucide-react";
import { ContactForm } from "./contact-form";
import { GoogleMapEmbed } from "./google-map";
import { siteConfig, seoContent, generateBreadcrumbSchema } from "@/lib/seo";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/schemas/users";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: seoContent.contact.title,
  description: seoContent.contact.description,
  keywords: seoContent.contact.keywords,
  alternates: {
    canonical: `${siteConfig.url}/contact`,
  },
  openGraph: {
    title: seoContent.contact.title,
    description: seoContent.contact.description,
    url: `${siteConfig.url}/contact`,
  },
};

const businessHours = [
  { day: "Monday - Friday", hours: "8:00 AM - 3:00 PM" },
  { day: "Saturday", hours: "By appointment" },
  { day: "Sunday", hours: "Closed" },
];

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

export default async function ContactPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  let userData = { name: "", email: "", phone: "" };
  if (session?.user?.id) {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        name: true,
        email: true,
        phone: true,
      },
    });
    if (dbUser) {
      userData = {
        name: dbUser.name || "",
        email: dbUser.email,
        phone: dbUser.phone || "",
      };
    }
  }

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Contact", url: "/contact" },
  ]);

  const contactPageSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Subtex",
    description: seoContent.contact.description,
    url: `${siteConfig.url}/contact`,
    mainEntity: {
      "@type": "LocalBusiness",
      name: siteConfig.business.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: siteConfig.business.address.street,
        addressLocality: siteConfig.business.address.suburb,
        addressRegion: siteConfig.business.address.state,
        postalCode: siteConfig.business.address.postcode,
        addressCountry: "AU",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: siteConfig.business.geo.latitude,
        longitude: siteConfig.business.geo.longitude,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd id='schema-contact-breadcrumb' data={breadcrumbSchema} />
      <JsonLd id='schema-contact' data={contactPageSchema} />

      {/* Hero Section */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 border-b border-black/10">
        <div className="max-w-5xl">
          <h1 className="text-6xl sm:text-8xl lg:text-[9rem] font-black tracking-tighter uppercase leading-[0.85] mb-8">
            Get In<br />Touch.
          </h1>
          <p className="text-xl sm:text-2xl font-medium opacity-60 max-w-2xl leading-relaxed">
            Have a question about our ACM panels, need a custom cutting quote, or want to arrange a pickup? We're here to help.
          </p>
        </div>
      </section>

      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          
          {/* Left Column: Info & Map */}
          <div className="lg:col-span-5 space-y-16">
            
            <div className="space-y-12">
              <div className="space-y-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Location</h2>
                <div className="space-y-2 font-medium text-lg opacity-70">
                  <p>{siteConfig.business.address.street}</p>
                  <p>{siteConfig.business.address.suburb}, {siteConfig.business.address.state} {siteConfig.business.address.postcode}</p>
                  <p>{siteConfig.business.address.country}</p>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(`${siteConfig.business.address.street}, ${siteConfig.business.address.suburb}, ${siteConfig.business.address.state}, ${siteConfig.business.address.postcode}`)}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className="inline-flex items-center gap-2 font-bold uppercase tracking-wide text-sm border-b-2 border-black pb-1 hover:opacity-70 transition-opacity"
                >
                  Get Directions <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Hours</h2>
                <ul className="space-y-3 font-medium text-lg opacity-70">
                  {businessHours.map((item) => (
                    <li key={item.day} className="flex justify-between border-b border-black/10 pb-3">
                      <span>{item.day}</span>
                      <span>{item.hours}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Contact</h2>
                <div className="space-y-2 font-medium text-lg opacity-70">
                  <p>{siteConfig.business.email}</p>
                </div>
              </div>
            </div>

            <div className="aspect-square w-full overflow-hidden border-2 border-black/10">
              <GoogleMapEmbed
                address={`${siteConfig.business.address.street}, ${siteConfig.business.address.suburb}, ${siteConfig.business.address.state} ${siteConfig.business.address.postcode}, ${siteConfig.business.address.country}`}
              />
            </div>

            <div className="bg-[#0A0A0A] text-white p-8 sm:p-10">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Click & Collect</h3>
              <p className="font-medium opacity-70 leading-relaxed mb-6">
                Order ACM sheets online and collect from our Canning Vale warehouse. A holding fee applies for reservations, with the balance payable on pickup.
              </p>
              <Link href="/shipping" className="inline-flex items-center gap-2 font-bold uppercase tracking-wide text-sm border-b-2 border-white pb-1 hover:opacity-70 transition-opacity">
                View Shipping Details <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

          {/* Right Column: Form */}
          <div className="lg:col-span-7">
            <div className="sticky top-32">
              <h2 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none mb-12">
                Send A<br />Message.
              </h2>
              <div className="bg-white border-2 border-black/10 p-8 sm:p-12 shadow-xl">
                <ContactForm
                  showCard={false}
                  title=''
                  description=""
                  initialName={userData.name}
                  initialEmail={userData.email}
                  initialPhone={userData.phone}
                />
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
