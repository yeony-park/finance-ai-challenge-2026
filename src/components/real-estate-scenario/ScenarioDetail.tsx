import type { ReactNode } from "react";

import {
  calculateCompletionMetrics,
  SCENARIO_DEMO_DISCLOSURE,
  type ScenarioOffer,
} from "@/lib/knowledge/schema";
import {
  evaluateScenarioReview,
  type EvidenceLevel,
  type ScenarioReviewFinding,
  type ReviewState,
  type ScenarioReview,
} from "@/lib/knowledge/scenario-review";

import { formatDate, formatWon, PHASE_LABEL, presentReviewText } from "./ScenarioCatalog";
import { ScenarioEvidenceQuery } from "./ScenarioEvidenceQuery";
import s from "./scenario.module.css";

const FACT_LABEL: Readonly<Record<string, string>> = {
  "building-name": "건물명",
  "main-use": "주용도",
  "gross-floor-area": "연면적",
  "land-area": "대지면적",
  "use-approval-date": "사용승인일",
};

const RETURN_OUTCOME_LABEL: Readonly<Record<NonNullable<ScenarioOffer["completion"]>["returnOutcome"], string>> = {
  profit: "이익",
  loss: "손실",
  breakeven: "보합",
};

const SCHEDULE_OUTCOME_LABEL: Readonly<Record<NonNullable<ScenarioOffer["completion"]>["scheduleOutcome"], string>> = {
  early: "목표보다 조기 종료",
  "on-time": "목표일 종료",
  delayed: "목표일보다 정산 지연",
};

const ASSUMPTION_TAG_LABEL: Readonly<Record<NonNullable<ScenarioOffer["completion"]>["assumptionTags"][number], string>> = {
  "interest-rate": "금리",
  vacancy: "공실",
  "lease-termination": "임대차 종료",
  "repair-capex": "수선비",
  liquidity: "유동성",
  tenant: "임차인",
  "early-sale": "조기 매각",
  "market-conditions": "시장 여건",
};

const REVIEW_STATE_LABEL: Readonly<Record<ReviewState, string>> = {
  "no-major-conflict": "연결된 공개정보에서 핵심 불일치 미발견",
  caution: "주의해서 볼 조건이 있습니다",
  critical: "중요한 불일치가 확인됐습니다",
  insufficient: "핵심 근거가 부족해 판단을 보류합니다",
};

const EVIDENCE_LEVEL_LABEL: Readonly<Record<EvidenceLevel, string>> = {
  sufficient: "확인 정보 충분",
  partial: "확인 정보 일부",
  insufficient: "확인 정보 부족",
};

const INVESTOR_PROTECTION_LABEL = {
  rightForm: "권리 형태",
  fundsSafekeeping: "투자금 보관",
  bankruptcyRemoteness: "도산 시 재산 분리",
  rightsAdministration: "권리 관리",
  disputeResolution: "분쟁 해결 절차",
  issuanceDistributionSeparation: "발행·유통 역할 분리",
} as const;

const INVESTOR_PROTECTION_STATUS = {
  "confirmed-in-scenario": "시나리오 조건 등록",
  attention: "주의 필요",
  unknown: "미확인",
} as const;

const OPERATOR_LABEL: Readonly<Record<ScenarioOffer["operatorGroupId"], string>> = {
  "operator-a": "가상 운영주체 A",
  "operator-b": "가상 운영주체 B",
  "operator-c": "가상 운영주체 C",
};

const FINDING_PRIORITY: Readonly<Record<ReviewState, number>> = {
  critical: 3,
  caution: 2,
  insufficient: 1,
  "no-major-conflict": 0,
};

