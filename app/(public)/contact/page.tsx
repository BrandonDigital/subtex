import type { Metadata } from "next";
import { headers } from "next/headers";
import { MapPin, Clock, Mail } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { GoogleMapEmbed } from "@/components/google-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { day: "Monday - Friday", hours: "8:00 AM - 3:00 PM (Perth Time)" },
  { day: "Saturday", hours: "By appointment" },
  { day: "Sunday", hours: "Closed" },
];

// JSON-LD Component
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function ContactPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Fetch user details from database if logged in
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
    <>
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={contactPageSchema} />

      <div className='py-12'>
        <div className='container mx-auto px-4'>
          {/* Header */}
          <div className='text-center mb-12'>
            <h1 className='text-3xl sm:text-4xl font-bold'>Contact Us</h1>
          </div>

          <div className='grid gap-8 lg:grid-cols-2'>
            {/* Left Column: Map & Click & Collect */}
            <div className='space-y-6'>
              {/* Google Maps */}
              <Card className='overflow-hidden py-0'>
                <div className='aspect-video w-full'>
                  <GoogleMapEmbed
                    address={`${siteConfig.business.address.street}, ${siteConfig.business.address.suburb}, ${siteConfig.business.address.state} ${siteConfig.business.address.postcode}, ${siteConfig.business.address.country}`}
                  />
                </div>
              </Card>

              {/* Click & Collect Info */}
              <Card className='bg-primary/5 border-primary/20'>
                <CardContent className='pt-6'>
                  <h3 className='font-semibold mb-2'>
                    Click & Collect Available in Perth
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    Order ACM sheets online and collect from our Canning Vale
                    warehouse. A holding fee applies for reservations, with the
                    balance payable on pickup. See our{" "}
                    <a
                      href='/shipping'
                      className='text-primary hover:underline'
                    >
                      shipping & delivery
                    </a>{" "}
                    page for more details.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Location Info & Contact Form */}
            <div className='space-y-6'>
              {/* Contact Details Card */}
              <Card className='py-6'>
                <CardHeader>
                  <CardTitle>Our Perth Location</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {/* Address */}
                  <div className='flex items-start gap-4'>
                    <div className='h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                      <MapPin className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-medium'>Warehouse Address</h3>
                      <address className='text-sm text-muted-foreground mt-1 not-italic'>
                        {siteConfig.business.address.street}
                        <br />
                        {siteConfig.business.address.suburb},{" "}
                        {siteConfig.business.address.city}
                        <br />
                        {siteConfig.business.address.state}{" "}
                        {siteConfig.business.address.postcode},{" "}
                        {siteConfig.business.address.country}
                      </address>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(`${siteConfig.business.address.street}, ${siteConfig.business.address.suburb}, ${siteConfig.business.address.state}, ${siteConfig.business.address.postcode}`)}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm text-primary hover:underline mt-2 inline-block'
                      >
                        Get directions →
                      </a>
                    </div>
                  </div>

                  {/* Business Hours */}
                  <div className='flex items-start gap-4'>
                    <div className='h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                      <Clock className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-medium'>Business Hours</h3>
                      <ul className='text-sm text-muted-foreground mt-1 space-y-1'>
                        {businessHours.map((item) => (
                          <li
                            key={item.day}
                            className='flex justify-between gap-4'
                          >
                            <span>{item.day}</span>
                            <span>{item.hours}</span>
                          </li>
                        ))}
                      </ul>
                      <p className='text-sm text-muted-foreground mt-2'>
                        Closed on public holidays
                      </p>
                    </div>
                  </div>

                  {/* Contact Methods */}
                  <div className='flex items-start gap-4'>
                    <div className='h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
                      <Mail className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-medium'>Email</h3>
                      <p className='text-sm text-muted-foreground mt-1'>
                        {siteConfig.business.email}
                      </p>
                      <p className='text-xs text-muted-foreground mt-1'>
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <ContactForm
                title='Send us a Message'
                description="Fill out the form below and we'll get back to you as soon as possible with pricing and availability."
                initialName={userData.name}
                initialEmail={userData.email}
                initialPhone={userData.phone}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
