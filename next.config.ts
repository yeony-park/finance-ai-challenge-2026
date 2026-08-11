import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공개 리포트(마스킹 완료)는 빌드 시 프리렌더에서 읽지만, 라우트가 동적으로 바뀌어도
  // 번들에 남도록 추적 대상에 명시한다 (읽기 전용).
  // 내부 리포트(data/reports)는 개인정보가 담겨 있어 로컬 전용이며 절대 포함하지 않는다.
  outputFileTracingIncludes: {
    "/*": ["data/public/**/*.json"],
  },
  // 개인정보가 담긴 로컬 전용 데이터는 어떤 경로로도 배포 번들에 들어가지 않게 못 박는다.
  outputFileTracingExcludes: {
    "/*": ["data/raw/**/*", "data/reports/**/*", "data/snapshots/**/*"],
  },
  // VM 게스트 IP로 접속하는 호스트 브라우저에서 dev 리소스(HMR·클라이언트 청크)가
  // 교차 출처로 차단되어 하이드레이션이 죽는 문제 방지 — dev 전용 설정.
  allowedDevOrigins: ["192.168.140.132"],
};

export default nextConfig;
