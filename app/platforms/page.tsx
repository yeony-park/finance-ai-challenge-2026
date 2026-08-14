import Link from "next/link";
import { DataModeBadge, PageContainer } from "@/components/art/ui";
import type { Platform } from "@/lib/art/types";
import { historicalOfferingRepository, platformRepository } from "@/lib/repositories/art-repositories";

function PlatformCard({ platform }: { platform: Platform }) {
  const current = platformRepository.getProducts(platform.id);
  const history = platformRepository.getHistory(platform.id);
  const aggregate = historicalOfferingRepository.getAggregate({ platformId: platform.id });
  const isDemo = platformRepository.isDemo(platform.id);
  const sourceReportedReturn = history.filter((item) => item.trackRecord.sourceReportedReturnPct != null).length;

  return <Link className="platform-card" href={`/platforms/${platform.id}`}>
    <DataModeBadge isDemo={isDemo} />
    <h2>{platform.name}</h2>
    <p>운영사 : {platform.operatorName ?? "공개 자료 미확인"}</p>
    <dl>
      <div><dt>현재 연결 상품</dt><dd>{current.length}건</dd></div>
      <div><dt>과거 상품</dt><dd>{history.length}건</dd></div>
      <div><dt>매각 진행</dt><dd>{aggregate.byLifecycle.exit_in_progress}건</dd></div>
      <div><dt>매각 완료</dt><dd>{aggregate.byLifecycle.sold}건</dd></div>
      <div><dt>반환</dt><dd>{aggregate.byLifecycle.returned}건</dd></div>
      <div><dt>플랫폼 기재 수익률</dt><dd>{sourceReportedReturn}건</dd></div>
      <div><dt>발행사 identity</dt><dd>{isDemo ? "DEMO" : platform.id === "platform-arttogether" ? "현재 상품만 확인" : "레코드별 미검증"}</dd></div>
    </dl>
    <strong>{isDemo ? "DEMO 상품 상세 보기 →" : "전체 이력과 원문 보기 →"}</strong>
  </Link>;
}

export default function PlatformsPage() {
  const platforms = platformRepository.getList();
  const realPlatforms = platforms.filter((platform) => !platformRepository.isDemo(platform.id));
  const demoPlatforms = platforms.filter((platform) => platformRepository.isDemo(platform.id));

  return <main id="main-content" className="listing-page"><PageContainer>
    <header className="page-title">
      <p className="section-kicker">PLATFORMS</p>
      <h1>플랫폼별 상품·과거 이력</h1>
      <p>아트투게더 실데이터 플랫폼은 하나의 canonical 항목으로 유지하고, DEMO 플랫폼 4개는 별도 표시합니다.</p>
    </header>
    <div className="database-connection-banner"><strong>실데이터 플랫폼 {realPlatforms.length}개 · DEMO 플랫폼 {demoPlatforms.length}개</strong><span>실데이터 과거 이력과 DEMO 상품을 같은 플랫폼으로 합치지 않습니다.</span></div>
    <section className="content-section">
      <div className="section-heading-art"><div><p className="section-kicker">REAL DATA</p><h2>실데이터 플랫폼</h2></div></div>
      <div className="platform-grid">{realPlatforms.map((platform) => <PlatformCard key={platform.id} platform={platform} />)}</div>
    </section>
    <section className="content-section">
      <div className="section-heading-art"><div><p className="section-kicker">DEMO</p><h2>DEMO 플랫폼</h2><p>DEMO 상품 링크와 상세 API는 유지하되, 실데이터 이력으로 표시하지 않습니다.</p></div></div>
      <div className="platform-grid">{demoPlatforms.map((platform) => <PlatformCard key={platform.id} platform={platform} />)}</div>
    </section>
  </PageContainer></main>;
}
