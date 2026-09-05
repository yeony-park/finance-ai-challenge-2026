import Link from "next/link";

import { OfferWatchControl } from "@/components/landing/OfferWatchControl";
import {
  evaluateScenarioReview,
  type EvidenceLevel,
  type ReviewState,
} from "@/lib/knowledge/scenario-review";
import {
  calculateCompletionMetrics,
  SCENARIO_DEMO_DISCLOSURE,
  type ScenarioOffer,
} from "@/lib/knowledge/schema";

import s from "./scenario.module.css";

export const PHASE_LABEL: Readonly<Record<ScenarioOffer["offering"]["phase"], string>> = {
  "subscription-open": "청약 중",
  "listed-trading": "상장 거래",
  settled: "종료",
};

const GROUPS: readonly {
  readonly phase: ScenarioOffer["offering"]["phase"];
  readonly title: string;
  readonly description: string;
}[] = [
  {
    phase: "subscription-open",
    title: "청약 중",
    description: "설정된 일정 기준으로 청약 기간에 해당하는 상품입니다.",
  },
  {
    phase: "listed-trading",
    title: "상장 거래",
    description: "기준일에 거래 가능 조건이 유효한 상품입니다.",
  },
  {
    phase: "settled",
    title: "종료",
    description: "매각·정산 단계까지 입력된 과거 운용 사례입니다.",
  },
];

