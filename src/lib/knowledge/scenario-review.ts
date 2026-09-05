import { normalizeKorean } from "./search";
import type { ScenarioOffer } from "./schema";

export type ReviewAreaId =
  | "asset"
  | "return-cost"
  | "financing"
  | "exit"
  | "operator-history";
export type ReviewState = "no-major-conflict" | "caution" | "critical" | "insufficient";
export type EvidenceLevel = "sufficient" | "partial" | "insufficient";
export type FindingBasis = "observed" | "scenario" | "cross-check";

export interface ScenarioReviewFinding {
  readonly code: string;
  readonly state: ReviewState;
  readonly message: string;
  readonly basis: FindingBasis;
  readonly impact: string;
  readonly sourceIds: readonly string[];
  readonly nextQuestion: string;
}

export interface ScenarioReviewArea {
  readonly area: ReviewAreaId;
  readonly headline: string;
  readonly state: ReviewState;
  readonly evidenceLevel: EvidenceLevel;
  readonly findings: readonly ScenarioReviewFinding[];
}

export interface ScenarioReview {
  readonly ruleVersion: "real-estate-review-v1";
  readonly overallState: ReviewState;
  readonly overallLabel: string;
  readonly evidenceLevel: EvidenceLevel;
  readonly areas: readonly ScenarioReviewArea[];
  readonly limitations: readonly string[];
}

export const NO_MAJOR_CONFLICT_LABEL =
  "현재 연결된 근거 범위에서 핵심 불일치 미발견" as const;

export const REVIEW_STATE_LABELS: Readonly<Record<ReviewState, string>> = {
  "no-major-conflict": NO_MAJOR_CONFLICT_LABEL,
  caution: "추가 확인 필요",
  critical: "핵심 불일치 또는 상환 부족 발견",
  insufficient: "판정 근거 부족",
};

const stateRank: Readonly<Record<ReviewState, number>> = {
  "no-major-conflict": 0,
  insufficient: 1,
  caution: 2,
  critical: 3,
};

const summarize = (
  area: ReviewAreaId,
  headline: string,
  findings: readonly ScenarioReviewFinding[],
): ScenarioReviewArea => {
  const state = findings.reduce<ReviewState>(
    (current, finding) => stateRank[finding.state] > stateRank[current] ? finding.state : current,
    "no-major-conflict",
  );
  const insufficient = findings.filter((finding) => finding.state === "insufficient").length;
  return {
    area,
    headline,
    state,
    evidenceLevel:
      findings.length === 0 || insufficient === findings.length
        ? "insufficient"
        : insufficient > 0
          ? "partial"
          : "sufficient",
    findings,
  };
};

const addMonths = (date: string, months: number): string => {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, lastDay));
  return value.toISOString().slice(0, 10);
};

const sameValue = (left: string | number | null, right: string | number | null): boolean =>
  typeof left === "string" && typeof right === "string"
    ? normalizeKorean(left) === normalizeKorean(right)
    : left === right;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const INVESTOR_PROTECTION_LABELS = {
  rightForm: "권리 형태",
  fundsSafekeeping: "투자금 보관",
  bankruptcyRemoteness: "도산 시 재산 분리 조건",
  rightsAdministration: "권리 관리",
  disputeResolution: "분쟁 해결 절차",
  issuanceDistributionSeparation: "발행·유통 역할 분리",
} as const;

export const ASSET_FIELD_LABELS: Readonly<Record<string, string>> = {
  "building-name": "건물명",
  "main-use": "주용도",
  "gross-floor-area": "연면적",
  "land-area": "대지면적",
  "use-approval-date": "사용승인일",
};

const assetFieldLabel = (field: string): string => ASSET_FIELD_LABELS[field] ?? field;

