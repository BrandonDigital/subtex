import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { ToastProvider, ToastBridge } from "@/components/ui/toast";
import { LayoutClient } from "@/components/layout-client";
import { Providers } from "@/components/providers";
import { ComingSoon } from "@/components/coming-soon";
import { auth } from "@/server/auth";
import { siteConfig, generateOrganizationSchema } from "@/lib/seo";
import { getActiveAnnouncements } from "@/server/actions/announcements";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/server/actions/notifications";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

// Check if coming soon mode is enabled
const isComingSoonMode = process.env.COMING_SOON_MODE === "true";

// Check if this is the dev site
const isDevSite = siteConfig.url.includes("dev.subtex.com.au");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "ACM Sheets Perth | Aluminium Composite Panels | Subtex",
    template: "%s | Subtex",
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.creator,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "ACM Sheets Perth | Aluminium Composite Panels | Subtex",
    description: siteConfig.description,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Subtex ACM Sheets - Premium Aluminium Composite Panels Perth",
      },
      {
        url: "/Subtex_ACM_Stack.png",
        width: 800,
        height: 600,
        alt: "Stack of ACM Sheets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ACM Sheets Perth | Subtex",
    description: siteConfig.description,
    images: ["/og-image.jpg"],
  },
  robots: isDevSite
    ? { index: false, follow: false }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
  category: "Business",
  classification: "Building Materials, Signage Supplies",
  other: {
    "geo.region": "AU-WA",
    "geo.placename": "Perth",
    "geo.position": "-32.0567;115.9167",
    ICBM: "-32.0567, 115.9167",
  },
};

// JSON-LD Structured Data Component
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type='application/ld+json'
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, announcements, notifications, unreadCount] =
    await Promise.all([
      auth.api.getSession({ headers: await headers() }),
      getActiveAnnouncements(),
      getUserNotifications(),
      getUnreadNotificationCount(),
    ]);

  // Fetch fresh user data from database to get latest image
  let user = null;
  if (session?.user?.id) {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/schemas/users");
    const { eq } = await import("drizzle-orm");

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    if (dbUser) {
      user = {
        name: dbUser.name || "",
        email: dbUser.email || "",
        image: dbUser.image || undefined,
        isAdmin: dbUser.role === "admin",
      };
    }
  }

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
    inLanguage: "en-AU",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // If coming soon mode is enabled, render only the coming soon page
  if (isComingSoonMode) {
    return (
      <html lang='en-AU' suppressHydrationWarning>
        <head>
          {/* Structured Data */}
          <JsonLd data={organizationSchema} />
          <JsonLd data={websiteSchema} />

          {/* Preconnect to external domains for performance */}
          <link rel='preconnect' href='https://fonts.googleapis.com' />
          <link
            rel='preconnect'
            href='https://fonts.gstatic.com'
            crossOrigin='anonymous'
          />
          <link
            rel='preconnect'
            href='https://use.typekit.net'
            crossOrigin='anonymous'
          />

          {/* Adobe Fonts (Typekit) */}
          <link rel='stylesheet' href='https://use.typekit.net/hcm0ntz.css' />

          {/* Favicon variations */}
          <link rel='icon' href='/favicon.ico' sizes='any' />
          <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        >
          <Providers>
            <ToastProvider>
              <ToastBridge />
              <ComingSoon />
            </ToastProvider>
          </Providers>
        </body>
      </html>
    );
  }

  return (
    <html lang='en-AU' suppressHydrationWarning>
      <head>
        {/* Structured Data */}
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />

        {/* Preconnect to external domains for performance */}
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          rel='preconnect'
          href='https://use.typekit.net'
          crossOrigin='anonymous'
        />

        {/* Adobe Fonts (Typekit) */}
        <link rel='stylesheet' href='https://use.typekit.net/hcm0ntz.css' />

        {/* Favicon variations */}
        <link rel='icon' href='/favicon.ico' sizes='any' />
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />

        {/* Additional SEO meta tags */}
        <meta name='geo.region' content='AU-WA' />
        <meta name='geo.placename' content='Perth' />
        <meta name='geo.position' content='-32.0567;115.9167' />
        <meta name='ICBM' content='-32.0567, 115.9167' />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Analytics/>
        <Providers>
          <ToastProvider>
            <ToastBridge />
            <LayoutClient
              user={user}
              notifications={notifications}
              unreadCount={unreadCount}
              announcements={announcements}
            >
              {children}
            </LayoutClient>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