export const formatWon = (value: number): string =>
  value >= 100_000_000
    ? `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : `${value.toLocaleString("ko-KR")}원`;

export const formatDate = (value: string): string => value.replaceAll("-", ". ");

const REVIEW_TERM_LABEL: Readonly<Record<string, string>> = {
  "건물 기본정보 원장 대조": "건물 기본정보와 건축물대장 확인",
  "현재 연결된 근거 범위에서": "현재 연결된 공개정보에서",
  "현재 공개 근거 범위": "현재 공개정보 범위",
  "판정 근거 부족": "확인 자료 부족",
  "공식 주소정보로 정확 지번을 확인한 뒤 표제부 1회 조회 결과에서 후보 건물명·도로명이 일치하는 레코드를 연결": "주소와 건물명이 일치하는 건축물대장 공개정보를 확인",
  "현재 상품을 제외한 운영그룹 전체 완료 모집단": "현재 상품을 제외한 운영그룹 완료 사례 전체",
  "후보별 BuildingHUB 정확 레코드": "입력 주소별 건축물대장 공개정보의 동일 건물",
  "BuildingHUB 표제부의 정확 레코드": "건축물대장 공개정보의 동일 건물",
  "후보 주소만으로": "입력된 주소만으로",
  "대조할 시나리오 자산 주장": "확인할 시나리오 건물 조건",
  "상품 설명에서 확인하려는 자산값과 단위를 공개해 주세요.": "상품 설명에 기재된 자산값과 단위를 확인하세요.",
  "시나리오 조건과 한계를 입력해 주세요.": "시나리오 조건과 한계를 확인하세요.",
  "데모 규칙 v1 기준": "현재 확인 기준",
  "데모 규칙 v1 결과": "현재 확인 기준에 따른 결과",
  "데모 규칙 v1": "현재 확인 기준",
  "시나리오 입력조건": "시나리오 조건",
  "시나리오 입력": "시나리오 조건",
  "원장 대조": "공개정보 확인",
  "완료 모집단": "완료 사례 전체",
  "scenario-input": "시나리오 조건",
  "운영그룹은": "가상 운영주체는",
  "운영그룹이": "가상 운영주체가",
  "운영그룹의": "가상 운영주체의",
  "운영그룹을": "가상 운영주체를",
  "운영그룹": "가상 운영주체",
  "building-name": "건물명",
  "main-use": "주용도",
  "gross-floor-area": "연면적",
  "land-area": "대지면적",
  "use-approval-date": "사용승인일",
  "payout coverage": "예상 분배 충당배율",
  "stress DSCR": "스트레스 부채상환비율",
};

export const presentReviewText = (value: string): string =>
  Object.entries(REVIEW_TERM_LABEL).reduce(
    (text, [term, label]) => text.replaceAll(term, label),
    value,
  );

const EVIDENCE_LABEL: Readonly<Record<EvidenceLevel, string>> = {
  sufficient: "확인 정보 충분",
  partial: "확인 정보 일부",
  insufficient: "확인 정보 부족",
};

const FINDING_PRIORITY: Readonly<Record<ReviewState, number>> = {
  critical: 3,
  caution: 2,
  insufficient: 1,
  "no-major-conflict": 0,
};

const COMPLETION_OUTCOME_LABEL = {
  profit: "이익",
  loss: "손실",
  breakeven: "보합",
} as const;

const COMPLETION_SCHEDULE_LABEL = {
  early: "조기 종료",
  "on-time": "목표일 종료",
  delayed: "지연 종료",
} as const;

function ScenarioCard({
  offer,
  population,
}: {
  readonly offer: ScenarioOffer;
  readonly population: readonly ScenarioOffer[];
}) {
  const titleId = `${offer.offerId}-title`;
  const review = evaluateScenarioReview(offer, population);
  const completionMetrics = calculateCompletionMetrics(offer);
  const rankedFindings = review.areas
    .flatMap((area) => area.findings)
    .toSorted((left, right) => FINDING_PRIORITY[right.state] - FINDING_PRIORITY[left.state]);
  const attentionFindings = rankedFindings.filter((finding) => finding.state !== "no-major-conflict");
  const priorityFindings = (attentionFindings.length > 0 ? attentionFindings : rankedFindings).slice(0, 2);
  return (
    <article className={s.catalogCard} aria-labelledby={titleId}>
      <div className={s.cardTop}>
        <span className={s.cardType}>부동산</span>
        <span
          className={
            offer.offering.phase === "subscription-open"
              ? `${s.phase} ${s.phaseActive}`
              : s.phase
          }
        >
          {PHASE_LABEL[offer.offering.phase]}
        </span>
      </div>

      <h3 id={titleId} className={s.cardTitle}>
        <Link href={`/real-estate/products/${encodeURIComponent(offer.offerId)}`} className={s.stretchedLink}>
          {offer.asset.publicName}
        </Link>
      </h3>
      <p className={s.cardAddress}>{offer.asset.region}</p>

      <dl className={s.cardFacts}>
        <div>
          <dt>공모총액</dt>
          <dd>{formatWon(offer.offering.amountWon)}</dd>
        </div>
        <div>
          <dt>1단위 가격</dt>
          <dd>{formatWon(offer.offering.unitPriceWon)}</dd>
        </div>
        <div>
          <dt>최소 투자</dt>
          <dd>{formatWon(offer.offering.minimumInvestmentWon)}</dd>
        </div>
        <div>
          <dt>예상 배당</dt>
          <dd>
            연 {offer.offering.expectedAnnualDistributionRatePercent}% · {offer.offering.distributionCycleMonths}개월마다
          </dd>
        </div>
      </dl>

      {offer.completion && completionMetrics ? (
        <div className={s.cardCompletion}>
          <p>과거 종료 시나리오</p>
          <strong>
            손익 {COMPLETION_OUTCOME_LABEL[offer.completion.returnOutcome]} · 단순 총수익률 {completionMetrics.totalReturnRatePercent.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%
          </strong>
          <span>일정 결과 · {COMPLETION_SCHEDULE_LABEL[offer.completion.scheduleOutcome]}</span>
        </div>
      ) : null}

      <div className={s.cardReview}>
        <p className={s.cardReviewState}>
          {offer.completion
            ? `과거 사례 검토 · ${presentReviewText(review.overallLabel)}`
            : presentReviewText(review.overallLabel)}
        </p>
        <p className={s.cardReviewEvidence}>확인 정보 범위 · {EVIDENCE_LABEL[review.evidenceLevel]}</p>
        {priorityFindings.length > 0 ? (
          <ul className={s.cardFindings} aria-label="우선 확인 항목">
            {priorityFindings.map((finding, index) => (
              <li key={`${finding.code}-${index}`}>{presentReviewText(finding.message)}</li>
            ))}
          </ul>
        ) : null}
        <p className={s.cardReviewNote}>투자 적합성·안전성 판단이 아닙니다.</p>
      </div>

      <p className={s.cardMeta}>
        기준일 {formatDate(offer.asOf)} · {PHASE_LABEL[offer.offering.phase]}
      </p>
      <OfferWatchControl
        offerId={offer.offerId}
        offerTitle={offer.title}
        statusText="이 브라우저에 관심 상품으로 저장합니다."
        isAlert={false}
        className={s.cardWatch}
      />
      <span className={s.cardCta}>조건과 문서 보기 →</span>
    </article>
  );
}

export function ScenarioCatalog({
  offers,
  heading = "부동산 상품 검토",
  lead = "공모 조건과 건축물대장 공개정보를 분리해 보고, 확인 자료가 없는 값은 미확인 항목으로 남깁니다.",
  showDisclosure = true,
  isPageHeading = true,
  query = "",
  status = "",
}: {
  readonly offers: readonly ScenarioOffer[];
  readonly heading?: string;
  readonly lead?: string;
  readonly showDisclosure?: boolean;
  readonly isPageHeading?: boolean;
  readonly query?: string;
  readonly status?: string;
}) {
  const keyword = query.trim().toLocaleLowerCase("ko-KR");
  const visible = offers.filter((offer) =>
    (!GROUPS.some((group) => group.phase === status) || offer.offering.phase === status) &&
    `${offer.title} ${offer.asset.publicName} ${offer.asset.region}`.toLocaleLowerCase("ko-KR").includes(keyword),
  );
  const Heading = isPageHeading ? "h1" : "h2";
  return (
    <>
      <section className={s.catalogHero} aria-labelledby="scenario-catalog-title">
        <div className={s.wrap}>
          <p className={s.eyebrow}>부동산 · 공개정보 확인</p>
          <Heading id="scenario-catalog-title" className={s.catalogTitle}>{heading}</Heading>
          <p className={s.catalogLead}>{lead}</p>
          <p className={s.scope}>
            검토 대상 {offers.length}개 · 기준일 {offers[0] ? formatDate(offers[0].asOf) : "미확인"}
          </p>
          <p className={s.demoNote}>검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.</p>
        </div>
      </section>

      {visible.length === 0 ? <p className={s.emptyText}>조건에 맞는 상품이 없습니다. <Link href="/real-estate">검색 조건 초기화</Link></p> : null}
      {GROUPS.map((group, index) => {
        const grouped = visible.filter((offer) => offer.offering.phase === group.phase);
        if (grouped.length === 0) return null;
        return (
          <section
            key={group.phase}
            className={`${s.catalogSection} ${index % 2 === 0 ? s.catalogMuted : ""}`}
            aria-labelledby={`${group.phase}-title`}
          >
            <div className={s.wrap}>
              <div className={s.groupHead}>
                <div>
                  <h2 id={`${group.phase}-title`} className={s.groupTitle}>{group.title}</h2>
                  <p className={s.groupLead}>{group.description}</p>
                </div>
                <span className={s.groupCount}>{grouped.length}건</span>
              </div>
              <div className={s.catalogGrid}>
                {grouped.map((offer) => (
                  <ScenarioCard key={offer.offerId} offer={offer} population={offers} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {showDisclosure ? (
        <aside className={s.disclosure} aria-label="시나리오 데이터 안내">
          <div className={s.wrap}>{SCENARIO_DEMO_DISCLOSURE}</div>
        </aside>
      ) : null}
    </>
  );
}
