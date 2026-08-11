import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공개 리포트(마스킹 완료)는 읽기 전용 데이터다.
  // 지금은 `/`와 `/offers/[id]` 모두 완전 정적 프리렌더라 빌드 시각에 리포트를 다 읽고
  // HTML로 굽는다 — 즉 이 include는 아직 no-op이다(정적 페이지는 서버 트레이스를 만들지 않는다).
  // 공개 목록(PUBLISHED_OFFER_IDS)에서 빠진 공모를 요청 시각에 렌더하도록 바꾸는 순간
  // 실제로 필요해지므로 미리 열어 둔다.
  // 키는 라우트 경로에 대한 글롭이다 — "/*"는 한 세그먼트만 잡아 `/offers/[id]`를 놓치므로
  // globstar("/**")로 중첩 라우트까지 덮는다.
  // 내부 리포트(data/reports)는 개인정보가 담겨 있어 로컬 전용이며 절대 포함하지 않는다.
  outputFileTracingIncludes: {
    "/**": ["data/public/**/*.json"],
  },
  // 개인정보가 담긴 로컬 전용 데이터는 어떤 경로로도 배포 번들에 들어가지 않게 못 박는다.
  outputFileTracingExcludes: {
    "/**": ["data/raw/**/*", "data/reports/**/*", "data/snapshots/**/*"],
  },
  // VM 게스트 IP로 접속하는 호스트 브라우저에서 dev 리소스(HMR·클라이언트 청크)가
  // 교차 출처로 차단되어 하이드레이션이 죽는 문제 방지 — dev 전용 설정.
  allowedDevOrigins: ["192.168.140.132"],
  // 보안 헤더 (배포 보안 리뷰 2026-08-12). script-src 'unsafe-inline'은 App Router의
  // 하이드레이션 인라인 스크립트 때문 — nonce 기반 전환은 로드맵(레이트리미터 부채와 함께).
  async headers() {
    return [
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
