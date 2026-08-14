import Link from "next/link";
import { notFound } from "next/navigation";
import { AuctionResultChart } from "@/components/art/charts";
import { AuctionVolumeChart, Breadcrumb, DataModeBadge, MetricCard, PageContainer, PriceTrendChart, ProductCard } from "@/components/art/ui";
import { formatKrw, latestAnnualSellThroughRate, medianAuctionPrice } from "@/lib/domain/calculations";
import { artistRepository } from "@/lib/repositories/art-repositories";
import type { TrackStatus } from "@/lib/art/types";

type Props = { params: Promise<{ id: string }> };

const statusLabels: Record<TrackStatus, string> = {
  offering: "모집 중",
  operating: "운용 중",
  exit_in_progress: "매각 진행",
  sold: "매각 완료",
  returned: "반환",
  liquidated: "청산 완료",
  delayed: "지연 청산",
  unsold: "미매각",
  loss_confirmed: "손실 확인",
  unknown: "상태 미확인",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return artistRepository.getList().map((artist) => ({ id: artist.id }));
}

function returnValue(value: number | null | undefined) {
  return value == null ? "미기재" : `${value.toFixed(2)}%`;
}

export default async function ArtistDetail({ params }: Props) {
  const { id } = await params;
  const artist = artistRepository.getById(id);
  if (!artist) notFound();

  const current = artistRepository.getCurrentProducts(id);
  const historical = artistRepository.getHistoricalProducts(id);
  const operating = historical.filter((item) => item.lifecycle === "operating" || item.lifecycle === "exit_in_progress");
  const completed = historical.filter((item) => item.lifecycle !== "operating" && item.lifecycle !== "exit_in_progress");
  const platformReportedReturn = historical.filter((item) => item.trackRecord.sourceReportedReturnPct != null);
  const calculatedSettlementReturn = historical.filter((item) => item.trackRecord.calculatedSettlementReturnPct != null);
  const auctions = artistRepository.getAuctions(id);
  const metrics = artistRepository.getAnnualMetrics(id);
  const rate = latestAnnualSellThroughRate(metrics, auctions);
  const product = current[0];
  const isDemo = current.length > 0 && current.every((item) => item.offering.isDemo);
  const platforms = [...new Set([...current.map((item) => item.platform.name), ...historical.map((item) => item.platform.name)])];

  return <main id="main-content" className="detail-page"><PageContainer>
    <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "작가", href: "/artists" }, { label: artist.nameKo }]} />
    <header className="entity-header">
      <DataModeBadge isDemo={isDemo} />
      <h1>{artist.nameKo}</h1>
      {artist.nameEn || artist.nationality ? <p>{[artist.nameEn, artist.nationality].filter(Boolean).join(" · ")}</p> : null}
      {artist.biography ? <p>{artist.biography}</p> : null}
      <p>연결 플랫폼 : {platforms.length ? platforms.join(" · ") : "미기재"}</p>
    </header>
    <section className="insight-box"><p className="section-kicker">RECORD GROUPS</p><h2>현재 상품, 운용·매각 진행 기록, 과거 기록을 분리합니다.</h2><p>플랫폼 기재 수익률과 DAKER 계산 수익률은 동일 값으로 대체하지 않습니다.</p></section>
    <div className="metric-grid-art">
      <MetricCard label="현재 상품" value={`${current.length}건`} />
      <MetricCard label="운용·매각 진행" value={`${operating.length}건`} />
      <MetricCard label="과거 기록" value={`${historical.length}건`} />
      <MetricCard label="플랫폼 기재 수익률" value={`${platformReportedReturn.length}건`} note="플랫폼 원문값" />
      <MetricCard label="DAKER 계산 수익률" value={`${calculatedSettlementReturn.length}건`} note="정산 계산값" />
      <MetricCard label="연결 거래·가격 표본" value={`${auctions.length}건`} />
      <MetricCard label="낙찰률" value={rate == null ? "미기재" : `${rate.toFixed(1)}%`} />
      <MetricCard label="중위 낙찰가" value={formatKrw(medianAuctionPrice(auctions))} />
    </div>
    {product ? <div className="chart-grid"><AuctionVolumeChart product={product} /><PriceTrendChart product={product} /><AuctionResultChart product={product} /></div> : <section className="chart-empty"><strong>연결된 현재 분석 상품 없음</strong><p>과거 플랫폼 기록만 있는 작가는 경매 차트를 임의로 생성하지 않았습니다.</p></section>}
    <section className="content-section">
      <h2>운용·매각 진행 기록</h2>
      {operating.length ? <div className="table-wrap"><table>
        <thead><tr><th>상품·작품</th><th>플랫폼</th><th>상태</th><th>보유기간</th><th>플랫폼 기재 수익률</th><th>DAKER 계산 수익률</th></tr></thead>
        <tbody>{operating.map((item) => <tr key={item.offering.id}>
          <td><Link href={`/products/${item.offering.id}`}>{item.offering.title}</Link><br /><small>{item.artwork.title}</small></td>
          <td>{item.platform.name}</td>
          <td>{statusLabels[item.trackRecord.status]}</td>
          <td>{item.trackRecord.actualHoldingMonths == null ? "미기재" : `${item.trackRecord.actualHoldingMonths.toFixed(1)}개월`}</td>
          <td>{returnValue(item.trackRecord.sourceReportedReturnPct)}</td>
          <td>{returnValue(item.trackRecord.calculatedSettlementReturnPct)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="state-panel">운용 또는 매각 진행으로 분류된 과거 기록이 없습니다.</p>}
    </section>
    <section className="content-section">
      <h2>과거 기록</h2>
      {completed.length ? <div className="table-wrap"><table>
        <thead><tr><th>상품·작품</th><th>플랫폼</th><th>최종 상태</th><th>보유기간</th><th>플랫폼 기재 수익률</th><th>DAKER 계산 수익률</th></tr></thead>
        <tbody>{completed.map((item) => <tr key={item.offering.id}>
          <td><Link href={`/products/${item.offering.id}`}>{item.offering.title}</Link><br /><small>{item.artwork.title}</small></td>
          <td>{item.platform.name}</td>
          <td>{statusLabels[item.trackRecord.status]}{item.trackRecord.statusConflict ? <><br /><small>원문 상태 표기 충돌</small></> : null}</td>
          <td>{item.trackRecord.actualHoldingMonths == null ? "미기재" : `${item.trackRecord.actualHoldingMonths.toFixed(1)}개월`}</td>
          <td>{returnValue(item.trackRecord.sourceReportedReturnPct)}</td>
          <td>{returnValue(item.trackRecord.calculatedSettlementReturnPct)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="state-panel">완료·반환·상태 미확인 과거 기록이 없습니다.</p>}
    </section>
    <section className="content-section">
      <h2>최근 거래 목록</h2>
      {auctions.length ? <div className="table-wrap"><table>
        <thead><tr><th>거래일</th><th>작품명</th><th>경매사</th><th>시리즈</th><th>결과</th><th>낙찰가</th></tr></thead>
        <tbody>{auctions.map((auction) => <tr key={auction.id}>
          <td>{auction.auctionDate}</td><td>{auction.artworkTitle}</td><td>{auction.auctionHouse}</td><td>{auction.series ?? "미기재"}</td>
          <td>{auction.result === "sold" ? "낙찰" : auction.result === "unsold" ? "유찰" : auction.result === "withdrawn" ? "취소" : "결과 미확인"}</td>
          <td>{auction.normalizedPriceKRW != null ? formatKrw(auction.normalizedPriceKRW) : auction.reportedPrice != null ? `${auction.reportedPrice.toLocaleString("ko-KR")} ${auction.currency} (기재값)` : "미기재"}</td>
        </tr>)}</tbody>
      </table></div> : <p className="state-panel">연결된 경매 거래가 없습니다.</p>}
    </section>
    {artist.officialCareer.length ? <details className="career-toggle"><summary>작가 경력 보기</summary><ul>{artist.officialCareer.map((record) => <li key={`${record.year}-${record.title}`}>{record.year} · {record.title}</li>)}</ul></details> : null}
    {current.length ? <section className="content-section"><h2>현재 분석 상품</h2><div className="product-grid-art">{current.map((item) => <ProductCard product={item} compact key={item.offering.id} />)}</div></section> : null}
  </PageContainer></main>;
}