const formatPercent = (value: number): string =>
  `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;

const factValue = (fact: ScenarioOffer["asset"]["facts"][number]): string => {
  if (fact.status === "unknown") return "확인하지 못함";
  const value = typeof fact.value === "number" ? fact.value.toLocaleString("ko-KR") : String(fact.value ?? "확인하지 못함");
  return fact.unit ? `${value}${fact.unit === "m2" ? "㎡" : fact.unit}` : value;
};

const valueWithUnit = (value: string | number | null, unit?: string): string => {
  const formatted = typeof value === "number" ? value.toLocaleString("ko-KR") : String(value ?? "확인하지 못함");
  return unit ? `${formatted}${unit === "m2" ? "㎡" : unit}` : formatted;
};

function FactGrid({ children }: { readonly children: ReactNode }) {
  return <dl className={s.detailFacts}>{children}</dl>;
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function ReviewAreas({ review }: { readonly review: ScenarioReview }) {
  return (
    <div className={s.areaGrid}>
      {review.areas.map((area) => (
        <section key={area.area} className={s.areaCard}>
          <div className={s.areaHead}>
            <h3>{presentReviewText(area.headline)}</h3>
            <span>{REVIEW_STATE_LABEL[area.state]} · {EVIDENCE_LEVEL_LABEL[area.evidenceLevel]}</span>
          </div>
          <div className={s.areaFindings}>
            {area.findings.map((finding, index) => (
              <div key={`${finding.code}-${index}`}>
                <p><strong>판단 근거</strong>{presentReviewText(finding.message)}</p>
                <p><strong>영향</strong>{presentReviewText(finding.impact)}</p>
                <p><strong>다음 확인 질문</strong>{presentReviewText(finding.nextQuestion)}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ReviewSummary({
  review,
  historical = false,
}: {
  readonly review: ScenarioReview;
  readonly historical?: boolean;
}) {
  return (
    <>
      <div className={s.reviewSummary}>
        <div>
          <span>확인 결과 요약</span>
          <strong>{REVIEW_STATE_LABEL[review.overallState]}</strong>
        </div>
        <div>
          <span>확인 정보 범위</span>
          <strong>{EVIDENCE_LEVEL_LABEL[review.evidenceLevel]}</strong>
        </div>
      </div>
      <p className={s.reviewDisclaimer}>
        {historical
          ? "현재 투자 추천이 아니라 가상 운영주체의 과거 시나리오 이력과 확인 기준을 살펴보는 사례입니다."
          : "투자 적합성·안전성·수익성을 평가한 결과가 아닙니다."}
      </p>
      <ReviewAreas review={review} />
    </>
  );
}

function CompletionCashFlow({ offer }: { readonly offer: ScenarioOffer }) {
  const completion = offer.completion;
  const metrics = calculateCompletionMetrics(offer);
  if (!completion || !metrics) return null;
  const signedWon = metrics.profitLoss < 0
    ? `-${formatWon(Math.abs(metrics.profitLoss))}`
    : formatWon(metrics.profitLoss);

  const cashFlow = [
    ["매수금액", formatWon(offer.offering.amountWon)],
    ["누적배당", formatWon(completion.cumulativeDistributionWon)],
    ["매각회수", formatWon(completion.saleProceedsWon)],
    ["환급", formatWon(completion.refundsWon)],
    ["수수료", formatWon(completion.feesWon)],
    ["추가납입", formatWon(completion.additionalContributionsWon)],
  ] as const;

  return (
    <section className={s.completionSection} aria-labelledby="scenario-completion-title">
      <div className={s.detailWrap}>
        <p className={s.eyebrow}>종료 상품 현금흐름</p>
        <h2 id="scenario-completion-title" className={s.sectionTitle}>매수부터 종료까지 입력값 한눈에 보기</h2>
        <p className={s.sectionLead}>현재 투자 추천이나 실제 상품 성과가 아닙니다. 완료 시나리오의 입력값과 입력값으로 계산한 금액을 순서대로 표시합니다.</p>
        <div className={s.completionTotals}>
          <FactGrid>
            <Fact label="투자기준금액 · 입력값으로 계산" value={formatWon(metrics.investedCash)} />
            <Fact label="세전 순회수액 · 입력값으로 계산" value={formatWon(metrics.netCash)} />
            <Fact label="세전 손익 · 입력값으로 계산" value={`${signedWon} · ${RETURN_OUTCOME_LABEL[completion.returnOutcome]}`} />
            <Fact label="단순 총수익률 · 입력값으로 계산" value={formatPercent(metrics.totalReturnRatePercent)} />
            <Fact label="목표 종료일" value={formatDate(completion.targetExitOn)} />
            <Fact label="실제 종료일" value={formatDate(completion.actualExitOn)} />
            <Fact label="일정 결과" value={SCHEDULE_OUTCOME_LABEL[completion.scheduleOutcome]} />
          </FactGrid>
          <p className={s.blockNote}>시나리오 가정 원인 · {completion.assumptionTags.map((tag) => ASSUMPTION_TAG_LABEL[tag]).join(" · ")}</p>
          <p className={s.blockNote}>시나리오 가정 요약 · {completion.assumptionSummary}</p>
          <p className={s.blockNote}>보유일수 {metrics.holdingDays.toLocaleString("ko-KR")}일은 청약 시작일부터 실제 종료일까지의 단순 달력 일수입니다. 단순 총수익률은 연환산 수익률이 아닙니다.</p>
        </div>
        <ol className={s.cashFlow}>
          {cashFlow.map(([label, value]) => (
            <li key={label}><span>{label}</span><strong>{value}</strong></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ScenarioSources({ offer }: { readonly offer: ScenarioOffer }) {
  if (offer.sources.length === 0) return null;
  return (
    <ul className={s.sourceList} aria-label="건물 정보 출처">
      {offer.sources.map((source) => (
        <li key={source.sourceId}>
          <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.label} (새 창)`}>
            출처 · {source.label}
          </a>
          <span>{formatDate(source.asOf)} 기준 · {presentReviewText(source.method)}</span>
        </li>
      ))}
    </ul>
  );
}

