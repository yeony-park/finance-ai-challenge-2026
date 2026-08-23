import {
  loadRealEstateOffer,
  type RealEstateOffer,
} from "./claims/real-estate";
import { z } from "zod";
import { loadLatestReport } from "./report/load";
import type { ReportSnapshot } from "./report/snapshot";
import type { Evidence, RealEstateSourceKind } from "./types";

export type ReviewEvidenceSufficiency =
  | "comparable"
  | "partial"
  | "insufficient";
export type ReviewConfirmedIssue =
  | "not_assessed"
  | "none_found"
  | "needs_follow_up"
  | "critical_conflict";
export type ReviewFindingTone =
  | "confirmed"
  | "attention"
  | "unknown"
  | "context";
export type ReviewArea =
  | "asset_identity"
  | "payout_cost"
  | "exit_terms"
  | "role_history"
  | "market_context";
export type ReviewGate =
  | "asset_subject_link"
  | "offer_arithmetic"
  | "payout_cost_terms"
  | "current_tradability"
  | "sale_liquidation_terms"
  | "legal_role_identification"
  | "current_material_disclosures";

export interface ReviewSource {
  readonly sourceKind: RealEstateSourceKind;
  readonly label: string;
  readonly url: string;
  readonly asOf: string;
}

export interface ReviewFinding {
  readonly id: string;
  readonly tone: ReviewFindingTone;
  readonly title: string;
  readonly detail: string;
  readonly sources: readonly ReviewSource[];
  readonly limitations: readonly string[];
}

export interface ReviewOpenGate {
  readonly id: ReviewGate;
  readonly label: string;
  readonly reason: string;
}

export interface RealEstateInvestmentReview {
  readonly offerId: string;
  readonly publicName: string;
  readonly sectionTitle: "근거 기반 검토 현황";
  readonly reviewedOn: string;
  readonly evidenceSufficiency: ReviewEvidenceSufficiency;
  readonly confirmedIssue: ReviewConfirmedIssue;
  readonly priorityFindings: readonly ReviewFinding[];
  readonly materialEvents: readonly ReviewFinding[];
  readonly openGates: readonly ReviewOpenGate[];
  readonly nextQuestions: readonly string[];
  readonly areas: Readonly<Record<ReviewArea, readonly ReviewFinding[]>>;
}

type ReviewReport = Pick<
  ReportSnapshot,
  "offerId" | "judgements" | "realEstatePlacements"
>;

export interface RealEstateInvestmentReviewInput {
  readonly offer: RealEstateOffer;
  readonly report?: ReviewReport;
  readonly reviewedOn: string;
}

const BUILDING_KINDS: Readonly<Record<string, string>> = {
  real_estate_address: "소재지",
  real_estate_parcel_area: "대지면적",
  real_estate_building_area: "건축면적",
  real_estate_total_area: "연면적",
  real_estate_use_approved_month: "사용승인월",
};
const BUILDING_PUBLIC_URL = "https://www.data.go.kr/data/15134735/openapi.do";
const RTMS_PUBLIC_URL = "https://www.data.go.kr/data/15126463/openapi.do";
const reviewDateSchema = z.iso.date();
const CURRENT_STATUS_MAX_AGE_DAYS = 31;
const GATES: Readonly<Record<ReviewGate, { label: string; question: string }>> = {
  asset_subject_link: {
    label: "자산과 원장 대상 연결",
    question: "상품 자산과 원장 조회 대상이 같은 물건인지 확인할 수 있나요?",
  },
  offer_arithmetic: {
    label: "공모총액 산식",
    question: "공모총액과 발행수량·단위가격 산식을 원문에서 다시 확인할 수 있나요?",
  },
  payout_cost_terms: {
    label: "배당·비용 조건",
    question: "배당 산식·비용 조건을 원문에서 확인할 수 있나요?",
  },
  current_tradability: {
    label: "현재 거래 가능 상태",
    question: "현재 주문 가능·정지·종료 상태를 기준일 원문으로 확인할 수 있나요?",
  },
  sale_liquidation_terms: {
    label: "매각·청산 조건",
    question: "매각·청산 조건과 현재 적용 여부를 직접 원문으로 확인할 수 있나요?",
  },
  legal_role_identification: {
    label: "법적 역할 식별",
    question: "운용·신탁·수탁·자산관리 역할을 서로 다른 직접 원문으로 식별할 수 있나요?",
  },
  current_material_disclosures: {
    label: "현재 중요 공시 확인",
    question: "현재 기준 중요 공시 전체를 직접 원문에서 확인했나요?",
  },
};

