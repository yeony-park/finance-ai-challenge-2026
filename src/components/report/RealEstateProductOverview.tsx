import type { ReactNode } from "react";

import type { RealEstateUserGroup } from "@/components/site/offers";
import type {
  ProductSource,
  RealEstateProductSummary,
} from "@/lib/verify/real-estate-product-summary";

import s from "./report.module.css";

const formatWon = (value: number): string =>
  value >= 100_000_000
    ? `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 4 })}억원`
    : `${value.toLocaleString("ko-KR")}원`;

const formatDate = (value: string): string =>
  value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1. $2. $3.");

const formatPercent = (value: number): string =>
  `${value.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}%`;

const httpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

function ProductSources({ sources }: { readonly sources: readonly ProductSource[] }) {
  const unique = sources.filter(
    (source, index) =>
      sources.findIndex((candidate) => candidate.url === source.url) === index,
  );
  if (unique.length === 0) return null;

  return (
    <div className={s.productSources} aria-label="상품 정보 출처">
      {unique.map((source) => {
        const text = `${source.label} · ${formatDate(source.asOf)} 기준`;
        const url = httpUrl(source.url);
        return url ? (
          <a
            key={`${source.url}-${source.asOf}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${text} (새 창)`}
            className={s.evSourceLink}
          >
            출처 · {text}
          </a>
        ) : (
          <span key={`${source.url}-${source.asOf}`}>출처 · {text}</span>
        );
      })}
    </div>
  );
}

interface ProductFact {
  readonly label: string;
  readonly value: string;
}

