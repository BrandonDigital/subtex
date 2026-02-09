import type { Metadata } from "next";

// ============ SEO CONFIGURATION ============

export const siteConfig = {
  name: "Subtex",
  description: "Perth's local supplier of premium ACM sheets for signage, trailer alignment, caravan panels, and kitchen splashboards. Quality aluminium composite panels with local delivery across Perth, Western Australia. Note: Not fireproof, not for building cladding.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://subtex.com.au",
  ogImage: "/og-image.jpg",
  creator: "Subtex",
  keywords: [
    // Primary Keywords (High Intent)
    "ACM sheets Perth",
    "aluminium composite panels Perth",
    "ACM panels WA",
    "aluminium composite material Perth",
    "ACM supplier Perth",
    
    // Product Keywords
    "buy ACM sheets",
    "ACM sheets for signage",
    "ACM cladding panels",
    "white ACM sheets",
    "black ACM sheets",
    "gloss ACM panels",
    "matte aluminium composite panels",
    "3mm ACM sheets",
    "4mm ACM panels",
    
    // Local SEO Keywords
    "ACM sheets Western Australia",
    "aluminium panels Canning Vale",
    "signage materials Perth",
    "building cladding Perth WA",
    "ACM local delivery Perth",
    "click and collect ACM Perth",
    
    // Long-tail Keywords
    "where to buy ACM sheets in Perth",
    "ACM sheets for outdoor signage",
    "aluminium composite panels wholesale Perth",
    "ACM sheets bulk discount",
    "signage substrate Perth",
    "aluminium sandwich panel Perth",
    
    // Industry Keywords
    "signage industry supplies Perth",
    "architectural cladding materials",
    "shopfront signage panels",
    "building facade panels Perth",
    "dibond alternative Perth",
    "alucobond alternative Australia",
  ],
  
  // Business Information (for Local SEO)
  business: {
    name: "Subtex",
    legalName: "Subtex Pty Ltd",
    address: {
      street: "16 Brewer Rd",
      suburb: "Canning Vale",
      city: "Perth",
      state: "WA",
      postcode: "6155",
      country: "Australia",
    },
    geo: {
      latitude: -32.0567,
      longitude: 115.9167,
    },
    phone: "", // Add phone when available
    email: "sales@subtex.com.au",
    priceRange: "$$",
    openingHours: [
      { days: "Monday-Friday", hours: "08:00-15:00" },
      { days: "Saturday", hours: "By appointment" },
    ],
  },
};

// ============ METADATA GENERATORS ============

export function generateMetadata({
  title,
  description,
  keywords = [],
  path = "",
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const ogImage = image || siteConfig.ogImage;
  const allKeywords = [...siteConfig.keywords.slice(0, 10), ...keywords];

  return {
    title: {
      default: title,
      template: `%s | ${siteConfig.name}`,
    },
    description,
    keywords: allKeywords,
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.creator,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      locale: "en_AU",
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex
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
    verification: {
      // Add your verification codes here
      // google: "your-google-verification-code",
      // yandex: "your-yandex-verification-code",
    },
  };
}

// ============ JSON-LD STRUCTURED DATA ============

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.business.name,
    legalName: siteConfig.business.legalName,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/Subtex_Logo_Combined.png`,
    image: `${siteConfig.url}/Subtex_ACM_Stack.png`,
    email: siteConfig.business.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.business.address.street,
      addressLocality: siteConfig.business.address.suburb,
      addressRegion: siteConfig.business.address.state,
      postalCode: siteConfig.business.address.postcode,
      addressCountry: siteConfig.business.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.business.geo.latitude,
      longitude: siteConfig.business.geo.longitude,
    },
    priceRange: siteConfig.business.priceRange,
    openingHoursSpecification: siteConfig.business.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.split("-"),
      opens: h.hours.split("-")[0],
      closes: h.hours.split("-")[1] || h.hours,
    })),
    areaServed: [
      {
        "@type": "City",
        name: "Perth",
        containedInPlace: {
          "@type": "State",
          name: "Western Australia",
        },
      },
      {
        "@type": "State",
        name: "Western Australia",
      },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "ACM Sheets",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "White Gloss ACM Sheet",
            description: "Premium white gloss aluminium composite panel for signage, trailers, caravans, and splashboards",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Product",
            name: "Black Matte ACM Sheet",
            description: "Premium black matte aluminium composite panel for signage, trailers, caravans, and splashboards",
          },
        },
      ],
    },
    sameAs: [
      // Add social media URLs when available
      // "https://www.facebook.com/subtex",
      // "https://www.instagram.com/subtex",
    ],
  };
}

export function generateProductSchema(product: {
  name: string;
  description: string;
  sku: string;
  price: number;
  currency?: string;
  image?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.image || `${siteConfig.url}/Subtex_ACM_Stack.png`,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    offers: {
      "@type": "Offer",
      url: siteConfig.url,
      priceCurrency: product.currency || "AUD",
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: `https://schema.org/${product.availability || "InStock"}`,
      seller: {
        "@type": "Organization",
        name: siteConfig.business.name,
      },
    },
    manufacturer: {
      "@type": "Organization",
      name: siteConfig.business.name,
    },
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateWebPageSchema({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteConfig.url}${path}#webpage`,
    url: `${siteConfig.url}${path}`,
    name: title,
    description,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    about: {
      "@id": `${siteConfig.url}/#organization`,
    },
    inLanguage: "en-AU",
  };
}