const sourceUrl = (sourceId: string, url: string): string | undefined => {
  if (sourceId === "molit-building-register-hub") return BUILDING_PUBLIC_URL;
  if (sourceId === "molit-rtms-nrg-trade") return RTMS_PUBLIC_URL;
  if (/serviceKey/i.test(url)) return undefined;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
};

const reportSource = (
  evidence: Evidence | undefined,
  label: string,
): ReviewSource | undefined => {
  if (!evidence) return undefined;
  const url = sourceUrl(evidence.sourceId, evidence.url);
  return url
    ? {
        sourceKind: "external-observation",
        label,
        url,
        asOf: evidence.observedAt.slice(0, 10),
      }
    : undefined;
};

const offerSource = (
  offer: RealEstateOffer,
  url: string | undefined,
  label: string,
): ReviewSource | undefined => {
  const source = offer.sources.find((item) => item.url === url);
  const safeUrl = source && sourceUrl("", source.url);
  return source && safeUrl
    ? {
        sourceKind: source.sourceKind,
        label,
        url: safeUrl,
        asOf: source.asOf,
      }
    : undefined;
};

const finding = (
  id: string,
  tone: ReviewFindingTone,
  title: string,
  detail: string,
  source: ReviewSource | undefined,
  limitations: readonly string[],
): ReviewFinding => ({
  id,
  tone,
  title,
  detail,
  sources: source ? [source] : [],
  limitations,
});

const current = (
  source: ReviewSource | undefined,
  reviewedOn: string,
  validThrough?: string,
): source is ReviewSource =>
  source !== undefined &&
  source.asOf <= reviewedOn &&
  (validThrough === undefined || validThrough >= reviewedOn);

const ageInDays = (asOf: string, reviewedOn: string): number =>
  (Date.parse(`${reviewedOn}T00:00:00Z`) -
    Date.parse(`${asOf}T00:00:00Z`)) /
  86_400_000;

const assertReportMatches = (
  offer: RealEstateOffer,
  report: ReviewReport | undefined,
): void => {
  if (!report) return;
  if (report.offerId !== offer.offerId) {
    throw new Error("상품과 검증 리포트의 offerId가 일치하지 않습니다");
  }
  const claims = [
    ...report.judgements.map((item) => item.claim),
    ...report.realEstatePlacements.map((item) => item.claim),
  ];
  if (
    claims.some(
      (claim) =>
        claim.document.offerId !== offer.offerId ||
        ![offer.subject, offer.publicAlias].includes(claim.subject),
    )
  ) {
    throw new Error("상품과 검증 리포트 claim의 대상 연결이 일치하지 않습니다");
  }
};

const assetReview = (
  offer: RealEstateOffer,
  report: ReviewReport | undefined,
): { findings: readonly ReviewFinding[]; linked: boolean } => {
  const checked = (report?.judgements ?? []).filter(
    (item) => BUILDING_KINDS[item.claim.kind] !== undefined,
  );
  if (checked.length === 0) {
    return {
      linked: false,
      findings: [
        finding(
          "asset-identity-unknown",
          "unknown",
          "자산 원장 대조 미확인",
          "구조화된 자산 동일성 판정 근거가 없습니다.",
          undefined,
          ["근거 없음은 원장 불일치로 해석하지 않습니다."],
        ),
      ],
    };
  }
  const findings = checked.map((item) => {
    const field = BUILDING_KINDS[item.claim.kind] ?? "자산 항목";
    const evidence = item.evidence.find(
      (candidate) => candidate.sourceId === "molit-building-register-hub",
    );
    const mismatch = evidence !== undefined && item.verdict === "mismatch";
    const match = evidence !== undefined && item.verdict === "match";
    return finding(
      `asset-${item.claim.kind}`,
      mismatch ? "attention" : match ? "confirmed" : "unknown",
      mismatch ? `${field} 원장 불일치` : `${field} 원장 대조`,
      mismatch
        ? `${field}의 상품 기재값과 건축물대장 값이 다릅니다.`
        : match
          ? `${field}의 상품 기재값이 건축물대장 대조값과 일치합니다.`
          : `${field}은 현재 근거로 판정하지 않았습니다.`,
      reportSource(evidence, "건축물대장 대조 근거"),
      ["건축물대장은 권리·소유·임대차 상태를 확인하지 않습니다."],
    );
  });
  return {
    findings,
    linked: checked.some(
      (item) =>
        item.claim.kind === "real_estate_address" &&
        item.verdict === "match" &&
        item.evidence.some(
          (evidence) => evidence.sourceId === "molit-building-register-hub",
        ),
    ),
  };
};

