import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 리포트 스냅샷은 빌드 시 프리렌더에서 읽지만, 라우트가 동적으로 바뀌어도
  // 번들에 남도록 추적 대상에 명시한다 (읽기 전용).
  outputFileTracingIncludes: {
    "/*": ["data/reports/**/*.json"],
  },
  // VM 게스트 IP로 접속하는 호스트 브라우저에서 dev 리소스(HMR·클라이언트 청크)가
  // 교차 출처로 차단되어 하이드레이션이 죽는 문제 방지 — dev 전용 설정.
  allowedDevOrigins: ["192.168.140.132"],
};

export default nextConfig;
