/**
 * 랜딩 — 서비스가 무엇을 대조하는지 보여 주고 대표 검증 리포트로 보낸다.
 *
 * Server Component가 최신 공개 리포트(data/public/{offerId}/report-*.json · 마스킹 완료)를 읽어
 * 뷰 모델로 변환한 뒤 각 섹션에 props로 넘긴다. 클라이언트 fetch 없음, 정적 프리렌더.
 * 화면에 찍히는 판정 수치·공모 메타는 전부 이 뷰 모델에서 파생된다 — 하드코딩 없음.
 */
import { HeroSection } from "@/components/landing/HeroSection";
import { MethodSection } from "@/components/landing/MethodSection";
import { ReportsSection } from "@/components/landing/ReportsSection";
import { VerdictSection } from "@/components/landing/VerdictSection";
import { WatchSection } from "@/components/landing/WatchSection";
import { FEATURED_OFFER_ID } from "@/components/site/service";
import { loadLatestReport } from "@/lib/verify/report/load";
import { toDemoView } from "@/lib/verify/report/view-model";

export default async function Home() {
  const view = toDemoView(await loadLatestReport(FEATURED_OFFER_ID));

  return (
    <>
      <HeroSection view={view} />
      <ReportsSection view={view} />
      <MethodSection view={view} />
      <WatchSection view={view} />
      <VerdictSection />
    </>
  );
}