function ProductGroup({
  title,
  facts,
  sources = [],
  children,
}: {
  readonly title: string;
  readonly facts: readonly ProductFact[];
  readonly sources?: readonly ProductSource[];
  readonly children?: ReactNode;
}) {
  return (
    <section className={s.productGroup}>
      <h3 className={s.productGroupTitle}>{title}</h3>
      <dl className={s.productFacts}>
        {facts.map((fact) => (
          <div key={fact.label} className={s.productFact}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {children}
      <ProductSources sources={sources} />
    </section>
  );
}

export function RealEstateProductOverview({
  summary,
  listingGroup,
}: {
  readonly summary: RealEstateProductSummary;
  readonly listingGroup: RealEstateUserGroup;
}) {
  const unitName = summary.platform?.label === "BBRIC" ? "1BRIC 가격" : "1단위 가격";
  const operationSources: ProductSource[] = [];
  if (summary.tradingFee.source) operationSources.push(summary.tradingFee.source);
  for (const fee of summary.totalExpenseRates) operationSources.push(fee.source);
  for (const fee of summary.frontEndSalesFeeRates) operationSources.push(fee.source);
  if (summary.contractualDistributionCycle.source)
    operationSources.push(summary.contractualDistributionCycle.source);
  if (summary.trustPeriod.source) operationSources.push(summary.trustPeriod.source);
  if (summary.expectedDistributionRate.source)
    operationSources.push(summary.expectedDistributionRate.source);

  const totalExpense = summary.totalExpenseRates.length
    ? summary.totalExpenseRates
        .map((fee) => `${fee.fundClass} ${formatPercent(fee.ratePercent)}`)
        .join(" · ")
    : "문서 확인 필요";
  const frontEndFee = summary.frontEndSalesFeeRates.length
    ? summary.frontEndSalesFeeRates
        .map((fee) => `${fee.fundClass} ${formatPercent(fee.ratePercent)}`)
        .join(" · ")
    : "문서 확인 필요";
  const distribution = summary.latestActualDistribution;
  const saleDifference = summary.sale
    ? summary.sale.amountWon - summary.offer.amountWon
    : null;
  const isSou = summary.offerId === "real-estate-sou-daejeon-startup";
  const isSample = listingGroup === "development-sample";
  const recoverySources = summary.sale?.source
    ? [summary.sale.source]
    : summary.platform
      ? [summary.platform.source]
      : [];
  const souLimitations = isSou
    ? summary.limitations.filter((item) =>
        /182,000|법적 소유권 이전일|외부 독립 검증|법인 등록명/.test(item),
      )
    : [];

  return (
    <section className={s.productOverview} aria-labelledby="product-overview-title">
      <header className={s.productOverviewHead}>
        <div>
          <p className={s.productEyebrow}>
            {isSample ? "개발 샘플 · 상품 기본정보" : "상품 기본정보"}
          </p>
          <h2 id="product-overview-title" className={s.productOverviewTitle}>
            {isSou ? "상품 조건과 운용·종료 이력" : "투자 조건과 운용 정보"}
          </h2>
        </div>
        {summary.platform ? (
          <p className={s.productPlatform}>플랫폼 · {summary.platform.label}</p>
        ) : null}
      </header>

      <section className={s.productAvailability} aria-labelledby="availability-title">
        <p id="availability-title" className={s.productAvailabilityLabel}>
          {listingGroup === "historical-completed" ? "상품 분류" : "현재 매수 가능 여부"}
        </p>
        <p className={s.productAvailabilityValue}>
          {listingGroup === "current-confirmed"
            ? "공개 원문상 현재 청약·매수 가능 확인"
            : listingGroup === "operating-needs-check"
              ? "현재 거래 가능 여부 미확인"
              : listingGroup === "historical-completed"
                ? "과거 상품 운용·종료 이력"
                : "개발 샘플"}
        </p>
        <p className={s.productAvailabilityDetail}>
          {listingGroup === "operating-needs-check"
            ? "청약 종료 · 플랫폼 공개자료 기준 운용 중. 공개 웹 원문에서 현재 거래 가능 여부를 확인하지 못했습니다."
            : listingGroup === "historical-completed"
              ? "운영사 발표상 매각·대금지급 완료 · 외부 종료 검증 미확인"
              : isSample
                ? "실제 공개 상품 목록·집계에 포함되지 않는 개발용 샘플입니다."
                : "공개 원문의 청약 일정 또는 최근 거래 가능 근거를 확인했습니다. 앱·회원 전용 상태까지 보증하지 않습니다."}
        </p>
      </section>

      <div className={s.productOverviewGrid}>
        <ProductGroup
          title={isSou ? "공모 당시 조건" : "투자 조건"}
          facts={[
            { label: "공모총액", value: formatWon(summary.offer.amountWon) },
            {
              label: unitName,
              value: `${summary.offer.unitPriceWon.toLocaleString("ko-KR")}원`,
            },
            {
              label: "발행수량",
              value: `${summary.offer.unitCount.toLocaleString("ko-KR")}단위`,
            },
            {
              label: "청약기간",
              value: `${formatDate(summary.subscription.opensOn)} ~ ${formatDate(summary.subscription.closesOn)}`,
            },
            { label: "상장일", value: formatDate(summary.listedOn) },
          ]}
          sources={summary.platform ? [summary.platform.source] : []}
        />

        <ProductGroup
          title="운용·비용"
          facts={[
            {
              label: "결산주기",
              value: summary.contractualDistributionCycle.value ?? "문서 확인 필요",
            },
            {
              label: "신탁기간",
              value: summary.trustPeriod.value ?? "문서 확인 필요",
            },
            {
              label: "거래수수료",
              value:
                summary.tradingFee.ratePercent === undefined
                  ? "문서 확인 필요"
                  : formatPercent(summary.tradingFee.ratePercent),
            },
            { label: "클래스별 총보수", value: totalExpense },
            { label: "선취판매수수료", value: frontEndFee },
            {
              label: isSou ? "당시 예상배당률" : "예상배당률",
              value:
                summary.expectedDistributionRate.status === "confirmed"
                  ? (summary.expectedDistributionRate.value ?? "확인됨")
                  : "미확인 · 투자설명서·규약 PDF 확인 필요",
            },
          ]}
          sources={operationSources}
        />

        {distribution ? (
          <ProductGroup
            title="실제 지급 이력"
            facts={[
              {
                label: `${distribution.period}기 총 지급액`,
                value: `${distribution.totalAmountWon.toLocaleString("ko-KR")}원`,
              },
              {
                label: "원문 1BRIC당",
                value: `${distribution.sourceAmountPerUnitWon.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}원`,
              },
              {
                label: "총액÷수량 단순 검산",
                value: `${distribution.simpleCalculatedAmountPerUnitWon.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}원`,
              },
              {
                label: "운용기간",
                value: `${formatDate(distribution.operatingFrom)} ~ ${formatDate(distribution.operatingTo)} · ${distribution.operatingDays}일`,
              },
              { label: "지급일", value: formatDate(distribution.paidOn) },
            ]}
            sources={[distribution.source]}
          >
            <p className={s.productWarning}>{distribution.warning}</p>
          </ProductGroup>
        ) : null}

        <ProductGroup
          title="회수 정보"
          facts={
            summary.sale && saleDifference !== null
              ? [
                  { label: "매각금액", value: formatWon(summary.sale.amountWon) },
                  { label: summary.sale.dateLabel, value: formatDate(summary.sale.dealOn) },
                  ...(isSou
                    ? []
                    : [
                        {
                          label: "공모금액 대비 단순 금액차",
                          value: `${saleDifference >= 0 ? "+" : "-"}${formatWon(Math.abs(saleDifference))}`,
                        },
                      ]),
                ]
              : [
                  { label: "회수 단계", value: "매각 전" },
                  { label: "매각조건", value: "문서 확인 필요" },
                ]
          }
          sources={recoverySources}
        >
          <p className={s.productCaution}>
            {isSou
              ? "매각금액과 정리매매 종료일은 운영사 발표입니다. 법적 소유권 이전일과 외부 독립 검증은 확인되지 않았습니다."
              : summary.sale
              ? "단순 금액차는 비용·분배를 반영한 순수익 또는 수익률이 아닙니다."
              : "매각조건은 공개 화면만으로 확정하지 않으며 투자설명서·규약 PDF 본문 확인이 필요합니다."}
          </p>
        </ProductGroup>
      </div>
      {souLimitations.length > 0 ? (
        <section className={s.productLimitations} aria-labelledby="sou-limitations-title">
          <h3 id="sou-limitations-title">확인 한계</h3>
          <ul>
            {souLimitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
