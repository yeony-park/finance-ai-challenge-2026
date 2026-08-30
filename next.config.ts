import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const scriptSrc = `script-src 'self' 'unsafe-inline'${
  isDevelopment ? " 'unsafe-eval'" : ""
} https://dapi.kakao.com https://t1.daumcdn.net${
  isDevelopment ? " http://t1.daumcdn.net" : ""
}; `;
const kakaoImageSrc = `https://*.daumcdn.net https://*.kakaocdn.net https://*.kakao.com https://*.maps.daum.net${
  isDevelopment ? " http://*.daumcdn.net http://*.kakaocdn.net http://*.kakao.com http://*.maps.daum.net" : ""
}`;
const kakaoConnectSrc = `https://*.kakao.com https://*.daum.net https://*.daumcdn.net${
  isDevelopment ? " http://*.kakao.com http://*.daum.net http://*.daumcdn.net" : ""
}`;

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      new URL(
        "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/182/20231129120144c682624f-6317-482a-9f57-b32c6867cb82.jpg",
      ),
      new URL(
        "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/183/20240227153040f4183850-cfda-46f0-b3c9-0d13e999a579.png",
      ),
      new URL(
        "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/191/202604031648559c9f0135-c61f-49c6-9ec3-bb28dc2d7d05.jpg",
      ),
      new URL(
        "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/190/202605141145053bd8f766-cc15-4e47-8b6c-10c56fe4abcc.jpg",
      ),
    ],
    maximumRedirects: 0,
    dangerouslyAllowLocalIP: false,
  },
  outputFileTracingIncludes: {
    "/**": [
      "data/public/**/*.json",
      "data/reference/**/*.json",
      "data/knowledge/derived/**/*.json",
      "data/knowledge/generated/index.json",
    ],
  },
  outputFileTracingExcludes: {
    "/**": [
      "data/raw/**/*",
      "data/reports/**/*",
      "data/snapshots/**/*",
      "data/goldset/**/*",
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
      "data/knowledge/products/**/*",
      "data/knowledge/sources/**/*",
      "data/knowledge/inputs/**/*",
      "db/**/*",
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
              "default-src 'self'; " +
              scriptSrc +
              "style-src 'self' 'unsafe-inline'; " +
              `img-src 'self' data: ${kakaoImageSrc}; ` +
              "font-src 'self'; " +
              `connect-src 'self' ${kakaoConnectSrc}; ` +
              "frame-src https://www.mafra.go.kr; frame-ancestors 'none'; " +
              "object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
