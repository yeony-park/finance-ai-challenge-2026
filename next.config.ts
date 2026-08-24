import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": [
      "data/public/**/*.json",
      "data/reference/**/*.json",
      "data/scenarios/**/*.json",
      "data/knowledge/**/*.json",
    ],
  },
  outputFileTracingExcludes: {
    "/**": [
      "data/raw/**/*",
      "data/reports/**/*",
      "data/snapshots/**/*",
      "data/public/real-estate-a/**/*",
      "data/public/real-estate-bbric-hiwon/**/*",
      "data/public/real-estate-sou-daejeon-startup/**/*",
      "data/reference/building-hub/**/*",
      "data/reference/building-register/**/*",
      "data/reference/rtms/**/*",
      "data/reference/ecos/**/*",
      "data/offers/real-estate-a.json",
      "data/offers/real-estate-bbric-hiwon.json",
      "data/offers/real-estate-sou-daejeon-startup.json",
    ],
  },
  allowedDevOrigins: ["192.168.140.132"],
  async headers() {
    return [
      {
        source: "/scenario-documents/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      ...[
        "/offers/real-estate-a",
        "/offers/real-estate-bbric-hiwon",
        "/offers/real-estate-sou-daejeon-startup",
      ].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
              "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; " +
              "object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
