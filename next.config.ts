import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // VM 게스트 IP로 접속하는 호스트 브라우저에서 dev 리소스(HMR·클라이언트 청크)가
  // 교차 출처로 차단되어 하이드레이션이 죽는 문제 방지 — dev 전용 설정.
  allowedDevOrigins: ["192.168.140.132"],
};

export default nextConfig;