const decimalPlaces = (value: number): number => {
  const [, decimals = ""] = String(value).split(".");
  return Math.min(decimals.length, 6);
};

const distributionConsistent = (distribution: {
  readonly totalAmountWon: number;
  readonly totalUnits: number;
  readonly sourceAmountPerUnitWon: number;
}): boolean => {
  const tolerance = 0.5 * 10 ** -decimalPlaces(distribution.sourceAmountPerUnitWon);
  return (
    Math.abs(
      distribution.totalAmountWon / distribution.totalUnits -
        distribution.sourceAmountPerUnitWon,
    ) <= tolerance
  );
};

const payoutReview = (
  offer: RealEstateOffer,
  reviewedOn: string,
): {
  findings: readonly ReviewFinding[];
  complete: boolean;
  offerArithmeticComplete: boolean;
} => {
  const details = offer.schemaVersion === 2 ? offer.productSummary : undefined;
  const result: ReviewFinding[] = [];
  const offerEvidence = offerSource(
    offer,
    offer.schemaVersion === 2
      ? offer.investmentReview?.offerTermsSource
      : undefined,
    "공모 구조 원문",
  );
  const offerMathMatches =
    Math.abs(
      offer.offer.amountWon - offer.offer.unitCount * offer.offer.unitPriceWon,
    ) <= 1;
  result.push(
    finding(
      "offer-arithmetic",
      offerMathMatches && current(offerEvidence, reviewedOn)
        ? "confirmed"
        : offerMathMatches
          ? "unknown"
          : "attention",
      offerMathMatches ? "공모총액 산식 확인" : "공모총액 산식 불일치",
      offerMathMatches
        ? "공모총액이 발행수량과 단위가격의 곱과 일치합니다."
        : "공모총액이 발행수량과 단위가격의 곱과 일치하지 않습니다.",
      current(offerEvidence, reviewedOn) ? offerEvidence : undefined,
      ["산술 확인은 모집 완료나 납입 결과를 확인하지 않습니다."],
    ),
  );
  const distribution = details?.latestActualDistribution;
  const payoutMatches = distribution && distributionConsistent(distribution);
  if (distribution) {
    result.push(
      finding(
        "payout-formula",
        payoutMatches ? "confirmed" : "attention",
        payoutMatches ? "배당 산식 검산 일치" : "배당 산식 검산 불일치",
        payoutMatches
          ? "총 배당금이 총 수량과 원문 단위당 배당금의 곱에 반올림 오차 안에서 일치합니다."
          : "총 배당금이 총 수량과 원문 단위당 배당금의 곱에 허용 반올림 오차 안에서 일치하지 않습니다.",
        offerSource(offer, distribution.source.url, "배당 공지 원문"),
        ["산술 검산은 원문 값을 자동 보정하거나 실제 지급액을 확정하지 않습니다."],
      ),
    );
  }
  const fees = [
    ...(details?.totalExpenseRates ?? []),
    ...(details?.frontEndSalesFeeRates ?? []),
  ];
  if (fees[0]) {
    result.push(
      finding(
        "cost-source-connected",
        "confirmed",
        "비용 항목 원문 연결",
        `공개 원문에 연결된 비용률 항목이 ${fees.length}건 있습니다.`,
        offerSource(offer, fees[0].source.url, "비용 공시 원문"),
        ["비용률은 클래스별로 다를 수 있으며 총 투자비용을 단독 확정하지 않습니다."],
      ),
    );
  }
  if (!details) {
    result.push(
      finding(
        "payout-cost-unknown",
        "unknown",
        "배당·비용 근거 부족",
        "배당 산식과 비용 조건을 대조할 구조화 근거가 없습니다.",
        undefined,
        ["근거 없음은 산식 오류나 비용 문제로 판정하지 않습니다."],
      ),
    );
  }
  const termsConnected =
    details?.contractualDistributionCycle.status === "confirmed" &&
    details.contractualDistributionCycle.source !== undefined &&
    fees.length > 0;
  return {
    findings: result,
    complete: Boolean(termsConnected && (!distribution || payoutMatches)),
    offerArithmeticComplete:
      offerMathMatches && current(offerEvidence, reviewedOn),
  };
};

