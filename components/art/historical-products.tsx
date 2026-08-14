import Image from "next/image";
import Link from "next/link";
import { formatKrw, formatPercent } from "@/lib/domain/calculations";
import type { HistoricalOfferingView, TrackRecord, TrackStatus } from "@/lib/art/types";
import { Breadcrumb, MetricCard, PageContainer } from "@/components/art/ui";

const trackStatusLabels: Record<TrackStatus, string> = {
  offering: "청약",
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

export function trackStatusLabel(record: TrackRecord) {
  return trackStatusLabels[record.status];
}

export function formatRecordedMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return "공개되지 않음";
  if (currency === "KRW") return formatKrw(amount);
  return `${amount.toLocaleString("ko-KR")} ${currency ?? "(통화 미확인)"}`;
}

export function sourceReportedReturn(record: TrackRecord) {
  return record.sourceReportedReturnPct ?? null;
}

export function calculatedSettlementReturn(record: TrackRecord) {
  return record.calculatedSettlementReturnPct ?? null;
}

function artworkSize(product: HistoricalOfferingView) {
  const values = [product.artwork.width, product.artwork.height, product.artwork.depth].filter((item): item is number => item != null);
  return values.length ? `${values.join(" × ")}cm` : "공개되지 않음";
}

function sourceDate(product: HistoricalOfferingView) {
  return product.offering.subscriptionEnd ?? product.offering.subscriptionStart ?? product.offering.liquidatedAt ?? product.offering.soldAt ?? product.offering.asOfDate;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function present(value: unknown): string {
  if (value == null || value === "") return "미기재";
  if (Array.isArray(value)) return value.map(present).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number") return value.toLocaleString("ko-KR");
  return String(value);
}

function sourceFields(product: HistoricalOfferingView) {
  const payload = object(product.sourcePayload);
  const record = object(payload.record);
  const annotation = object(payload.annotation);
  const annotationDisplay = object(annotation.display);
  const list = object(payload.list);
  const detail = object(payload.detail);
  const artwork = object(detail.artwork);
  const imageList = object(detail.imageList);
  const sale = object(payload.sale_price);
  const settlement = object(payload.settlement);

  if (product.trackRecord.sourceDataset === "artnguide_track_records") {
    return [
      ["status", record.status],
      ["status_label", annotationDisplay.status_label],
      ["startAt", record.startAt],
      ["endAt", record.endAt],
      ["thumbnail", record.thumbnail],
      ["yearItem", record.yearItem],
      ["artMaterial", record.artMaterial],
      ["artSize", record.artSize],
      ["soldTime", record.soldTime],
      ["soldMoney", record.soldMoney],
      ["soldPlace", record.soldPlace],
      ["profit", record.profit],
      ["yearProfit", record.yearProfit],
      ["dateHold", record.dateHold],
    ];
  }

  if (product.trackRecord.sourceDataset === "weshareart_research") {
    return [
      ["investBeginDateTime", list.investBeginDateTime ?? detail.investBeginDateTime],
      ["investEndDateTime", list.investEndDateTime ?? detail.investEndDateTime],
      ["estimateMinAmount", detail.estimateMinAmount],
      ["estimateMaxAmount", detail.estimateMaxAmount],
      ["imageList", imageList.list],
      ["purchasedPercent", detail.purchasedPercent],
      ["purchasedQuantity", detail.purchasedQuantity],
      ["availableQuantity", detail.availableQuantity],
      ["artistNameForEnglish", list.artistNameForEnglish],
      ["titleForEnglish", list.titleForEnglish],
      ["productionYear", artwork.productionYear],
      ["material", artwork.material],
      ["size1", artwork.size1],
      ["size2", artwork.size2],
      ["pieceAmount", detail.pieceAmount],
      ["quantity", detail.quantity],
      ["saleYieldPercent", detail.saleYieldPercent ?? list.saleYieldPercent],
    ];
  }

  return [
    ["disclosure_title", payload.disclosure_title],
    ["page_display_date", payload.page_display_date],
    ["initial amount_krw", object(payload.initial_price).amount_krw],
    ["sale amount", sale.amount],
    ["sale currency", sale.currency],
    ["settlement amount_krw", settlement.amount_krw],
    ["payout_date", settlement.payout_date],
    ["holding_period_days", payload.holding_period_days],
    ["source_reported_return_pct", payload.source_reported_return_pct],
    ["calculated_settlement_return_pct", payload.calculated_settlement_return_pct],
  ];
}

function sourceExitLabel(record: TrackRecord) {
  return record.status === "returned" ? "원문 soldMoney 기재값" : "매각 기재액";
}

function StatusEvidence({ record }: { record: TrackRecord }) {
  return <>
    <div><dt>원문 상태 코드</dt><dd>{record.rawStatus ?? "미기재"}</dd></div>
    {record.rawStatusLabel ? <div><dt>원문 상태 표기</dt><dd>{record.rawStatusLabel}</dd></div> : null}
    {record.statusConflict ? <div><dt>상태 대조</dt><dd>원문 코드와 상태 표기가 충돌함</dd></div> : null}
  </>;
}

export function HistoricalProductCard({ product }: { product: HistoricalOfferingView }) {
  const record = product.trackRecord;
  const reportedReturn = sourceReportedReturn(record);
  const calculatedReturn = calculatedSettlementReturn(record);
  const exitCurrency = record.exitCurrency ?? record.currency;

  return <article className="art-product-card historical-product-card">
    <div className="product-image">
      <Image unoptimized src={product.artwork.imageUrl ?? "/art-placeholder.svg"} alt={`${product.artwork.title} 원본 이미지 ${product.artwork.imageUrl ? "연결" : "미저장"}`} fill sizes="(max-width:720px) 100vw,340px" />
      <span className="real-data-badge">과거 기록 · 플랫폼 자체 게시</span>
    </div>
    <div className="product-card-body">
      <div className="product-status-row">
        <span className="status-label">{trackStatusLabel(record)}</span>
        <span className="condition-chip">{product.platform.name}</span>
      </div>
      <h3><Link href={`/products/${product.offering.id}`}>{product.offering.title}</Link></h3>
      <p className="entity-links"><Link href={`/artists/${product.artist.id}`}>{product.artist.nameKo}</Link><span>·</span><span>{product.artwork.title}</span></p>
      <dl className="card-metrics">
        <div><dt>공모·공동구매 금액</dt><dd>{formatRecordedMoney(product.offering.totalOfferingAmount, product.offering.currency)}</dd></div>
        <div><dt>실제 보유기간</dt><dd>{product.offering.actualHoldingMonths == null ? "공개되지 않음" : `${product.offering.actualHoldingMonths.toFixed(1)}개월`}</dd></div>
        <div><dt>{sourceExitLabel(record)}</dt><dd>{formatRecordedMoney(record.exitAmount, exitCurrency)}</dd></div>
        <div><dt>플랫폼 기재 수익률</dt><dd>{formatPercent(reportedReturn)}</dd></div>
        <div><dt>DAKER 계산 수익률</dt><dd>{formatPercent(calculatedReturn)}</dd></div>
      </dl>
      <p className="card-headline">원문 상태 코드 : {record.rawStatus ?? "미기재"}{record.rawStatusLabel ? ` · 원문 상태 표기 : ${record.rawStatusLabel}` : ""}{record.statusConflict ? " · 상태 표기 충돌" : ""} · 기준일 : {sourceDate(product)}</p>
      <p className="table-note">{record.sourceLabel ?? "플랫폼 자체 게시 기록"} · 독립 검증된 발행사 청산 실적으로 합산하지 않음</p>
      <div className="card-actions"><Link className="button button-primary" href={`/products/${product.offering.id}`}>이력 상세 보기</Link></div>
    </div>
  </article>;
}

function SourcePayload({ payload }: { payload: unknown }) {
  return <details className="evidence-list-art"><summary><span>원본 구조화 payload</span><small>저장본 원값</small></summary><pre><code>{JSON.stringify(payload, null, 2)}</code></pre></details>;
}

export function HistoricalProductDetail({ product }: { product: HistoricalOfferingView }) {
  const record = product.trackRecord;
  const reportedReturn = sourceReportedReturn(record);
  const calculatedReturn = calculatedSettlementReturn(record);
  const fields = sourceFields(product);
  const exitCurrency = record.exitCurrency ?? record.currency;

  return <main id="main-content" className="detail-page"><PageContainer>
    <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "청약 상품·과거 이력", href: "/products?scope=historical" }, { label: product.offering.title }]} />
    <header className="product-detail-header">
      <div className="detail-image">
        <Image unoptimized src={product.artwork.imageUrl ?? "/art-placeholder.svg"} alt={`${product.artwork.title} 원본 이미지 ${product.artwork.imageUrl ? "연결" : "미저장"}`} fill priority sizes="(max-width:720px) 100vw,420px" />
        <span className="real-data-badge">과거 기록 · 플랫폼 자체 게시</span>
      </div>
      <div>
        <span className="status-label">{trackStatusLabel(record)}</span>
        <h1>{product.offering.title}</h1>
        <p className="detail-entities"><Link href={`/artists/${product.artist.id}`}>{product.artist.nameKo}</Link><span>·</span><Link href={`/platforms/${product.platform.id}`}>{product.platform.name}</Link></p>
        <p>법적 발행사 identity가 미검증이어도 상품 기록은 숨기지 않으며, 플랫폼 기재값과 DAKER 계산값을 서로 대체하지 않습니다.</p>
        <dl className="header-facts">
          <div><dt>작품</dt><dd>{product.artwork.title}</dd></div>
          <div><dt>제작연도</dt><dd>{product.artwork.productionYear ?? "공개되지 않음"}</dd></div>
          <div><dt>재료</dt><dd>{product.artwork.medium ?? "공개되지 않음"}</dd></div>
          <div><dt>크기</dt><dd>{artworkSize(product)}</dd></div>
          <div><dt>청약·공동구매 기간</dt><dd>{product.offering.subscriptionStart ?? "미기재"} ~ {product.offering.subscriptionEnd ?? "미기재"}</dd></div>
          <div><dt>기준일</dt><dd>{sourceDate(product)}</dd></div>
        </dl>
      </div>
    </header>
    <section className="content-section">
      <div className="section-heading-art"><div><p className="section-kicker">HISTORICAL PRIORITY FIELDS</p><h2>공모·보유·회수 기재값</h2></div></div>
      <div className="metric-grid-art">
        <MetricCard label="공모·공동구매 금액" value={formatRecordedMoney(product.offering.totalOfferingAmount, product.offering.currency)} note={record.currencyNote ?? "통화 기준 미기재"} />
        <MetricCard label="실제 보유기간" value={product.offering.actualHoldingMonths == null ? "공개되지 않음" : `${product.offering.actualHoldingMonths.toFixed(1)}개월`} />
        <MetricCard label={sourceExitLabel(record)} value={formatRecordedMoney(product.offering.actualExitAmount, exitCurrency)} note={record.statusConflict ? "반환 상태와 원문 상태 표기를 별도 보존" : undefined} />
        <MetricCard label="배당·정산 기재액" value={formatRecordedMoney(product.offering.actualDistributionAmount, "KRW")} />
        <MetricCard label="플랫폼 기재 수익률" value={formatPercent(reportedReturn)} />
        <MetricCard label="DAKER 계산 수익률" value={formatPercent(calculatedReturn)} note={calculatedReturn == null ? "계산값 미기재" : "비연환산 계산값"} />
        <MetricCard label="원문 매각일" value={product.offering.soldAt ?? "미기재"} />
        <MetricCard label="청산일" value={product.offering.liquidatedAt ?? "미기재"} />
        <MetricCard label="매각 경로" value={record.soldPlace ?? "미기재"} />
      </div>
    </section>
    <section className="content-section">
      <h2>원본 핵심 필드</h2>
      <div className="table-wrap"><table><thead><tr><th>원본 필드</th><th>저장값</th></tr></thead><tbody>{fields.map(([label, value]) => <tr key={String(label)}><th>{String(label)}</th><td>{present(value)}</td></tr>)}</tbody></table></div>
    </section>
    <section className="content-section">
      <h2>최종 상태·출처</h2>
      <dl className="header-facts">
        <div><dt>정규화 상태</dt><dd>{trackStatusLabel(record)}</dd></div>
        <StatusEvidence record={record} />
        <div><dt>식별 상태</dt><dd>{product.identityStatus}{record.identityDetail ? ` · ${record.identityDetail}` : ""}</dd></div>
        <div><dt>법적 발행사 매핑</dt><dd>{record.legalIssuerStatus ?? "레코드별 미확인"}</dd></div>
        <div><dt>원본 데이터셋</dt><dd>{record.sourceDataset ?? "미기재"}</dd></div>
        <div><dt>legacy reference</dt><dd>{record.legacySourceRef ?? record.id}</dd></div>
      </dl>
      {record.evidenceNote ? <p className="table-note">한계 : {record.evidenceNote}</p> : null}
      {record.sourceUrl ? <p><a className="button button-secondary" href={record.sourceUrl} target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></p> : null}
      <SourcePayload payload={product.sourcePayload} />
    </section>
  </PageContainer></main>;
}
