/**
 * 홈 — 검증 엔진 산출 리포트를 바인딩한 데모 화면 (S0.4).
 * Server Component가 최신 스냅샷(data/reports/{offerId}/report-*.json)을 읽어
 * 뷰 모델로 변환한 뒤 클라이언트 컴포넌트에 props로 넘긴다. 클라이언트 fetch 없음.
 * S3에서 `/offers/[id]`로 라우트를 분리할 때 이 로딩 경로를 그대로 옮긴다.
 */
import { DemoApp } from "@/components/demo/DemoApp";
import { loadLatestReport } from "@/lib/verify/report/load";
import { toDemoView } from "@/lib/verify/report/view-model";

/** S0 데모 대상 공모 — S3에서 라우트 파라미터로 대체된다 */
const OFFER_ID = "bankcow-9";

export default async function Home() {
  const loaded = await loadLatestReport(OFFER_ID);

  return (
    <main>
      <DemoApp view={toDemoView(loaded)} />
    </main>
  );
}
