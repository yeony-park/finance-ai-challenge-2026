import Link from "next/link";
import type { ProductView, TrackRecord, TrackStatus } from "@/lib/art/types";
import { formatKrw } from "@/lib/domain/calculations";
import { resolvedTrackReturn } from "@/lib/art/track-return";

function trackOfferingAmount(record: TrackRecord) {
  return record.offeringAmount != null ? formatKrw(record.offeringAmount) : record.reportedAmount != null ? `${record.reportedAmount.toLocaleString("ko-KR")} (통화 미기재)` : "공개되지 않음";
}

function trackStatusLabel(record: TrackRecord) {
  const labels: Record<TrackStatus, string> = {
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
  return labels[record.status];
}


export function ComparablePriceChart({ product }: { product: ProductView }) {
  const sold = product.comparables.filter((comparable) => comparable.auction.result === "sold" && comparable.auction.normalizedPriceKRW != null);
  if (!sold.length) return <div className="chart-empty">비교 가능한 낙찰 데이터가 없습니다.</div>;

  const prices = sold.map((comparable) => comparable.auction.normalizedPriceKRW as number);
  const max = Math.max(product.offering.totalOfferingAmount ?? 0, ...prices);
  return <figure className="chart-card">
    <figcaption><strong>유사 작품 낙찰가 분포</strong><span>단위 : 억원</span></figcaption>
    <div className="scatter-chart" role="img" aria-label={sold.map((comparable) => `${comparable.auction.auctionDate} ${comparable.auction.normalizedPriceKRW}원`).join(", ")}>
      <span className="offering-line" style={{ bottom: `${(product.offering.totalOfferingAmount ?? 0) / max * 100}%` }}>현재 공모가</span>
      {sold.map((comparable, index) => <i key={comparable.id} className={comparable.sameSeries ? "same-series" : "other-series"} style={{ left: `${8 + index / (sold.length - 1 || 1) * 84}%`, bottom: `${(comparable.auction.normalizedPriceKRW as number) / max * 88}%` }} title={`${comparable.auction.artworkTitle} ${formatKrw(comparable.auction.normalizedPriceKRW)}`} />)}
    </div>
    <div className="chart-legend"><span><i className="legend-same" />동일 시리즈</span><span><i className="legend-other" />다른 시리즈</span></div>
    <p className="chart-summary">동일 작가라도 시리즈·재료·크기가 다른 거래는 별도로 표시합니다.</p>
  </figure>;
}

export function AuctionResultChart({ product }: { product: ProductView }) {
  const latest = product.annualMetrics.at(-1);
  const sold = latest?.sold ?? product.auctions.filter((auction) => auction.result === "sold").length;
  const unsold = latest?.unsold ?? product.auctions.filter((auction) => auction.result === "unsold").length;
  const total = sold + unsold;
  if (!total) return <div className="chart-empty"><strong>낙찰·유찰 집계 없음</strong><p>발행인 기재 사례 수를 독립 경매 집계로 대체하지 않았습니다.</p></div>;
  return <figure className="chart-card">
    <figcaption><strong>낙찰·유찰 분포</strong><span>총 {total}건</span></figcaption>
    <div className="result-bar"><span style={{ width: `${sold / total * 100}%` }}>낙찰 {sold}</span><span style={{ width: `${unsold / total * 100}%` }}>유찰 {unsold}</span></div>
    <p className="chart-summary">낙찰률 {(sold / total * 100).toFixed(1)}%, 유찰률 {(unsold / total * 100).toFixed(1)}%입니다.</p>
  </figure>;
}

export function ComparableSalesTable({ product }: { product: ProductView }) {
  return <div className="table-wrap"><table>
    <caption className="sr-only">유사 작품 거래 목록</caption>
    <thead><tr><th>거래일</th><th>작품명</th><th>경매사</th><th>재료·크기</th><th>결과</th><th>낙찰가</th><th>유사성</th></tr></thead>
    <tbody>{product.comparables.map((comparable) => <tr key={comparable.id}>
      <td>{comparable.auction.auctionDate}</td>
      <td>{comparable.auction.artworkTitle}</td>
      <td>{comparable.auction.auctionHouse}</td>
      <td>{comparable.auction.medium}<br />{comparable.auction.width}×{comparable.auction.height}cm</td>
      <td>{comparable.auction.result === "sold" ? "낙찰" : comparable.auction.result === "unsold" ? "유찰" : comparable.auction.result === "withdrawn" ? "취소" : "결과 미확인"}</td>
      <td>{comparable.auction.normalizedPriceKRW != null ? formatKrw(comparable.auction.normalizedPriceKRW) : comparable.auction.reportedPrice != null ? `${comparable.auction.reportedPrice.toLocaleString("ko-KR")} ${comparable.auction.currency} (기재값)` : "공개되지 않음"}</td>
      <td>{Math.round(comparable.similarityScore * 100)}%<br /><small>{comparable.comparisonReason}</small></td>
    </tr>)}</tbody>
  </table></div>;
}

export function TrackRecordTable({ product }: { product: ProductView }) {
  const rows = product.trackRecords.slice(0, 10);
  return <>
    <div className="table-wrap"><table>
      <caption className="sr-only">플랫폼 과거 상품 목록</caption>
      <thead><tr><th>상품명</th><th>기초 작품·작가</th><th>공모금액</th><th>목표/실제</th><th>총 배당</th><th>매각금액</th><th>최종 상태</th></tr></thead>
      <tbody>{rows.map((record) => <tr key={record.id}>
        <td>{record.productName}</td>
        <td>{record.artworkTitle}<br /><small>{record.artistName}</small></td>
        <td>{trackOfferingAmount(record)}</td>
        <td>{record.targetHoldingMonths ?? "-"}/{record.actualHoldingMonths == null ? "-" : record.actualHoldingMonths.toFixed(1)}개월</td>
        <td>{formatKrw(record.totalDistribution)}</td>
        <td>{record.exitAmount == null ? "공개되지 않음" : record.exitCurrency === "KRW" || !record.exitCurrency ? formatKrw(record.exitAmount) : `${record.exitAmount.toLocaleString("ko-KR")} ${record.exitCurrency}`}</td>
        <td>{trackStatusLabel(record)}</td>
      </tr>)}</tbody>
    </table></div>
    {product.trackRecords.length > rows.length ? <p className="table-note">최근 연결 레코드 {rows.length}건만 표시합니다. 전체 {product.trackRecords.length}건은 플랫폼 상세에서 확인할 수 있습니다.</p> : null}
  </>;
}

export function PlatformRecordOutcomeChart({ records }: { records: TrackRecord[] }) {
  const groups: Array<{ key: TrackStatus; label: string }> = [
    { key: "offering", label: "모집 중" },
    { key: "operating", label: "운용 중" },
    { key: "exit_in_progress", label: "매각 진행" },
    { key: "sold", label: "매각 완료" },
    { key: "returned", label: "반환" },
    { key: "liquidated", label: "청산 완료" },
    { key: "delayed", label: "지연 청산" },
    { key: "unsold", label: "미매각" },
    { key: "loss_confirmed", label: "손실 확인" },
    { key: "unknown", label: "상태 미확인" },
  ];
  const populated = groups.map((group) => ({ ...group, count: records.filter((record) => record.status === group.key).length })).filter((group) => group.count > 0);
  const total = Math.max(records.length, 1);
  return <figure className="chart-card">
    <figcaption><strong>연결 DB 상태 분포</strong><span>총 {records.length}건</span></figcaption>
    <div className="outcome-bar">{populated.map((group, index) => <span key={group.key} className={`outcome-${index % 4 === 0 ? "good" : index % 4 === 1 ? "warn" : index % 4 === 2 ? "neutral" : "danger"}`} style={{ width: `${group.count / total * 100}%` }}>{group.label} {group.count}</span>)}</div>
    <ul className="chart-data-list">{populated.map((group) => <li key={group.key}><span>{group.label}</span><strong>{group.count}건</strong></li>)}</ul>
    <p className="chart-summary">합성 이력의 상태를 분리해 시뮬레이션 결과를 비교합니다.</p>
  </figure>;
}

export function PlatformTrackRecordTable({ records, total, page, pageSize }: { records: TrackRecord[]; total: number; page: number; pageSize: number }) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  return <><div className="table-wrap"><table><caption className="sr-only">합성 플랫폼 이력</caption><thead><tr><th>상품·작품</th><th>작가</th><th>시뮬레이션 금액</th><th>청약 시작일</th><th>청약 종료일</th><th>청산일</th><th>보유기간</th><th>시뮬레이션 수익률</th><th>최종 상태</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><Link href={`/products/historical-offering-${record.id}`}>{record.productName}</Link><br /><small>{record.artworkTitle}</small></td><td>{record.artistName}</td><td>{trackOfferingAmount(record)}</td><td>{record.subscriptionStart ?? "미기재"}</td><td>{record.subscriptionEnd ?? "미기재"}</td><td>{record.liquidatedAt ?? "미기재"}</td><td>{record.actualHoldingMonths == null ? "미기재" : `${record.actualHoldingMonths.toFixed(1)}개월`}</td><td>{resolvedTrackReturn(record) == null ? "미기재" : `${resolvedTrackReturn(record)?.toFixed(2)}%`}</td><td>{trackStatusLabel(record)}</td></tr>)}</tbody></table></div><p className="table-note">검색 결과 {total}건 중 {rangeStart}–{Math.min(page * pageSize, total)}건. 실제 투자 실적이 아닌 합성 시뮬레이션 값입니다.</p></>;
}

export function ExitTimelineChart({ product }: { product: ProductView }) {
  return <figure className="chart-card">
    <figcaption><strong>매각·청산 타임라인</strong><span>목표 24개월 기준</span></figcaption>
    <div className="timeline-chart">{product.trackRecords.filter((record) => record.actualHoldingMonths != null).slice(0, 5).map((record) => <div key={record.id}>
      <span>{record.productName}</span>
      <i style={{ width: `${Math.min(100, (record.actualHoldingMonths ?? 0) / 36 * 100)}%` }} className={(record.delayDays ?? 0) > 0 ? "delayed" : "ontime"} />
      <b>{record.actualHoldingMonths}개월 · {(record.delayDays ?? 0) > 0 ? `${record.delayDays}일 지연` : "기간 내"}</b>
    </div>)}</div>
    <p className="chart-summary">매각일과 청산일을 구분해 실제 보유기간을 집계했습니다.</p>
  </figure>;
}