const assetArea = (offer: ScenarioOffer): ScenarioReviewArea => {
  const findings: ScenarioReviewFinding[] = [];
  const matched: { readonly label: string; readonly sourceId: string }[] = [];
  if (offer.claimedAssetFacts.length === 0) {
    findings.push({
      code: "asset-claims-missing",
      state: "insufficient",
      message: "상품에 표시된 자산 조건이 없어 공개정보와 비교할 수 없습니다.",
      basis: "scenario",
      impact: "동일 대상·동일 정의의 건축물대장 공개정보와 비교할 수 없습니다.",
      sourceIds: [],
      nextQuestion: "상품 설명에서 확인하려는 자산값과 단위를 공개해 주세요.",
    });
  }

  for (const claim of offer.claimedAssetFacts) {
    const label = assetFieldLabel(claim.field);
    const observed = offer.asset.facts.find(
      (fact) => fact.field === claim.field && (fact.unit ?? "") === (claim.unit ?? ""),
    );
    if (!observed || observed.status === "unknown") {
      findings.push({
        code: "asset-observation-missing",
        state: "insufficient",
        message: `${label} 조건을 비교할 건축물대장 공개정보 값이 없습니다.`,
        basis: "cross-check",
        impact: "누락은 불일치나 위험으로 판정하지 않습니다.",
        sourceIds: [],
        nextQuestion: `${label}의 동일 대상·동일 단위 공식 근거를 제공해 주세요.`,
      });
      continue;
    }
    if (observed.validThrough && observed.validThrough < offer.asOf) {
      findings.push({
        code: "asset-observation-expired",
        state: "insufficient",
        message: `${label} 건축물대장 공개정보의 확인 기준일이 지났습니다.`,
        basis: "observed",
        impact: "현재성 만료는 값 불일치로 판정하지 않습니다.",
        sourceIds: [observed.sourceId],
        nextQuestion: `${label}의 최신 공식 근거를 다시 확인해 주세요.`,
      });
      continue;
    }
    const matches = sameValue(claim.value, observed.value);
    if (matches) {
      matched.push({ label, sourceId: observed.sourceId });
      continue;
    }
    findings.push({
      code: "asset-value-conflict",
      state: "critical",
      message: `${label}의 동일 대상·동일 정의 값이 서로 다릅니다.`,
      basis: "cross-check",
      impact: "기초자산 설명의 정확성에 직접 영향을 줍니다.",
      sourceIds: [observed.sourceId],
      nextQuestion: `${label} 값 차이의 원인과 정정된 근거를 확인해 주세요.`,
    });
  }
  if (matched.length > 0) {
    findings.unshift({
      code: "asset-values-matched",
      state: "no-major-conflict",
      message: `${matched.map((item) => item.label).join("·")} ${matched.length}개 항목이 건축물대장 공개정보와 일치합니다.`,
      basis: "cross-check",
      impact: "현재 연결된 건축물대장 공개정보에서 일치한 항목을 하나로 묶어 표시합니다.",
      sourceIds: [...new Set(matched.map((item) => item.sourceId))],
      nextQuestion: "각 근거의 기준일과 이후 변경 여부를 계속 확인해 주세요.",
    });
  }
  return summarize("asset", "건축물대장 공개정보와 상품 조건 비교", findings);
};

