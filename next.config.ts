import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 공개 리포트(마스킹 완료)는 읽기 전용 데이터다.
  // 현재 `/`는 완전 정적 프리렌더라 빌드 시각에 리포트를 다 읽고 HTML로 굽는다 —
  // 즉 이 include는 지금은 no-op이며, S3에서 `/offers/[id]` 동적 라우트로 바꿔
  // 요청 시각에 파일을 읽게 되는 순간부터 실제로 필요해진다.
  // 그때 글롭 키를 라우트에 맞게 갱신할 것("/*"는 중첩 라우트를 잡지 못한다).
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
