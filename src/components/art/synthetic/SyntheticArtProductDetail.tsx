import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  formatSyntheticKrw,
  formatSyntheticPercent,
  latestSyntheticAnnualSellThroughRate,
  resolvedSyntheticTrackReturn,
  sumSyntheticDisclosedCosts,
  syntheticMedianAuctionPrice,
  syntheticPricePremiumRate,
  syntheticUnexplainedDifference,
} from "@/lib/synthetic-art/calculations";
import {
  syntheticOfferingStatusLabels,
  syntheticTrackStatusLabels,
} from "@/lib/synthetic-art/repository";
import type {
  SyntheticAnalysisSection,
  SyntheticArtProduct,
  SyntheticCurrentProduct,
  SyntheticEvidence,
  SyntheticHistoryProduct,
} from "@/lib/synthetic-art/types";

import s from "./synthetic-art.module.css";

const detailTabs = [
  ["summary", "요약"],
  ["price", "공모가"],
  ["comparables", "유사 작품"],
  ["artist", "작가 기록"],
  ["exit", "회수 분석"],
  ["platform", "플랫폼 이력"],
  ["evidence", "근거"],
] as const;

export type SyntheticDetailTab = (typeof detailTabs)[number][0];

export function syntheticDetailTab(value: string | string[] | undefined): SyntheticDetailTab {
  const selected = Array.isArray(value) ? value[0] : value;
  return detailTabs.some(([key]) => key === selected)
    ? (selected as SyntheticDetailTab)
    : "summary";
}

function Breadcrumb({ title }: { readonly title: string }) {
  return (
    <nav className={s.breadcrumb} aria-label="현재 위치">
      <Link href="/art?tab=analysis">← 분석</Link>
      <span aria-hidden="true">/</span>
      <strong aria-current="page">{title}</strong>
    </nav>
  );
}

function SyntheticBadge() {
  return <span className={s.syntheticBadge}>합성 데이터 · 대조 불가</span>;
}