const priorityFindings = (review: ScenarioReview): readonly ScenarioReviewFinding[] => {
  const ranked = review.areas
    .flatMap((area) => area.findings)
    .toSorted((left, right) => FINDING_PRIORITY[right.state] - FINDING_PRIORITY[left.state]);
  const attention = ranked.filter((finding) => finding.state !== "no-major-conflict");
  return [...new Map((attention.length > 0 ? attention : ranked).map((finding) => [
    `${finding.code}:${finding.message}:${finding.nextQuestion}`,
    finding,
  ])).values()].slice(0, 2);
};

const reviewHeadline = (review: ScenarioReview): string => {
  if (review.overallState !== "caution") return REVIEW_STATE_LABEL[review.overallState];
  const cause = priorityFindings(review).find((finding) => finding.state === "caution");
  return cause
    ? `${REVIEW_STATE_LABEL.caution} · ${presentReviewText(cause.message).replace(/\.$/, "")}`
    : REVIEW_STATE_LABEL.caution;
};

const presentPriorityFinding = (
  offer: ScenarioOffer,
  finding: ScenarioReviewFinding,
): { readonly reason: string; readonly next: string } => {
  if (finding.code !== "asset-value-conflict") {
    return {
      reason: presentReviewText(finding.message),
      next: presentReviewText(finding.nextQuestion),
    };
  }
  const conflict = offer.claimedAssetFacts
    .map((claim) => ({
      claim,
      observed: offer.asset.facts.find(
        (fact) => fact.status === "confirmed" && fact.field === claim.field && (fact.unit ?? "") === (claim.unit ?? ""),
      ),
    }))
    .find(({ claim, observed }) => observed?.status === "confirmed" && observed.value !== claim.value);
  if (!conflict?.observed || conflict.observed.status !== "confirmed") {
    return {
      reason: presentReviewText(finding.message),
      next: presentReviewText(finding.nextQuestion),
    };
  }
  const { claim, observed } = conflict;
  const difference = typeof claim.value === "number" && typeof observed.value === "number" && observed.value !== 0
    ? ` · 공개정보 대비 ${(Math.abs(claim.value - observed.value) / Math.abs(observed.value) * 100).toFixed(2)}% 차이`
    : "";
  return {
    reason: `${FACT_LABEL[claim.field] ?? claim.field} 시나리오 조건 ${valueWithUnit(claim.value, claim.unit)} · 건축물대장 공개정보 ${valueWithUnit(observed.value, observed.unit)}${difference}`,
    next: "건축물대장 공개정보나 상품 설명의 정정 자료를 확인할 때까지 판단을 보류하세요.",
  };
};