const returnCostArea = (offer: ScenarioOffer): ScenarioReviewArea => {
  const cash = offer.offering.cashFlowReview;
  const values = [
    cash.annualRentalIncomeWon,
    cash.annualOperatingExpenseWon,
    cash.annualDebtServiceWon,
  ];
  if (values.some((value) => value === null)) {
    return summarize("return-cost", "연간 현금흐름과 예상 분배 충당배수", [{
      code: "cash-flow-inputs-missing",
      state: "insufficient",
      message: "연 임대수익·운영비·부채상환액 중 누락된 값이 있습니다.",
      basis: "scenario",
      impact: "누락만으로 수익·비용 위험을 판정하지 않습니다.",
      sourceIds: [],
      nextQuestion: "연간 현금흐름 세 항목과 산정 기준을 모두 공개해 주세요.",
    }]);
  }
  const netOperatingIncome = values[0]! - values[1]!;
  const expectedPayout =
    offer.offering.amountWon * offer.offering.expectedAnnualDistributionRatePercent / 100;
  const payoutCoverage = expectedPayout === 0 ? null : netOperatingIncome / expectedPayout;
  const critical = payoutCoverage !== null && payoutCoverage < 1;
  return summarize("return-cost", "연간 현금흐름과 예상 분배 충당배수", [{
    code: critical ? "payout-coverage-below-one" : "payout-coverage-reviewed",
    state: critical ? "critical" : "no-major-conflict",
    message: payoutCoverage === null
      ? "예상 연 분배율이 0%여서 예상 분배 충당배수를 계산하지 않았습니다."
      : `예상 분배 충당배수는 ${round2(payoutCoverage)}배입니다.`,
    basis: "scenario",
    impact: critical
      ? "시나리오 순영업현금이 예상 연 분배액을 충당하지 못합니다."
      : "이 화면의 검토 기준에서 중대한 부족을 찾지 못했습니다.",
    sourceIds: [],
    nextQuestion: "임대수익·운영비·분배액의 민감도와 산정 근거를 확인해 주세요.",
  }]);
};

