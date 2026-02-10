import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;
  const isDevSite = baseUrl.includes("dev.subtex.com.au");

  // Block all crawlers on dev site
  if (isDevSite) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
    };
  }

  // Production robots rules
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/account/",
          "/checkout/",
          "/orders/",
          "/notifications/",
          "/verify-email/",
          "/reset-password/",
          "/forgot-password/",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/contact", "/shipping", "/terms", "/privacy", "/refunds"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/account/",
          "/checkout/",
          "/orders/",
          "/notifications/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