function BuildingOverview({
  offer,
  muted,
}: {
  readonly offer: ScenarioOffer;
  readonly muted: boolean;
}) {
  const confirmedCount = offer.asset.facts.filter((fact) => fact.status === "confirmed").length;
  const unknownCount = offer.asset.facts.length - confirmedCount;
  const hasConfirmed = confirmedCount > 0;
  const sourceDates = [...new Set(offer.sources.map((source) => formatDate(source.asOf)))];
  return (
    <section className={`${s.detailSection} ${muted ? s.detailMuted : ""}`} aria-labelledby="scenario-building-title">
      <div className={s.detailWrap}>
        <p className={s.eyebrow}>건물 기본정보</p>
        <h2 id="scenario-building-title" className={s.sectionTitle}>건물 정보</h2>
        <p className={s.sectionLead}>
          {hasConfirmed
            ? "건축물대장 공개정보와 연결된 주소 및 확인값입니다. 확인하지 못한 항목은 추정하지 않습니다."
            : "건물명과 주소는 검토용 입력이며, 같은 건물의 건축물대장 공개정보인지 확인되지 않았습니다. 확인하지 못한 값은 추정하지 않습니다."}
        </p>
        <div className={s.buildingOverview}>
          <FactGrid>
            <Fact label="대상 건물" value={offer.asset.publicName} />
            <Fact
              label={hasConfirmed ? "주소" : "주소 · 동일 건물 확인 전"}
              value={offer.asset.roadAddress}
            />
            {offer.asset.facts.map((fact) => (
              <Fact
                key={fact.field}
                label={FACT_LABEL[fact.field] ?? fact.field}
                value={`${factValue(fact)} · ${fact.status === "confirmed" ? "건축물대장 확인" : "건축물대장 미확인"}`}
              />
            ))}
            <Fact
              label="건축물대장 대조 결과"
              value={hasConfirmed
                ? `확인 ${confirmedCount}건${unknownCount > 0 ? ` · 미확인 ${unknownCount}건` : ""}`
                : "동일 건물 미확인 · 값을 추정하지 않음"}
            />
            <Fact label="출처 기준일" value={sourceDates.length > 0 ? sourceDates.join(" · ") : "연결된 공식 출처 없음"} />
          </FactGrid>
          <ScenarioSources offer={offer} />
        </div>
      </div>
    </section>
  );
}