const financingArea = (offer: ScenarioOffer): ScenarioReviewArea => {
  const cash = offer.offering.cashFlowReview;
  const financing = offer.offering.financing;
  const findings: ScenarioReviewFinding[] = [];
  if (
    cash.annualRentalIncomeWon === null ||
    cash.annualOperatingExpenseWon === null ||
    cash.annualDebtServiceWon === null ||
    financing.rateType === null
  ) {
    findings.push({
      code: "financing-inputs-missing",
      state: "insufficient",
      message: "부채상환여력 검토에 필요한 현금흐름 또는 금리유형이 누락됐습니다.",
      basis: "scenario",
      impact: "누락만으로 금융 위험을 판정하지 않습니다.",
      sourceIds: [],
      nextQuestion: "연 부채상환액과 고정·변동 금리 여부를 확인해 주세요.",
    });
  } else {
    const netOperatingIncome = cash.annualRentalIncomeWon - cash.annualOperatingExpenseWon;
    const stressedDebtService = cash.annualDebtServiceWon * (financing.rateType === "floating" ? 1.2 : 1);
    const stressDscr = stressedDebtService === 0 ? Number.POSITIVE_INFINITY : netOperatingIncome / stressedDebtService;
    const state: ReviewState = stressDscr < 1 ? "critical" : stressDscr <= 1.2 ? "caution" : "no-major-conflict";
    findings.push({
      code: state === "critical" ? "stress-dscr-below-one" : state === "caution" ? "stress-dscr-thin" : "stress-dscr-reviewed",
      state,
      message: Number.isFinite(stressDscr)
        ? `금리상승 가정 부채상환여력은 ${round2(stressDscr)}배입니다.`
        : "연 부채상환액이 0원이어서 금리상승 가정 부채상환여력을 무한대로 처리했습니다.",
      basis: "scenario",
      impact: state === "critical"
        ? "스트레스 현금흐름이 연 부채상환액을 충당하지 못합니다."
        : state === "caution"
          ? "금리상승 가정의 상환여력이 주의 구간(1~1.2배)에 있습니다."
          : "이 화면의 검토 기준에서 중대한 상환 부족을 찾지 못했습니다.",
      sourceIds: [],
      nextQuestion: "금리·공실 스트레스별 원리금 상환표를 확인해 주세요.",
    });
  }
  if (financing.rateType === "floating" && financing.resetOn === null) {
    findings.push({
      code: "rate-reset-missing",
      state: "insufficient",
      message: "변동금리 재설정일이 누락됐습니다.",
      basis: "scenario",
      impact: "금리 변경 시점을 검토할 수 없습니다.",
      sourceIds: [],
      nextQuestion: "다음 금리 재설정일과 기준금리를 확인해 주세요.",
    });
  }
  const targetExitOn = addMonths(offer.offering.opensOn, offer.offering.targetHoldingMonths);
  if (financing.maturityOn < targetExitOn) {
    findings.push({
      code: "loan-matures-before-target-exit",
      state: "caution",
      message: `대출 만기 ${financing.maturityOn}가 목표 회수일 ${targetExitOn}보다 빠릅니다.`,
      basis: "scenario",
      impact: "목표 회수 전에 차환 또는 상환이 필요할 수 있습니다.",
      sourceIds: [],
      nextQuestion: "만기 전 상환재원과 차환 실패 시 대응계획을 확인해 주세요.",
    });
  }
  const protectionEntries = Object.entries(INVESTOR_PROTECTION_LABELS).map(([key, label]) => ({
    label,
    value: offer.investorProtection[key as keyof typeof INVESTOR_PROTECTION_LABELS],
  }));
  const attention = protectionEntries.filter((item) => item.value.status === "attention");
  const unknown = protectionEntries.filter((item) => item.value.status === "unknown");
  const confirmed = protectionEntries.filter((item) => item.value.status === "confirmed-in-scenario");
  if (attention.length > 0) {
    const core = new Set(["투자금 보관", "도산 시 재산 분리 조건", "권리 관리"]);
    findings.push({
      code: attention.some((item) => core.has(item.label))
        ? "core-investor-protection-attention"
        : "investor-protection-attention",
      state: "caution",
      message: `${attention.map((item) => item.label).join("·")} 항목은 상품에 표시된 조건을 추가로 확인해야 합니다.`,
      basis: "scenario",
      impact: "실제 법률 상태를 확인한 결과가 아니며, 입력된 보호 조건의 계약·운영 근거를 추가 확인해야 합니다.",
      sourceIds: [],
      nextQuestion: `${attention.map((item) => item.label).join("·")}의 실제 계약서·운영 절차와 예외 조건을 확인해 주세요.`,
    });
  }
  if (unknown.length > 0) {
    findings.push({
      code: "investor-protection-unknown",
      state: "insufficient",
      message: `${unknown.map((item) => item.label).join("·")} 항목은 상품에 표시될 조건이 미확인입니다.`,
      basis: "scenario",
      impact: "누락만으로 위험 또는 법적 효력을 판정하지 않습니다.",
      sourceIds: [],
      nextQuestion: `${unknown.map((item) => item.label).join("·")}의 시나리오 조건과 한계를 입력해 주세요.`,
    });
  }
  if (confirmed.length > 0) {
    findings.push({
      code: "investor-protection-scenario-input-recorded",
      state: "no-major-conflict",
      message: `${confirmed.map((item) => item.label).join("·")} 등 ${confirmed.length}개 조건이 상품 화면에 표시되어 있습니다.`,
      basis: "scenario",
      impact: "등록 여부만 확인했으며 실제 보호 수준·법적 효력·안전성을 판정하지 않습니다.",
      sourceIds: [],
      nextQuestion: "각 보호 조건의 실제 계약서, 책임 주체, 예외와 집행 절차를 별도로 확인해 주세요.",
    });
  }
  return summarize("financing", "금리상승 가정 부채상환여력·대출 만기·투자자보호 조건", findings);
};

const exitArea = (offer: ScenarioOffer): ScenarioReviewArea => {
  const review = offer.offering.exitReview;
  const missing = review.decisionAuthority === null || review.maximumExtensionMonths === null;
  return summarize("exit", "회수 결정권과 최대 연장기간", [{
    code: missing ? "exit-governance-missing" : "exit-governance-disclosed",
    state: missing ? "insufficient" : "no-major-conflict",
    message: missing
      ? "회수 결정권 또는 최대 연장기간이 누락됐습니다."
      : `회수 결정권은 ${review.decisionAuthority}, 최대 연장은 ${review.maximumExtensionMonths}개월입니다.`,
    basis: "scenario",
    impact: missing
      ? "회수 지연 시 누가 언제 결정하는지 검토할 수 없습니다."
      : "공개된 시나리오 조건 범위에서 회수 거버넌스를 확인했습니다.",
    sourceIds: [],
    nextQuestion: "연장 의결 절차와 투자자 통지·이의제기 조건을 확인해 주세요.",
  }]);
};