function MetricCard({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}) {
  return (
    <article className={s.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function Insight({ section }: { readonly section: SyntheticAnalysisSection }) {
  return (
    <section className={s.insightBox}>
      <p className={s.kicker}>분석 메모</p>
      <h2>{section.conclusion}</h2>
      <ul className={s.reasonList}>
        {[...section.quantitativeFindings, ...section.qualitativeFindings].map(
          (finding) => (
            <li key={finding}>{finding}</li>
          ),
        )}
      </ul>
    </section>
  );
}

function EvidenceList({ evidence }: { readonly evidence: SyntheticEvidence[] }) {
  return (
    <div className={s.evidenceList}>
      {evidence.map((item) => (
        <details key={item.id}>
          <summary>
            <span>{item.claim}</span>
            <small>
              {item.sourceTitle} · 기준일 {item.asOfDate ?? "없음"}
            </small>
          </summary>
          <div className={s.evidenceBody}>
            <p>
              <strong>사용한 값:</strong> {JSON.stringify(item.value)}
            </p>
            <p>
              <strong>발행 주체:</strong> {item.sourcePublisher}
            </p>
            <p>
              <strong>출처 유형:</strong> {item.sourceType}
            </p>
            <p>
              <strong>계산식:</strong> {item.formula ?? "원시 합성 값"}
            </p>
            {item.notes ? <p>{item.notes}</p> : null}
          </div>
        </details>
      ))}
    </div>
  );
}

const sizeLabel = (product: SyntheticArtProduct): string => {
  const { width, height, depth } = product.artwork;
  const values = [width, height, depth].filter(
    (value): value is number => value != null,
  );
  return values.length ? `${values.join(" × ")}cm` : "공개되지 않음";
};

function CurrentHeader({ product }: { readonly product: SyntheticCurrentProduct }) {
  return (
    <header className={s.detailHeader}>
      <div className={s.detailImage}>
        <Image
          unoptimized
          src={product.artwork.imageUrl ?? "/category-art.jpg"}
          alt={`${product.artwork.title} 합성 작품 이미지`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 520px"
        />
        <SyntheticBadge />
      </div>
      <div className={s.detailCopy}>
        <span className={s.statusBadge}>
          {syntheticOfferingStatusLabels[product.offering.status]}
        </span>
        <h1>{product.artwork.title}</h1>
        <p className={s.entityLinks}>
          <Link href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>
            {product.artist.nameKo}
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            href={`/art/platforms/${encodeURIComponent(product.platform.id)}`}
          >
            {product.platform.name}
          </Link>
        </p>
        <dl className={s.headerFacts}>
          <div>
            <dt>제작연도</dt>
            <dd>{product.artwork.productionYear ?? "공개되지 않음"}</dd>
          </div>
          <div>
            <dt>재료</dt>
            <dd>{product.artwork.medium ?? "공개되지 않음"}</dd>
          </div>
          <div>
            <dt>크기</dt>
            <dd>{sizeLabel(product)}</dd>
          </div>
          <div>
            <dt>에디션</dt>
            <dd>{product.artwork.edition ?? "원화"}</dd>
          </div>
          <div>
            <dt>가상 발행사</dt>
            <dd>{product.issuer.legalName}</dd>
          </div>
          <div>
            <dt>가상 플랫폼</dt>
            <dd>{product.platform.name}</dd>
          </div>
          <div>
            <dt>청약 기간</dt>
            <dd>
              {product.offering.subscriptionStart ?? "미기재"} ~ {product.offering.subscriptionEnd ?? "미기재"}
            </dd>
          </div>
          <div>
            <dt>데이터 기준일</dt>
            <dd>{product.offering.asOfDate}</dd>
          </div>
        </dl>
        <div className={s.headerAmounts}>
          <div>
            <span>총 공모금액</span>
            <strong>{formatSyntheticKrw(product.offering.totalOfferingAmount)}</strong>
          </div>
          <div>
            <span>최소 투자금</span>
            <strong>{formatSyntheticKrw(product.offering.minimumInvestment)}</strong>
          </div>
        </div>
      </div>
    </header>
  );
}

function CurrentSummary({ product }: { readonly product: SyntheticCurrentProduct }) {
  const axes: ReadonlyArray<
    readonly [string, SyntheticAnalysisSection, SyntheticDetailTab]
  > = [
    ["공모가격", product.analysis.priceInsight, "price"],
    ["작가 시장성", product.analysis.artistInsight, "artist"],
    ["회수 가능성", product.analysis.exitInsight, "exit"],
    ["발행사·플랫폼 이력", product.analysis.platformInsight, "platform"],
  ];
  const productPath = `/art/products/${encodeURIComponent(product.offering.id)}`;

  return (
    <div className={s.tabPanel}>
      <section className={s.neutralSummary}>
        <SyntheticBadge />
        <h2>{product.analysis.headline}</h2>
        <p>{product.analysis.summary}</p>
        <div className={s.reasonGrid}>
          {product.analysis.keyReasons.map((reason) => (
            <article className={s.reasonCard} key={reason.title}>
              <strong>{reason.title}</strong>
              <span>{reason.finding}</span>
              <p>{reason.implication}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={s.section}>
        <div className={s.sectionHeading}>
          <div>
            <p className={s.kicker}>분석 항목</p>
            <h2>네 개 분석축의 합성 데이터 메모</h2>
          </div>
        </div>
        <div className={s.axisGrid}>
          {axes.map(([label, section, key]) => (
            <article className={s.axisCard} key={key}>
              <h3>{label}</h3>
              <p>{section.conclusion}</p>
              <Link href={`${productPath}?tab=${key}`}>상세 보기 →</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PricePanel({ product }: { readonly product: SyntheticCurrentProduct }) {
  const premium = syntheticPricePremiumRate(
    product.offering.totalOfferingAmount,
    product.offering.acquisitionPrice,
  );
  const unknown = syntheticUnexplainedDifference(
    product.offering.totalOfferingAmount,
    product.offering.acquisitionPrice,
    product.offering.disclosedCosts,
  );

  return (
    <div className={s.tabPanel}>
      <div className={s.metricGrid}>
        <MetricCard label="작품 취득가" value={formatSyntheticKrw(product.offering.acquisitionPrice)} />
        <MetricCard label="감정가" value={formatSyntheticKrw(product.offering.appraisalValue)} note="취득가와 별도" />
        <MetricCard label="총 공모금액" value={formatSyntheticKrw(product.offering.totalOfferingAmount)} />
        <MetricCard label="공개 비용 합계" value={formatSyntheticKrw(sumSyntheticDisclosedCosts(product.offering.disclosedCosts))} />
        <MetricCard label="설명되지 않는 차액" value={formatSyntheticKrw(unknown)} />
        <MetricCard label="공모가 차이율" value={formatSyntheticPercent(premium)} />
        <MetricCard label="유사 거래 중위값" value={formatSyntheticKrw(syntheticMedianAuctionPrice(product.comparables.map((item) => item.auction)))} />
      </div>
      <section className={s.section}>
        <div className={s.sectionHeading}>
          <h2>공개 비용 구성</h2>
        </div>
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <thead>
              <tr><th>항목</th><th>구분</th><th>금액</th></tr>
            </thead>
            <tbody>
              {product.offering.disclosedCosts.map((cost) => (
                <tr key={`${cost.category}-${cost.label}`}>
                  <td>{cost.label}</td><td>{cost.category}</td><td>{formatSyntheticKrw(cost.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Insight section={product.analysis.priceInsight} />
    </div>
  );
}

function ComparablesPanel({ product }: { readonly product: SyntheticCurrentProduct }) {
  return (
    <div className={s.tabPanel}>
      <div className={s.metricGrid}>
        <MetricCard label="유사 작품 표본" value={`${product.comparables.length}건`} />
        <MetricCard label="동일 시리즈" value={`${product.comparables.filter((item) => item.sameSeries).length}건`} />
        <MetricCard label="낙찰 표본 중위값" value={formatSyntheticKrw(syntheticMedianAuctionPrice(product.comparables.map((item) => item.auction)))} />
      </div>
      <section className={s.section}>
        <div className={s.sectionHeading}><h2>합성 유사 거래 목록</h2></div>
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <thead>
              <tr><th>거래일</th><th>작품명</th><th>경매사</th><th>결과</th><th>거래가</th><th>유사도</th></tr>
            </thead>
            <tbody>
              {product.comparables.map((item) => (
                <tr key={item.id}>
                  <td>{item.auction.auctionDate}</td>
                  <td>{item.auction.artworkTitle}</td>
                  <td>{item.auction.auctionHouse}</td>
                  <td>{item.auction.result === "sold" ? "낙찰" : item.auction.result === "unsold" ? "유찰" : "결과 미확인"}</td>
                  <td>{formatSyntheticKrw(item.auction.normalizedPriceKRW)}</td>
                  <td>{item.similarityScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Insight section={product.analysis.artistInsight} />
    </div>
  );
}

function ArtistPanel({ product }: { readonly product: SyntheticCurrentProduct }) {
  const sellThrough = latestSyntheticAnnualSellThroughRate(
    product.annualMetrics,
    product.auctions,
  );

  return (
    <div className={s.tabPanel}>
      <div className={s.metricGrid}>
        <MetricCard label="최근 경매 표본" value={`${product.auctions.length}건`} />
        <MetricCard label="낙찰률" value={formatSyntheticPercent(sellThrough)} />
        <MetricCard label="유찰률" value={formatSyntheticPercent(sellThrough == null ? null : 100 - sellThrough)} />
        <MetricCard label="동일 시리즈" value={`${product.comparables.filter((item) => item.sameSeries).length}건`} />
      </div>
      <section className={s.section}>
        <div className={s.sectionHeading}>
          <div><h2>{product.artist.nameKo} 거래 표본</h2><p>합성 경매 기록 {product.auctions.length}건</p></div>
          <Link className={s.secondaryButton} href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>작가 전체 이력</Link>
        </div>
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <thead><tr><th>거래일</th><th>작품명</th><th>경매사</th><th>결과</th><th>낙찰가</th></tr></thead>
            <tbody>
              {product.auctions.map((auction) => (
                <tr key={auction.id}>
                  <td>{auction.auctionDate}</td><td>{auction.artworkTitle}</td><td>{auction.auctionHouse}</td>
                  <td>{auction.result === "sold" ? "낙찰" : auction.result === "unsold" ? "유찰" : "결과 미확인"}</td>
                  <td>{formatSyntheticKrw(auction.normalizedPriceKRW)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {product.artist.officialCareer.length ? (
        <details className={s.neutralSummary}>
          <summary>가상 작가 경력 보기</summary>
          <ul className={s.reasonList}>
            {product.artist.officialCareer.map((record) => (
              <li key={`${record.year}-${record.title}`}>{record.year} · {record.title}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <Insight section={product.analysis.artistInsight} />
    </div>
  );
}

function ExitPanel({ product }: { readonly product: SyntheticCurrentProduct }) {
  const completed = product.trackRecords.filter((record) =>
    ["sold", "liquidated", "delayed", "returned", "loss_confirmed"].includes(record.status),
  );
  return (
    <div className={s.tabPanel}>
      <div className={s.metricGrid}>
        <MetricCard label="목표 보유기간" value={product.offering.targetHoldingMonths == null ? "공개되지 않음" : `${product.offering.targetHoldingMonths}개월`} />
        <MetricCard label="중도 양도" value={product.offering.midTermTransferAvailable == null ? "공개되지 않음" : product.offering.midTermTransferAvailable ? "가능" : "불가"} />
        <MetricCard label="연결 플랫폼" value={product.platform.name} />
        <MetricCard label="완료 합성 이력" value={`${completed.length}건`} />
      </div>
      <section className={s.section}>
        <div className={s.sectionHeading}><h2>회수 방식과 기간</h2></div>
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <tbody>
              <tr><th>회수 방식</th><td>{product.offering.exitMethod ?? "공개되지 않음"}</td></tr>
              <tr><th>분배 조건</th><td>{product.offering.distributionTerms ?? "공개되지 않음"}</td></tr>
              <tr><th>목표 보유기간</th><td>{product.offering.targetHoldingMonths == null ? "공개되지 않음" : `${product.offering.targetHoldingMonths}개월`}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
      <Insight section={product.analysis.exitInsight} />
    </div>
  );
}

function PlatformPanel({ product }: { readonly product: SyntheticCurrentProduct }) {
  const counts = Object.entries(
    product.trackRecords.reduce<Record<string, number>>((result, record) => {
      result[record.status] = (result[record.status] ?? 0) + 1;
      return result;
    }, {}),
  );

  return (
    <div className={s.tabPanel}>
      <div className={s.metricGrid}>
        <MetricCard label="전체 과거 상품" value={`${product.trackRecords.length}건`} />
        {counts.slice(0, 7).map(([status, count]) => (
          <MetricCard key={status} label={syntheticTrackStatusLabels[status as keyof typeof syntheticTrackStatusLabels] ?? status} value={`${count}건`} />
        ))}
      </div>
      <section className={s.section}>
        <div className={s.sectionHeading}>
          <div><h2>{product.platform.name} 합성 이력</h2><p>최근 30건을 표시합니다.</p></div>
          <Link className={s.secondaryButton} href={`/art/platforms/${encodeURIComponent(product.platform.id)}`}>플랫폼 전체 이력</Link>
        </div>
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <thead><tr><th>상품</th><th>작가</th><th>상태</th><th>보유기간</th><th>수익률</th></tr></thead>
            <tbody>
              {product.trackRecords.slice(0, 30).map((record) => (
                <tr key={record.id}>
                  <td><Link href={`/art/products/${encodeURIComponent(record.id)}`}>{record.productName}</Link></td>
                  <td>{record.artistName}</td>
                  <td>{syntheticTrackStatusLabels[record.status]}</td>
                  <td>{record.actualHoldingMonths == null ? "미기재" : `${record.actualHoldingMonths.toFixed(1)}개월`}</td>
                  <td>{formatSyntheticPercent(resolvedSyntheticTrackReturn(record))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Insight section={product.analysis.platformInsight} />
    </div>
  );
}

function EvidencePanel({ product }: { readonly product: SyntheticCurrentProduct }) {
  const visibleChanges = product.changeLogs.filter(
    (item) => !item.fieldPath.toLowerCase().includes("verdict"),
  );
  return (
    <div className={s.tabPanel}>
      <section className={s.neutralSummary}>
        <p className={s.kicker}>가상 자료의 근거</p>
        <h2>합성 데이터 근거와 계산식</h2>
        <p>
          외부 원문과 연결하지 않은 합성 fixture입니다. 아래 값은 화면과 계산
          흐름 확인에만 사용하며 검증 판정을 만들지 않습니다.
        </p>
      </section>
      {product.analysis.conflicts.length ? (
        <section className={s.insightBox}>
          <h2>자료 충돌 메모</h2>
          {product.analysis.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}
        </section>
      ) : null}
      <EvidenceList evidence={product.evidence} />
      {visibleChanges.length ? (
        <section className={s.section}>
          <div className={s.sectionHeading}><h2>변경 이력</h2></div>
          <div className={s.dataTableWrap}>
            <table className={s.dataTable}>
              <thead><tr><th>변경일</th><th>필드</th><th>이전 값</th><th>새 값</th></tr></thead>
              <tbody>
                {visibleChanges.map((item) => (
                  <tr key={item.id}>
                    <td>{item.changedAt}</td><td>{item.fieldPath}</td><td>{String(item.previousValue ?? "-")}</td><td>{String(item.newValue ?? "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CurrentProductDetail({
  product,
  tab,
  aiSummary,
  evidenceQuery,
}: {
  readonly aiSummary?: ReactNode;
  readonly evidenceQuery?: ReactNode;
  readonly product: SyntheticCurrentProduct;
  readonly tab: SyntheticDetailTab;
}) {
  const productPath = `/art/products/${encodeURIComponent(product.offering.id)}`;
  return (
    <>
      <Breadcrumb title={product.offering.title} />
      <CurrentHeader product={product} />
      <DetailTabs productPath={productPath} tab={tab} />
      {tab === "summary" ? <>{aiSummary}<CurrentSummary product={product} /></> : null}
      {tab === "price" ? <PricePanel product={product} /> : null}
      {tab === "comparables" ? <ComparablesPanel product={product} /> : null}
      {tab === "artist" ? <ArtistPanel product={product} /> : null}
      {tab === "exit" ? <ExitPanel product={product} /> : null}
      {tab === "platform" ? <PlatformPanel product={product} /> : null}
      {tab === "evidence" ? <><EvidencePanel product={product} />{evidenceQuery}</> : null}
    </>
  );
}

function DetailTabs({
  productPath,
  tab,
}: {
  readonly productPath: string;
  readonly tab: SyntheticDetailTab;
}) {
  return (
    <nav className={s.detailTabs} aria-label="상품 상세 분석 탭">
      {detailTabs.map(([key, label]) => (
        <Link
          key={key}
          className={tab === key ? s.activeTab : undefined}
          aria-current={tab === key ? "page" : undefined}
          href={`${productPath}?tab=${key}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function HistoricalSummary({ product }: { readonly product: SyntheticHistoryProduct }) {
  const record = product.trackRecord;
  const fields: ReadonlyArray<readonly [string, string]> = [
    ["상태", syntheticTrackStatusLabels[record.status]],
    ["청약 시작일", record.subscriptionStart ?? "미기재"],
    ["청약 종료일", record.subscriptionEnd ?? "미기재"],
    ["보유기간", record.actualHoldingMonths == null ? "미기재" : `${record.actualHoldingMonths.toFixed(1)}개월`],
    ["매각일", record.soldAt ?? "미기재"],
    ["청산일", record.liquidatedAt ?? "미기재"],
    ["매각 경로", record.soldPlace ?? "미기재"],
    ["시뮬레이션 수익률", formatSyntheticPercent(resolvedSyntheticTrackReturn(record))],
  ];

  return (
    <div className={s.tabPanel}>
      <section className={s.section}>
        <div className={s.sectionHeading}>
          <div><p className={s.kicker}>가상 회수 이력</p><h2>시뮬레이션 공모·보유·회수 값</h2></div>
        </div>
        <div className={s.metricGrid}>
          <MetricCard label="시뮬레이션 금액" value={formatSyntheticKrw(product.offering.totalOfferingAmount)} />
          <MetricCard label="보유기간" value={record.actualHoldingMonths == null ? "공개되지 않음" : `${record.actualHoldingMonths.toFixed(1)}개월`} />
          <MetricCard label={record.status === "returned" ? "반환 기재액" : "매각 기재액"} value={formatSyntheticKrw(record.exitAmount)} />
          <MetricCard label="정산 기재액" value={formatSyntheticKrw(record.totalDistribution)} />
          <MetricCard label="시뮬레이션 수익률" value={formatSyntheticPercent(resolvedSyntheticTrackReturn(record))} />
          <MetricCard label="계산 수익률" value={formatSyntheticPercent(record.calculatedSettlementReturnPct)} />
          <MetricCard label="매각일" value={record.soldAt ?? "미기재"} />
          <MetricCard label="청산일" value={record.liquidatedAt ?? "미기재"} />
        </div>
      </section>
      <section className={s.section}>
        <div className={s.sectionHeading}><h2>합성 이력 필드</h2></div>
        <div className={s.dataTableWrap}>
          <table className={s.dataTable}>
            <thead><tr><th>항목</th><th>값</th></tr></thead>
            <tbody>{fields.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HistoricalTabPanel({
  product,
  tab,
}: {
  readonly product: SyntheticHistoryProduct;
  readonly tab: SyntheticDetailTab;
}) {
  if (tab === "summary") return <HistoricalSummary product={product} />;

  const record = product.trackRecord;
  const title = detailTabs.find(([key]) => key === tab)?.[1] ?? "상세 분석";
  const metrics: ReadonlyArray<readonly [string, string]> = tab === "price"
    ? [
        ["시뮬레이션 금액", formatSyntheticKrw(product.offering.totalOfferingAmount)],
        ["매각 기재액", formatSyntheticKrw(record.exitAmount)],
        ["정산 기재액", formatSyntheticKrw(record.totalDistribution)],
        ["계산 수익률", formatSyntheticPercent(record.calculatedSettlementReturnPct)],
      ]
    : tab === "exit"
      ? [
          ["보유기간", record.actualHoldingMonths == null ? "공개되지 않음" : `${record.actualHoldingMonths.toFixed(1)}개월`],
          ["매각일", record.soldAt ?? "미기재"],
          ["청산일", record.liquidatedAt ?? "미기재"],
          ["시뮬레이션 수익률", formatSyntheticPercent(resolvedSyntheticTrackReturn(record))],
        ]
      : [];

  return (
    <div className={s.tabPanel}>
      {metrics.length > 0 ? (
        <section className={s.section}>
          <div className={s.sectionHeading}><h2>{title}</h2></div>
          <div className={s.metricGrid}>
            {metrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
          </div>
        </section>
      ) : (
        <section className={s.neutralSummary}>
          <h2>{title}</h2>
          <p>이 합성 이력에는 {title}과 직접 연결된 데이터가 없습니다.</p>
        </section>
      )}
    </div>
  );
}

function HistoricalProductDetail({
  product,
  tab,
}: {
  readonly product: SyntheticHistoryProduct;
  readonly tab: SyntheticDetailTab;
}) {
  const record = product.trackRecord;
  const productPath = `/art/products/${encodeURIComponent(product.offering.id)}`;

  return (
    <>
      <Breadcrumb title={product.offering.title} />
      <header className={s.detailHeader}>
        <div className={s.detailImage}>
          <Image
            unoptimized
            src={product.artwork.imageUrl ?? "/category-art.jpg"}
            alt={`${product.artwork.title} 합성 작품 이미지`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 520px"
          />
          <SyntheticBadge />
        </div>
        <div className={s.detailCopy}>
          <span className={s.statusBadge}>{syntheticTrackStatusLabels[record.status]}</span>
          <h1>{product.offering.title}</h1>
          <p className={s.entityLinks}>
            <Link href={`/art/artists/${encodeURIComponent(product.artist.id)}`}>{product.artist.nameKo}</Link>
            <span aria-hidden="true">·</span>
            <Link href={`/art/platforms/${encodeURIComponent(product.platform.id)}`}>{product.platform.name}</Link>
          </p>
          <p className={s.detailLead}>
            실제 플랫폼, 발행사, 거래 기록과 연결되지 않은 합성 시뮬레이션입니다.
          </p>
          <dl className={s.headerFacts}>
            <div><dt>작품</dt><dd>{product.artwork.title}</dd></div>
            <div><dt>제작연도</dt><dd>{product.artwork.productionYear ?? "공개되지 않음"}</dd></div>
            <div><dt>재료</dt><dd>{product.artwork.medium ?? "공개되지 않음"}</dd></div>
            <div><dt>크기</dt><dd>{sizeLabel(product)}</dd></div>
            <div><dt>시뮬레이션 기간</dt><dd>{record.subscriptionStart ?? "미기재"} ~ {record.subscriptionEnd ?? "미기재"}</dd></div>
            <div><dt>기준일</dt><dd>{product.offering.asOfDate}</dd></div>
          </dl>
        </div>
      </header>
      <DetailTabs productPath={productPath} tab={tab} />
      <HistoricalTabPanel product={product} tab={tab} />
    </>
  );
}

export function SyntheticArtProductDetail({
  product,
  tab,
  aiSummary,
  evidenceQuery,
}: {
  readonly aiSummary?: ReactNode;
  readonly evidenceQuery?: ReactNode;
  readonly product: SyntheticArtProduct;
  readonly tab: SyntheticDetailTab;
}) {
  return (
    <div className={s.detailPage}>
      {product.kind === "current" ? (
        <CurrentProductDetail product={product} tab={tab} aiSummary={aiSummary} evidenceQuery={evidenceQuery} />
      ) : (
        <HistoricalProductDetail product={product} tab={tab} />
      )}
    </div>
  );
}