function ReviewAtAGlance({
  offer,
  review,
}: {
  readonly offer: ScenarioOffer;
  readonly review: ScenarioReview;
}) {
  const findings = priorityFindings(review).map((finding) => presentPriorityFinding(offer, finding));
  return (
    <section className={`${s.detailSection} ${s.detailMuted}`} aria-labelledby="scenario-glance-title">
      <div className={s.detailWrap}>
        <p className={s.eyebrow}>핵심만 먼저 보기</p>
        <h2 id="scenario-glance-title" className={s.sectionTitle}>투자 검토 한눈에</h2>
        <div className={s.reviewSummary}>
          <div>
            <span>공개정보 확인 상태</span>
            <strong>{reviewHeadline(review)}</strong>
          </div>
          <div>
            <span>확인 정보 범위</span>
            <strong>{EVIDENCE_LEVEL_LABEL[review.evidenceLevel]}</strong>
          </div>
        </div>
        {review.overallState === "no-major-conflict" ? (
          <p className={s.reviewDisclaimer}>연결된 공개정보에서 핵심 불일치를 찾지 못했다는 뜻이며, 안전성 보장이나 투자 추천이 아닙니다.</p>
        ) : null}
        <div className={s.glanceGrid}>
          <div>
            <h3>왜 이런 상태인가요?</h3>
            <ul className={s.plainList}>{findings.map((finding) => <li key={finding.reason}>{finding.reason}</li>)}</ul>
          </div>
          <div>
            <h3>다음에 확인할 질문·행동</h3>
            <ul className={s.plainList}>{findings.map((finding) => <li key={finding.next}>{finding.next}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function InvestorProtectionBlock({ offer }: { readonly offer: ScenarioOffer }) {
  const keys = Object.keys(INVESTOR_PROTECTION_LABEL) as readonly (keyof typeof INVESTOR_PROTECTION_LABEL)[];
  return (
    <section className={s.detailSection} aria-labelledby="scenario-protection-title">
      <div className={s.detailWrap}>
        <p className={s.eyebrow}>등록된 시나리오 조건</p>
        <h2 id="scenario-protection-title" className={s.sectionTitle}>권리와 투자자 보호구조</h2>
        <p className={s.sectionLead}>실제 계약이나 법적 효력을 확인한 결과가 아니라, 검토를 위해 등록한 조건과 미확인 범위입니다.</p>
        <div className={s.protectionGrid}>
          {keys.map((key) => {
            const item = offer.investorProtection[key];
            return (
              <section key={key} className={s.protectionItem}>
                <div>
                  <h3>{INVESTOR_PROTECTION_LABEL[key]}</h3>
                  <span>{INVESTOR_PROTECTION_STATUS[item.status]}</span>
                </div>
                <p>{item.statement}</p>
              </section>
            );
          })}
        </div>
        <p className={s.blockNote}>공통 확인사항 · 각 조건의 계약서, 책임 주체, 예외와 집행 절차를 별도로 확인해야 합니다.</p>
      </div>
    </section>
  );
}

export function ScenarioDetail({
  offer,
  operatorHistory,
}: {
  readonly offer: ScenarioOffer;
  readonly operatorHistory: readonly ScenarioOffer[];
}) {
  const listedDate = offer.offering.listedOn ? formatDate(offer.offering.listedOn) : "상장 전";
  const history = operatorHistory
    .filter((entry) => entry.offerId !== offer.offerId)
    .toSorted((left, right) =>
      (right.completion?.actualExitOn ?? "").localeCompare(left.completion?.actualExitOn ?? ""),
    );
  const review = evaluateScenarioReview(offer, [offer, ...history]);
  const isSettled = offer.offering.phase === "settled";

  return (
    <div>
      <header className={s.detailHero}>
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>부동산 상품 검토</p>
          <h1 className={s.detailTitle}>{offer.asset.publicName}</h1>
          <span className={s.phase}>{PHASE_LABEL[offer.offering.phase]}</span>
          <p className={s.detailLead}>
            {isSettled ? "과거 검토 사례" : "검토 결과"} · {reviewHeadline(review)}. 기준일 {formatDate(offer.asOf)}.
          </p>
          <p className={s.demoNote}>검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.</p>
        </div>
      </header>

      {isSettled ? <CompletionCashFlow offer={offer} /> : null}

      <BuildingOverview offer={offer} muted={!isSettled} />

      <section className={`${s.detailSection} ${isSettled ? s.detailMuted : ""}`} aria-labelledby="scenario-basic-title">
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>{isSettled ? "종료 당시 입력 조건" : "상품 조건"}</p>
          <h2 id="scenario-basic-title" className={s.sectionTitle}>{isSettled ? "당시 상품 투자조건" : "상품 투자조건"}</h2>
          <div className={s.detailGrid}>
            <section className={s.detailCard}>
              <h3>금액과 일정</h3>
              <FactGrid>
                <Fact label="1단위 가격" value={formatWon(offer.offering.unitPriceWon)} />
                <Fact label="최소 투자" value={formatWon(offer.offering.minimumInvestmentWon)} />
                <Fact label="공모총액" value={formatWon(offer.offering.amountWon)} />
                <Fact label="발행수량" value={`${offer.offering.unitCount.toLocaleString("ko-KR")}단위`} />
                <Fact label="청약기간" value={`${formatDate(offer.offering.opensOn)} ~ ${formatDate(offer.offering.closesOn)}`} />
                <Fact label="상장일" value={listedDate} />
                <Fact label="현재 단계" value={PHASE_LABEL[offer.offering.phase]} />
              </FactGrid>
            </section>
            <section className={s.detailCard}>
              <h3>배당과 비용</h3>
              <FactGrid>
                <Fact label="예상 연 배당" value={formatPercent(offer.offering.expectedAnnualDistributionRatePercent)} />
                <Fact label="배당 주기" value={`${offer.offering.distributionCycleMonths}개월마다`} />
                <Fact label="거래수수료율" value={formatPercent(offer.offering.tradingFeeRatePercent)} />
                <Fact label="총비용률" value={formatPercent(offer.offering.totalExpenseRatePercent)} />
                <Fact label="목표 보유기간" value={`${offer.offering.targetHoldingMonths}개월`} />
                <Fact label="거래 상태" value={offer.offering.tradabilityStatus === "available" ? "거래 가능" : offer.offering.tradabilityStatus === "ended" ? "종료" : "상장 전"} />
              </FactGrid>
            </section>
            <section className={`${s.detailCard} ${s.detailCardWide}`}>
              <h3>보유·회수 조건</h3>
              <ul className={s.plainList}>{offer.offering.exitConditions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>

          <section className={s.conditionsBlock} aria-labelledby="scenario-conditions-title">
            <h3 id="scenario-conditions-title">투자 조건 상세</h3>
            <p className={s.blockLead}>실제 권리·대출·임대차 공개사실이 아니라, 상품 검토를 위해 설정한 시나리오 조건입니다.</p>
            <FactGrid>
              <Fact label="1단위 권리" value={offer.offering.unitRightsSummary} />
              <Fact label="배당 산식" value={offer.offering.distributionBasis} />
              <Fact label="수수료 적용 범위" value={offer.offering.feeScope} />
              <Fact label="세금 안내" value={offer.offering.taxNotice} />
              <Fact label="배정·환불" value={offer.offering.allocationRefundPolicy} />
              <Fact label="청산 순위" value={offer.offering.liquidationPriority} />
              <Fact label="대출 조건 (시나리오)" value={`LTV ${formatPercent(offer.offering.financing.ltvPercent)} · 연 ${formatPercent(offer.offering.financing.annualInterestRatePercent)} · 만기 ${formatDate(offer.offering.financing.maturityOn)}`} />
              <Fact label="임대 조건 (시나리오)" value={`공실률 ${formatPercent(offer.offering.leaseAssumptions.vacancyRatePercent)} · ${offer.offering.leaseAssumptions.tenantConcentrationNote}`} />
            </FactGrid>
            <div className={s.twoColumns}>
              <div>
                <h4>연장 조건</h4>
                <ul className={s.plainList}>{offer.offering.extensionConditions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>대출·임대 시나리오의 한계</h4>
                <ul className={s.plainList}>
                  {[...offer.offering.financing.limitations, ...offer.offering.leaseAssumptions.limitations].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>

      {!isSettled ? <ReviewAtAGlance offer={offer} review={review} /> : null}

      <InvestorProtectionBlock offer={offer} />

      {!isSettled ? (
        <section className={`${s.detailSection} ${s.detailMuted}`} aria-labelledby="scenario-area-review-title">
          <div className={s.detailWrap}>
            <p className={s.eyebrow}>5영역 투자 검토</p>
            <h2 id="scenario-area-review-title" className={s.sectionTitle}>공개정보 기반 검토 결과</h2>
            <p className={s.sectionLead}>상단 검토 결과를 건물 기본정보, 수익·비용, 금융, 회수, 가상 운영주체 이력으로 나눠 확인합니다.</p>
            <p className={s.reviewDisclaimer}>투자 적합성·안전성·수익성을 평가한 결과가 아닙니다.</p>
            <ReviewAreas review={review} />
          </div>
        </section>
      ) : null}

      <section className={`${s.detailSection} ${isSettled ? s.detailMuted : ""}`} aria-labelledby="scenario-review-title">
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>{isSettled ? "과거 이력 검증 사례" : "확인 범위와 남은 질문"}</p>
          <h2 id="scenario-review-title" className={s.sectionTitle}>
            {isSettled ? "가상 운영주체의 과거 종료 사례 검토" : "남은 확인 범위와 운영 이력"}
          </h2>
          <p className={s.sectionLead}>
            {isSettled
              ? "현재 투자 대상의 추천이 아니라, 종료 시나리오에 같은 확인 기준을 적용한 결과와 남은 확인 항목을 보여줍니다."
              : "추천이나 안전성 점수가 아니라, 이 화면에서 확인한 범위와 확인하지 못한 범위를 보여줍니다."}
          </p>

          {isSettled ? <ReviewSummary review={review} historical /> : null}

          <div className={s.reviewStack}>
            <section className={s.reviewBlock}>
              <h3>중요 조건과 한계</h3>
              <div className={s.twoColumns}>
                <div>
                  <h4>시나리오 조건을 읽는 기준</h4>
                  <ul className={s.plainList}>{offer.assumptions.map((item) => <li key={item}>{presentReviewText(item)}</li>)}</ul>
                </div>
                <div>
                  <h4>아직 확인하지 못한 범위</h4>
                  <ul className={s.plainList}>{offer.limitations.map((item) => <li key={item}>{presentReviewText(item)}</li>)}</ul>
                </div>
              </div>
            </section>

            <section className={s.reviewBlock}>
              <h3>{OPERATOR_LABEL[offer.operatorGroupId]}의 과거 종료 사례 · {history.length}건</h3>
              <p className={s.blockLead}>현재 상품을 제외한 전체 완료 이력을 검토에 반영하고, 아래에는 최근 종료일 순 최대 3건을 표시합니다. 실제 운영사 실적이나 현재 상품의 전망이 아닙니다.</p>
              {history.length > 0 ? (
                <div className={s.historyGrid}>
                  {history.slice(0, 3).map((past) => {
                    const pastMetrics = calculateCompletionMetrics(past);
                    return (
                      <article key={past.offerId}>
                        <h4>{past.asset.publicName}</h4>
                        <p>{past.completion ? formatDate(past.completion.actualExitOn) : "회수일 미확인"} 종료</p>
                        <p>{pastMetrics ? `손익 ${RETURN_OUTCOME_LABEL[past.completion!.returnOutcome]} · 일정 ${SCHEDULE_OUTCOME_LABEL[past.completion!.scheduleOutcome]}` : "입력값 계산 불가"}</p>
                        <p>{pastMetrics ? `단순 총수익률 ${formatPercent(pastMetrics.totalReturnRatePercent)}` : null}</p>
                      </article>
                    );
                  })}
                </div>
              ) : <p className={s.emptyText}>현재 상품을 제외한 같은 가상 운영주체의 종료 사례가 없습니다.</p>}
            </section>
          </div>
        </div>
      </section>

      <div className={s.detailWrap}>
        <ScenarioEvidenceQuery scenarioId={offer.scenarioId} offerId={offer.offerId} />
      </div>

      <aside className={s.disclosure} aria-label="시나리오 데이터 안내">
        <div className={s.wrap}>{SCENARIO_DEMO_DISCLOSURE}</div>
      </aside>
    </div>
  );
}