const exitReview = (
  offer: RealEstateOffer,
  report: ReviewReport | undefined,
  reviewedOn: string,
): {
  findings: readonly ReviewFinding[];
  tradabilityComplete: boolean;
  termsComplete: boolean;
} => {
  const details = offer.schemaVersion === 2 ? offer.productSummary : undefined;
  const statusSource =
    offer.schemaVersion === 2
      ? offerSource(offer, offer.statusSources?.tradabilityStatus, "현재 거래 상태 원문")
      : undefined;
  const tradabilityComplete =
    offer.tradabilityStatus !== "unknown" &&
    current(statusSource, reviewedOn) &&
    ((["sold", "settled"].includes(offer.assetLifecycle) &&
      offer.tradabilityStatus === "ended") ||
      ageInDays(statusSource.asOf, reviewedOn) <= CURRENT_STATUS_MAX_AGE_DAYS);
  const condition = details?.saleLiquidationCondition;
  const conditionSource = offerSource(
    offer,
    condition?.source?.url,
    "매각·청산 조건 원문",
  );
  const termsComplete =
    condition?.status === "confirmed" && current(conditionSource, reviewedOn);
  const result: ReviewFinding[] = [
    finding(
      tradabilityComplete ? "tradability-confirmed" : "tradability-unknown",
      tradabilityComplete
        ? offer.tradabilityStatus === "suspended" ||
          (offer.tradabilityStatus === "ended" &&
            !["sold", "settled"].includes(offer.assetLifecycle))
          ? "attention"
          : "confirmed"
        : "unknown",
      tradabilityComplete ? "현재 거래 상태 원문 연결" : "현재 거래 가능 상태 미확인",
      tradabilityComplete
        ? `현재 거래 상태가 ${offer.tradabilityStatus}로 구조화되어 있습니다.`
        : "현재 주문 가능·정지·종료 여부를 확인하지 못했습니다.",
      statusSource,
      ["거래 상태는 수익이나 환금 시점을 보장하지 않습니다."],
    ),
    finding(
      termsComplete ? "exit-condition-confirmed" : "exit-condition-unknown",
      termsComplete ? "confirmed" : "unknown",
      termsComplete ? "매각·청산 조건 원문 연결" : "매각·청산 조건 미확인",
      termsComplete
        ? "매각·청산 조건이 직접 원문과 연결되어 있습니다."
        : "매각·청산 조건의 직접 원문 근거가 없습니다.",
      termsComplete ? conditionSource : undefined,
      ["조건 확인은 실제 매각 성사나 시점을 보장하지 않습니다."],
    ),
  ];
  if (["sold", "settled"].includes(offer.assetLifecycle) && offer.sale) {
    const saleSource = offerSource(
      offer,
      offer.sale.source,
      "매각 관련 직접 원문",
    );
    const platformAnnouncement = saleSource?.sourceKind === "platform-claim";
    const directDocument = saleSource?.sourceKind === "official-document";
    result.push(
      finding(
        directDocument
          ? "sale-source-connected"
          : platformAnnouncement
            ? "sale-platform-announcement"
            : "sale-source-unknown",
        directDocument ? "confirmed" : platformAnnouncement ? "context" : "unknown",
        directDocument
          ? "매각 관련 공식 원문 연결"
          : platformAnnouncement
            ? "운영사 매각 발표 연결"
            : "매각 관련 직접 원문 미확인",
        directDocument
          ? "매각 관련 일자와 금액의 공식 원문이 연결되어 있습니다."
          : platformAnnouncement
            ? "매각 관련 일자와 금액은 운영사 발표에 연결되어 있습니다."
            : "매각 관련 일자와 금액을 뒷받침하는 직접 원문이 연결되지 않았습니다.",
        directDocument || platformAnnouncement ? saleSource : undefined,
        [
          platformAnnouncement
            ? "운영사 발표 연결은 법적 소유권 이전이나 RTMS 동일물건 확인이 아닙니다."
            : "원문 연결만으로 법적 소유권 이전일이나 RTMS 동일물건을 확정하지 않습니다.",
        ],
      ),
    );
    const placement = report?.realEstatePlacements.find(
      (item) => item.claim.kind === "sale_amount",
    );
    result.push(
      finding(
        "sale-asset-link-unknown",
        "unknown",
        "매각 공시 기재값의 외부 동일물건 확인 미완료",
        "매각 공시 기재값과 RTMS 거래의 동일 물건 여부를 확인하지 못했습니다.",
        reportSource(
          placement?.evidence.find(
            (evidence) => evidence.sourceId === "molit-rtms-nrg-trade",
          ),
          "RTMS 법정동 거래 관측",
        ),
        ["RTMS 비교군에 지번이 없어 동일 물건이나 금액 불일치를 확정하지 않습니다."],
      ),
    );
  }
  return { findings: result, tradabilityComplete, termsComplete };
};