// ============ SEO CONTENT HELPERS ============

export const seoContent = {
  homepage: {
    title: "ACM Sheets Perth | Aluminium Composite Panels | Subtex",
    description: "Perth's trusted supplier of premium ACM sheets for signage, trailer alignment, caravan panels & kitchen splashboards. White & black, gloss & matte finishes. Local delivery across Perth, WA. Note: Not for building cladding.",
    h1: "Perth Local ACM Sheets",
    keywords: [
      "ACM sheets Perth",
      "aluminium composite panels Perth",
      "signage materials Perth",
      "ACM supplier Western Australia",
      "ACM trailer signage",
      "caravan ACM panels",
      "kitchen splashboard ACM",
    ],
  },
  contact: {
    title: "Contact Subtex | ACM Sheets Perth | Get a Quote",
    description: "Contact Subtex for ACM sheet enquiries, quotes, and orders. Located in Canning Vale, Perth. Local delivery available across Western Australia.",
    keywords: [
      "contact ACM supplier Perth",
      "ACM sheets quote Perth",
      "aluminium panels Canning Vale",
    ],
  },
  shipping: {
    title: "Shipping & Delivery | ACM Sheets Perth | Subtex",
    description: "ACM sheet delivery options in Perth, WA. Local delivery across Perth metro, click & collect from Canning Vale, and interstate shipping available.",
    keywords: [
      "ACM delivery Perth",
      "aluminium panels shipping WA",
      "ACM click collect Perth",
    ],
  },
  refunds: {
    title: "Refund Policy | ACM Sheets | Subtex Perth",
    description: "Subtex refund policy for ACM sheet purchases. Learn about our returns process and refund conditions.",
    keywords: [
      "ACM sheets refund policy",
      "aluminium panels returns Perth",
    ],
  },
  terms: {
    title: "Terms & Conditions | Subtex ACM Sheets Perth",
    description: "Terms and conditions for purchasing ACM sheets from Subtex. Read our sales terms, delivery conditions, and warranty information.",
    keywords: [
      "ACM sheets terms conditions",
      "aluminium panels purchase terms",
    ],
  },
  privacy: {
    title: "Privacy Policy | Subtex ACM Sheets Perth",
    description: "Subtex privacy policy. Learn how we collect, use, and protect your personal information when purchasing ACM sheets.",
    keywords: [
      "ACM supplier privacy policy",
      "Subtex data protection",
    ],
  },
};

// ACM Information for SEO-rich content
export const acmFAQs = [
  {
    question: "What are ACM sheets?",
    answer: "ACM (Aluminium Composite Material) sheets consist of two thin aluminium layers bonded to a polyethylene core. They are lightweight, durable, and ideal for signage, trailer panels, caravan exteriors, and kitchen splashboards. ACM panels offer excellent flatness, weather resistance, and are easy to fabricate. Note: PE core ACM is not fireproof and cannot be used as building cladding.",
  },
  {
    question: "What sizes do ACM sheets come in?",
    answer: "Standard ACM sheets typically come in 1220mm x 2440mm (4ft x 8ft) dimensions. We offer both standard and XL sizes to suit various project requirements. Common thicknesses are 3mm and 4mm.",
  },
  {
    question: "What finishes are available for ACM panels?",
    answer: "We offer ACM sheets in white and black colours, with both gloss and matte finishes. Gloss finishes provide a reflective, vibrant appearance while matte finishes offer a sophisticated, non-reflective look.",
  },
  {
    question: "What are ACM sheets used for?",
    answer: "ACM sheets are commonly used for outdoor and indoor signage, trailer alignment and signage, caravan exterior panels, kitchen splashboards and backsplashes, shopfronts, exhibition displays, and decorative wall panels. They are popular due to their durability and professional flat finish.",
  },
  {
    question: "Can ACM sheets be used as building cladding?",
    answer: "No, our ACM sheets have a polyethylene (PE) core and are NOT fireproof. They cannot be used as external building cladding due to Australian fire safety regulations. ACM with PE core is not compliant with the National Construction Code for building facades. For cladding applications, fire-rated (FR) panels with mineral cores are required.",
  },
  {
    question: "Are ACM sheets suitable for outdoor use?",
    answer: "Yes, ACM sheets are highly suitable for outdoor applications. They are weather-resistant, UV-stable, and can withstand various environmental conditions. They are commonly used for outdoor signage, trailer signage, and caravan exteriors. However, our PE core ACM cannot be used as building cladding due to fire safety regulations.",
  },
  {
    question: "Do you deliver ACM sheets in Perth?",
    answer: "Yes, we offer local delivery across Perth and the greater Perth area. We also provide click & collect from our Canning Vale warehouse and can arrange interstate shipping for customers outside Western Australia.",
  },
  {
    question: "Do you offer bulk discounts on ACM sheets?",
    answer: "Yes, we offer quantity-based bulk discounts. The more sheets you order, the better the price per sheet. Contact us for quotes on larger orders.",
  },
  {
    question: "What is the difference between ACM and ACP?",
    answer: "ACM (Aluminium Composite Material) and ACP (Aluminium Composite Panel) are essentially the same product - they both refer to aluminium composite panels with a polyethylene or other core material. The terms are often used interchangeably in the industry.",
  },
];
