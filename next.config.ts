import type { NextConfig } from "next";

const isDevSite = (process.env.NEXT_PUBLIC_APP_URL || "").includes(
  "dev.subtex.com.au"
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  // Prevent dev site from being indexed by search engines
  ...(isDevSite && {
    headers: async () => [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ],
  }),
};

export default nextConfig;