const eventBasisMatches = (event: {
  readonly kind: string;
  readonly materialityBasis: string;
}): boolean =>
  ({
    "lease-termination": "contract-termination",
    "distribution-correction": "distribution-conflict",
    "legal-dispute": "legal-order",
    other: "other",
  })[event.kind] === event.materialityBasis;

const ROLE_LABEL = {
  platform: "플랫폼 운영",
  manager: "펀드 운용",
  trustee: "신탁",
  custodian: "수탁",
  "property-manager": "자산 관리",
} as const;

const RELATIONSHIP_LABEL = {
  "platform-operator": "플랫폼 운영사",
  "fund-party": "펀드 관계사",
  "appointed-service-provider": "지정 서비스 제공자",
  other: "기타 관계",
} as const;

const roleReview = (
  offer: RealEstateOffer,
  reviewedOn: string,
): {
  findings: readonly ReviewFinding[];
  materialEvents: readonly ReviewFinding[];
  rolesIdentified: boolean;
  disclosuresComplete: boolean;
  critical: boolean;
  openEvents: readonly ReviewFinding[];
} => {
  const review = offer.schemaVersion === 2 ? offer.investmentReview : undefined;
  const result: ReviewFinding[] = [];
  const materialEvents: ReviewFinding[] = [];
  const openEvents: ReviewFinding[] = [];
  let critical = false;
  let eligibleEventCount = 0;
  for (const event of review?.importantEvents ?? []) {
    const source = offerSource(offer, event.source, "중요 사건 직접 원문");
    if (
      (event.eventOn && event.eventOn > reviewedOn) ||
      (source && source.asOf > reviewedOn)
    ) {
      throw new Error("중요 사건일 또는 원문 기준일이 검토 기준일보다 미래입니다");
    }
    const eligible =
      event.exactProduct &&
      event.directOriginal &&
      event.eventOn !== undefined &&
      eventBasisMatches(event) &&
      source !== undefined &&
      source.sourceKind !== "external-observation" &&
      source.asOf >= event.eventOn &&
      current(source, reviewedOn, event.validThrough);
    if (!eligible) {
      materialEvents.push(
        finding(
          `important-event-${event.eventId}-unknown`,
          "unknown",
          "중요 사건 근거 요건 미충족",
          "exact 상품·직접 원문·사건일·제한된 중요성 근거를 모두 확인하지 못했습니다.",
          source,
          ["요건 미충족 사건은 확인된 문제로 올리지 않습니다."],
        ),
      );
      continue;
    }
    eligibleEventCount += 1;
    const isOpen = event.status === "open";
    const isCritical =
      isOpen &&
      event.kind === "legal-dispute" &&
      event.materialityBasis === "legal-order";
    critical ||= isCritical;
    const item = finding(
      `important-event-${event.eventId}`,
      isOpen ? "attention" : event.status === "resolved" ? "confirmed" : "unknown",
      event.kind === "lease-termination" && isOpen
        ? "임대차 해지 후속 영향 확인 필요"
        : isCritical
          ? "법적 명령과 상품 조건 충돌 확인"
          : event.status === "resolved"
            ? "중요 사건 해소 원문 연결"
            : "중요 사건 영향 미확인",
      isOpen
        ? "직접 원문에서 사건은 확인됐지만 현재 영향은 추가 확인이 필요합니다."
        : event.status === "resolved"
          ? "직접 원문에서 사건의 해소 상태를 확인했습니다."
          : "직접 원문에서 사건은 확인됐지만 상태를 판정하지 않았습니다.",
      source,
      [
        event.kind === "lease-termination"
          ? "임대차 해지 사실만으로 운영 종료나 매각·청산을 확정하지 않습니다."
          : "사건 원문만으로 이후 영향 전체를 확정하지 않습니다.",
      ],
    );
    materialEvents.push(item);
    if (isOpen) openEvents.push(item);
  }

  const identifiedLinks: { pair: string; role: string; source: string }[] = [];
  for (const role of review?.roleHistory ?? []) {
    for (const [index, event] of role.events.entries()) {
      const roleLabel = ROLE_LABEL[role.role];
      const source = offerSource(
        offer,
        event.source,
        `${role.legalName} · ${roleLabel} 역할 사건 원문`,
      );
      const legalName = source ? role.legalName : "법인명 미확인";
      const relationshipLabel = RELATIONSHIP_LABEL[role.relationship];
      if ((event.eventOn && event.eventOn > reviewedOn) || (source && source.asOf > reviewedOn)) {
        throw new Error("역할 사건일 또는 원문 기준일이 검토 기준일보다 미래입니다");
      }
      const isCurrent =
        event.eventOn !== undefined &&
        source !== undefined &&
        source.sourceKind !== "external-observation" &&
        source.asOf >= event.eventOn &&
        current(source, reviewedOn, event.validThrough);
      if (isCurrent && event.outcome !== "unknown" && role.role !== "platform") {
        identifiedLinks.push({
          pair: `${role.entityId}:${role.role}`,
          role: role.role,
          source: source.url,
        });
      }
      result.push(
        finding(
          `role-${role.role}-${index + 1}`,
          !isCurrent
            ? "unknown"
            : event.outcome === "fulfilled"
              ? "confirmed"
              : event.outcome === "issue"
                ? "attention"
                : "unknown",
          `${legalName} · ${roleLabel} 사건 ${!isCurrent || event.outcome === "unknown" ? "미확인" : event.outcome === "issue" ? "주의" : "원문 연결"}`,
          !isCurrent
            ? `${legalName}의 ${roleLabel} 역할에 관한 해당 사건일 또는 유효한 원문 근거가 부족해 결과를 확인하지 않았습니다.`
            : event.outcome === "fulfilled"
              ? `${legalName}의 ${roleLabel} 역할에 관한 해당 사건 원문이 연결되어 있습니다.`
              : event.outcome === "issue"
                ? `${legalName}의 ${roleLabel} 역할에 관한 해당 사건 원문에 주의 표시가 있습니다.`
                : `${legalName}의 ${roleLabel} 역할에 관한 해당 사건 결과는 미확인입니다.`,
          source,
          [
            `${relationshipLabel} 관계의 해당 역할·해당 사건 원문만 표시하며 회사 전체 평가로 확장하지 않습니다.`,
          ],
        ),
      );
    }
  }
  if (result.length === 0) {
    result.push(
      finding(
        "role-history-unknown",
        "unknown",
        "역할별 이행 이력 미확인",
        "플랫폼·운용사·신탁사·수탁사·자산관리 역할별 사건 근거가 없습니다.",
        undefined,
        ["회사명만으로 이행 수준을 추정하지 않습니다."],
      ),
    );
  }
  const disclosure = review?.materialDisclosuresCheck;
  const disclosureSource = offerSource(
    offer,
    disclosure?.source,
    "중요 공시 확인 원문",
  );
  if (
    disclosure &&
    (disclosure.checkedOn > reviewedOn ||
      (disclosureSource && disclosureSource.asOf > reviewedOn))
  ) {
    throw new Error("중요 공시 확인일 또는 원문 기준일이 검토 기준일보다 미래입니다");
  }
  const disclosuresComplete = Boolean(
    disclosure &&
      current(disclosureSource, reviewedOn, disclosure.validThrough) &&
      (disclosure.status === "none-found" || eligibleEventCount > 0),
  );
  const rolesIdentified =
    new Set(identifiedLinks.map((item) => item.pair)).size >= 2 &&
    new Set(identifiedLinks.map((item) => item.role)).size >= 2 &&
    new Set(identifiedLinks.map((item) => item.source)).size >= 2;
  return {
    findings: result,
    materialEvents,
    rolesIdentified,
    disclosuresComplete,
    critical,
    openEvents,
  };
};