const operatorHistoryArea = (
  offer: ScenarioOffer,
  population: readonly ScenarioOffer[],
): ScenarioReviewArea => {
  const completed = population.filter(
    (item) =>
      item.operatorGroupId === offer.operatorGroupId &&
      item.completion !== undefined &&
      !(item.scenarioId === offer.scenarioId && item.offerId === offer.offerId),
  );
  if (completed.length === 0) {
    return summarize("operator-history", "현재 상품을 제외한 운영그룹 전체 완료 모집단", [{
      code: "operator-history-missing",
      state: "insufficient",
      message: "현재 상품을 제외한 완료 이력이 없습니다.",
      basis: "scenario",
      impact: "운영그룹의 손실·지연 빈도를 검토할 수 없습니다.",
      sourceIds: [],
      nextQuestion: "동일 정의로 집계한 전체 완료 이력을 공개해 주세요.",
    }]);
  }
  const losses = completed.filter((item) => item.completion?.returnOutcome === "loss").length;
  const delays = completed.filter((item) => item.completion?.scheduleOutcome === "delayed").length;
  const caution = losses >= 2 || delays >= 2;
  return summarize("operator-history", "현재 상품을 제외한 운영그룹 전체 완료 모집단", [{
    code: caution ? "operator-history-repeated-loss-or-delay" : "operator-history-reviewed",
    state: caution ? "caution" : "no-major-conflict",
    message: `완료 ${completed.length}건 중 손실 ${losses}건, 지연 ${delays}건입니다.`,
    basis: "scenario",
    impact: caution
      ? "반복된 손실 또는 지연은 추가 확인이 필요하지만 현재 상품의 중대 충돌로 단정하지 않습니다."
      : "이 화면의 검토 기준에서 반복 손실·지연 주의 조건에 해당하지 않습니다.",
    sourceIds: [],
    nextQuestion: "완료 모집단의 선정 기준과 손실·지연 원인을 확인해 주세요.",
  }]);
};

export const evaluateScenarioReview = (
  offer: ScenarioOffer,
  population: readonly ScenarioOffer[],
): ScenarioReview => {
  const areas = [
    assetArea(offer),
    returnCostArea(offer),
    financingArea(offer),
    exitArea(offer),
    operatorHistoryArea(offer, population),
  ];
  const overallState = areas.reduce<ReviewState>(
    (current, area) => stateRank[area.state] > stateRank[current] ? area.state : current,
    "no-major-conflict",
  );
  const insufficient = areas.filter((area) => area.evidenceLevel === "insufficient").length;
  const partial = areas.some((area) => area.evidenceLevel === "partial");
  return {
    ruleVersion: "real-estate-review-v1",
    overallState,
    overallLabel: REVIEW_STATE_LABELS[overallState],
    evidenceLevel:
      insufficient === areas.length
        ? "insufficient"
        : insufficient > 0 || partial
          ? "partial"
          : "sufficient",
    areas,
    limitations: [
      "정해진 검토 기준에 따른 결과이며 투자 추천·안전성 판정·시장 전망이 아닙니다.",
      "변동금리 부채상환여력은 연 부채상환액이 20% 증가하는 경우를 가정한 계산이며 시장 전망이나 실제 금리 변동을 반영하지 않습니다.",
      "투자자보호 항목은 상품에 표시된 시나리오 조건입니다. 실제 계약·법적 효력·파산 시 재산 분리 여부를 확인한 자료가 아닙니다.",
    ],
  };
};
