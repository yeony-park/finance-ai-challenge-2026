import type {
  BuildingHubCache,
  BuildingHubCacheLookup,
  BuildingHubRequest,
  BuildingRegisterRecord,
} from "../adapters/building-register";
import type { RealEstateOffer } from "../claims/real-estate";
import type {
  Claim,
  ClaimKind,
  Evidence,
  Judgement,
  UnjudgedClaim,
} from "../types";
import { createJudgement } from "../types";

const BUILDING_CLAIM_KINDS: ReadonlySet<ClaimKind> = new Set([
  "real_estate_address",
  "real_estate_parcel_area",
  "real_estate_building_area",
  "real_estate_total_area",
  "real_estate_use_approved_month",
]);

const AREA_TOLERANCE_SQM = 0.01;

const FIELD_SUBJECT: Readonly<Record<string, string>> = {
  소재지: "소재지가",
  대지면적: "대지면적이",
  건축면적: "건축면적이",
  연면적: "연면적이",
  사용승인월: "사용승인월이",
};

const normalizeParcelAddress = (value: string): string =>
  value.replace(/\s*번지\s*$/, "").replace(/\s+/g, " ").trim();

const sameRequest = (
  expected: BuildingHubRequest,
  actual: BuildingHubRequest,
): boolean =>
  expected.sigunguCd === actual.sigunguCd &&
  expected.bjdongCd === actual.bjdongCd &&
  expected.platGbCd === actual.platGbCd &&
  expected.bun === actual.bun &&
  expected.ji === actual.ji;

const recordOf = (
  offer: RealEstateOffer,
  cache: BuildingHubCache,
): BuildingRegisterRecord | undefined =>
  cache.records.find(
    (record) =>
      record.parcelAddress !== undefined &&
      normalizeParcelAddress(record.parcelAddress) ===
        normalizeParcelAddress(offer.asset.address),
  ) ?? (cache.records.length === 1 ? cache.records[0] : undefined);

interface ObservedValue {
  readonly value: string | number;
  readonly display: string;
}

const observedOf = (
  kind: ClaimKind,
  record: BuildingRegisterRecord,
): ObservedValue | undefined => {
  switch (kind) {
    case "real_estate_address":
      return record.parcelAddress
        ? { value: normalizeParcelAddress(record.parcelAddress), display: record.parcelAddress }
        : undefined;
    case "real_estate_parcel_area":
      return record.parcelAreaSqm === undefined
        ? undefined
        : { value: record.parcelAreaSqm, display: `${record.parcelAreaSqm}㎡` };
    case "real_estate_building_area":
      return record.buildingAreaSqm === undefined
        ? undefined
        : { value: record.buildingAreaSqm, display: `${record.buildingAreaSqm}㎡` };
    case "real_estate_total_area":
      return record.totalAreaSqm === undefined
        ? undefined
        : { value: record.totalAreaSqm, display: `${record.totalAreaSqm}㎡` };
    case "real_estate_use_approved_month":
      return record.useApprovedOn
        ? { value: record.useApprovedOn.slice(0, 7), display: record.useApprovedOn }
        : undefined;
    default:
      return undefined;
  }
};

const matches = (claim: Claim, observed: ObservedValue): boolean => {
  if (claim.kind === "real_estate_address") {
    return normalizeParcelAddress(claim.value) === observed.value;
  }
  if (claim.kind === "real_estate_use_approved_month") {
    return claim.value === observed.value;
  }
  return (
    typeof observed.value === "number" &&
    claim.numericValue !== undefined &&
    Math.abs(claim.numericValue - observed.value) <= AREA_TOLERANCE_SQM
  );
};

const platformEvidence = (
  offer: RealEstateOffer,
  claim: Claim,
): Evidence | undefined => {
  const source =
    offer.sources.find(
      (item) =>
        item.sourceKind === "platform-claim" && item.label.includes("상품 상세"),
    ) ?? offer.sources.find((item) => item.sourceKind === "platform-claim");
  if (!source) return undefined;
  return {
    sourceId: `platform-claim:${offer.offerId}`,
    sourceName: "플랫폼 상품 상세 (platform-claim)",
    url: source.url,
    observedAt: source.collectedAt,
    field: claim.field,
    claimed: claim.value,
    observed:
      claim.kind === "real_estate_address"
        ? claim.value
        : `플랫폼 원문 기재 ${claim.value}`,
    stance: "context",
    note: "플랫폼 주장 원문 링크이며 독립 원장 판정 근거와 구분합니다.",
  };
};

const judgementOf = (
  offer: RealEstateOffer,
  claim: Claim,
  cache: BuildingHubCache,
  observed: ObservedValue,
): Judgement => {
  const match = matches(claim, observed);
  const context = platformEvidence(offer, claim);
  const fieldSubject = FIELD_SUBJECT[claim.field] ?? `${claim.field} 값이`;
  return createJudgement({
    claim,
    verdict: match ? "match" : "mismatch",
    evidence: [
      {
        sourceId: cache.sourceId,
        sourceName: cache.sourceName,
        url: cache.sourceUrl,
        observedAt: cache.collectedAt,
        field: claim.field,
        claimed: claim.value,
        observed: observed.display,
        stance: match ? "supports" : "contradicts",
        note: `BuildingHUB exact parcel 표제부 ${cache.totalCount}건 대조`,
      },
      ...(context ? [context] : []),
    ],
    rationale: match
      ? `${fieldSubject} 건축물대장 exact parcel 표제부와 일치합니다`
      : `${fieldSubject} 건축물대장 exact parcel 표제부와 다릅니다`,
  });
};

export interface BuildingRegisterJudgeOutcome {
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
}

export const judgeBuildingRegister = (
  offer: RealEstateOffer,
  claims: readonly Claim[],
  lookup?: BuildingHubCacheLookup,
): BuildingRegisterJudgeOutcome => {
  const targets = claims.filter(
    (claim) =>
      BUILDING_CLAIM_KINDS.has(claim.kind) &&
      claim.verifiability === "verifiable",
  );
  if (targets.length === 0) return { judgements: [], unjudged: [] };

  const unavailable = (reason: string): BuildingRegisterJudgeOutcome => ({
    judgements: [],
    unjudged: targets.map((claim) => ({
      claim,
      reason: `${reason}(대조 불가).`,
    })),
  });

  if (!lookup?.cache) {
    return unavailable(
      lookup?.reason ?? "건축물대장 exact parcel 캐시가 연결되지 않았습니다",
    );
  }
  const cache = lookup.cache;
  if (cache.status !== "ok") {
    return unavailable(
      cache.reason ?? `건축물대장 exact parcel 캐시 상태가 ${cache.status}입니다`,
    );
  }
  if (
    !offer.asset.buildingHubRequest ||
    !sameRequest(offer.asset.buildingHubRequest, cache.request)
  ) {
    return unavailable("상품의 exact parcel 조회 조건과 캐시 요청이 다릅니다");
  }
  const record = recordOf(offer, cache);
  if (!record) {
    return unavailable("exact parcel 표제부에서 대상 건물을 하나로 식별하지 못했습니다");
  }

  const judgements: Judgement[] = [];
  const unjudged: UnjudgedClaim[] = [];
  for (const claim of targets) {
    const observed = observedOf(claim.kind, record);
    if (!observed) {
      unjudged.push({
        claim,
        reason: `건축물대장 표제부에 ${claim.field} 값이 없어 판정을 보류합니다(대조 불가).`,
      });
      continue;
    }
    judgements.push(judgementOf(offer, claim, cache, observed));
  }
  return { judgements, unjudged };
};