const marketFindings = (
  offer: RealEstateOffer,
  reviewedOn: string,
): readonly ReviewFinding[] => {
  const context =
    offer.schemaVersion === 2 ? offer.investmentReview?.marketContext ?? [] : [];
  if (context.length === 0) {
    return [
      finding(
        "market-context-unknown",
        "context",
        "시장·금리 맥락 미연결",
        "R-ONE·ECOS 구조화 맥락이 없습니다.",
        undefined,
        ["시장 맥락 부재는 개별 상품 문제로 판정하지 않습니다."],
      ),
    ];
  }
  return context.map((item, index) => {
    const source = offerSource(offer, item.source, `${item.provider} 공개 지표`);
    if (
      item.observedOn > reviewedOn ||
      item.publishedOn > reviewedOn ||
      (source && source.asOf > reviewedOn)
    ) {
      throw new Error("시장 지표 관측일·공표일 또는 원문 기준일이 검토 기준일보다 미래입니다");
    }
    const linked =
      source?.sourceKind === "external-observation" &&
      source.asOf >= item.publishedOn;
    return finding(
      `market-${item.provider}-${index + 1}`,
      "context",
      `${item.provider} 시장 맥락`,
      linked
        ? `${item.metric} 지표값 ${item.value} ${item.unit}를 배경 정보로 연결했습니다.`
        : `${item.provider} 지표 공표 근거 연결을 확인하지 못했습니다.`,
      linked ? source : undefined,
      ["시장·금리 지표는 두 상단 판정 축을 바꾸지 않습니다."],
    );
  });
};

const gate = (id: ReviewGate, reason: string): ReviewOpenGate => ({
  id,
  label: GATES[id].label,
  reason,
});

const priorityFindings = (
  areas: RealEstateInvestmentReview["areas"],
  openGates: readonly ReviewOpenGate[],
  openEvents: readonly ReviewFinding[],
): readonly ReviewFinding[] => {
  const result: ReviewFinding[] = [...openEvents];
  const saleAssetLink = areas.exit_terms.find(
    (item) => item.id === "sale-asset-link-unknown",
  );
  if (saleAssetLink) result.push(saleAssetLink);
  if (
    !saleAssetLink &&
    openGates.some(
      (item) =>
        item.id === "current_tradability" || item.id === "sale_liquidation_terms",
    )
  ) {
    result.push(
      finding(
        "exit-current-terms-open",
        "unknown",
        "현재 거래·매각 조건 미확인",
        "현재 거래 가능 상태 또는 매각·청산 조건이 열려 있습니다.",
        undefined,
        ["미확인은 거래 불가나 매각 실패 판정이 아닙니다."],
      ),
    );
  }
  const ordered = [
    ...areas.payout_cost.filter((item) => item.id === "payout-formula" && item.tone === "attention"),
    ...areas.payout_cost.filter((item) => item.id === "offer-arithmetic" && item.tone === "attention"),
    ...areas.asset_identity.filter((item) => item.tone === "attention"),
    ...areas.role_history.filter((item) => item.tone === "attention"),
    ...areas.exit_terms.filter((item) => item.tone === "attention"),
  ];
  for (const item of ordered) {
    if (!result.some((existing) => existing.id === item.id)) result.push(item);
  }
  return result.slice(0, 3);
};

export const reviewRealEstateInvestment = (
  input: RealEstateInvestmentReviewInput,
): RealEstateInvestmentReview => {
  if (!reviewDateSchema.safeParse(input.reviewedOn).success) {
    throw new Error("검토 기준일은 ISO date 형식이어야 합니다");
  }
  assertReportMatches(input.offer, input.report);
  const asset = assetReview(input.offer, input.report);
  const payout = payoutReview(input.offer, input.reviewedOn);
  const exit = exitReview(input.offer, input.report, input.reviewedOn);
  const role = roleReview(input.offer, input.reviewedOn);
  const areas: RealEstateInvestmentReview["areas"] = {
    asset_identity: asset.findings,
    payout_cost: payout.findings,
    exit_terms: exit.findings,
    role_history: role.findings,
    market_context: marketFindings(input.offer, input.reviewedOn),
  };
  const openGates = [
    !asset.linked && gate("asset_subject_link", "exact 상품과 건축물대장 주소 대조가 닫히지 않았습니다."),
    !payout.offerArithmeticComplete &&
      gate("offer_arithmetic", "공모 구조 원문 또는 공모총액 산식 확인이 부족합니다."),
    !payout.complete && gate("payout_cost_terms", "배당·비용 조건 원문이나 산술 검산이 열려 있습니다."),
    !exit.tradabilityComplete && gate("current_tradability", "현재 거래 상태 원문이 없습니다."),
    !exit.termsComplete && gate("sale_liquidation_terms", "현재 적용되는 매각·청산 조건 원문이 없습니다."),
    !role.rolesIdentified && gate("legal_role_identification", "서로 다른 직접 원문으로 식별된 법적 역할이 2개 미만입니다."),
    !role.disclosuresComplete && gate("current_material_disclosures", "기준일 현재 중요 공시 확인 범위가 없습니다."),
  ].filter((item): item is ReviewOpenGate => item !== false);
  const closedGateCount = Object.keys(GATES).length - openGates.length;
  const evidenceSufficiency: ReviewEvidenceSufficiency =
    openGates.length === 0
      ? "comparable"
      : closedGateCount >= 1
        ? "partial"
        : "insufficient";
  const hasAttention = [
    ...Object.values(areas).flat(),
    ...role.materialEvents,
  ].some((item) => item.tone === "attention");
  const confirmedIssue: ReviewConfirmedIssue = role.critical
    ? "critical_conflict"
    : hasAttention
      ? "needs_follow_up"
      : openGates.length > 0
        ? "not_assessed"
        : "none_found";
  const eventQuestions = role.openEvents.map((item) => `${item.title}의 현재 영향을 확인했나요?`);
  const nextQuestions = [
    ...eventQuestions,
    ...openGates.map((item) => GATES[item.id].question),
  ].filter((question, index, all) => all.indexOf(question) === index);

  return {
    offerId: input.offer.offerId,
    publicName: input.offer.publicAlias,
    sectionTitle: "근거 기반 검토 현황",
    reviewedOn: input.reviewedOn,
    evidenceSufficiency,
    confirmedIssue,
    priorityFindings: priorityFindings(areas, openGates, role.openEvents),
    materialEvents: role.materialEvents,
    openGates,
    nextQuestions,
    areas,
  };
};

export const loadRealEstateInvestmentReview = async (
  offerId: string,
  reviewedOn = new Date().toISOString().slice(0, 10),
): Promise<RealEstateInvestmentReview> => {
  const [offer, loaded] = await Promise.all([
    loadRealEstateOffer(offerId),
    loadLatestReport(offerId).catch(() => undefined),
  ]);
  return reviewRealEstateInvestment({ offer, report: loaded?.report, reviewedOn });
};
