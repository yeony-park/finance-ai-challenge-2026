import type {
  Claim,
  Evidence,
  Judgement,
  PricePlacement,
  UnjudgedClaim,
  Verdict,
} from "../types";
import { createJudgement } from "../types";
import type {
  LivestockTraceAdapter,
  LivestockTraceRecord,
} from "../adapters/livestock-trace";
import type { AuctionPriceAdapter } from "../adapters/auction-price";
import { mapWithConcurrency } from "../concurrency";
import { assess, type Assessment } from "./assess";
import { placePrices } from "./price";

export { locationTokens } from "./assess";

const LOOKUP_CONCURRENCY = 4;

const TRACE_KINDS = new Set<Claim["kind"]>([
  "livestock_trace_no",
  "livestock_breed",
  "livestock_sex",
  "custody_location",
  "acquisition_date",
]);

const PRICE_KIND: Claim["kind"] = "acquisition_price";

export interface JudgeOutcome {
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly pricePlacements: readonly PricePlacement[];
}

const stanceOf = (verdict: Verdict): Evidence["stance"] =>
  verdict === "match"
    ? "supports"
    : verdict === "mismatch"
      ? "contradicts"
      : "context";

const toEvidence = (
  claim: Claim,
  adapter: LivestockTraceAdapter,
  record: LivestockTraceRecord,
  assessment: Assessment,
): Evidence => ({
  sourceId: adapter.sourceId,
  sourceName: adapter.sourceName,
  url: `${adapter.url}?traceNo=${record.traceNo12}`,
  observedAt: record.observedAt,
  field: claim.field,
  claimed: claim.value,
  observed: assessment.observed,
  stance: stanceOf(assessment.verdict),
  ...(assessment.note === undefined ? {} : { note: assessment.note }),
});

const unjudgedReason = (claim: Claim): string | undefined => {
  const detail = claim.demotionReason ?? "사유 미상";
  switch (claim.verifiability) {
    case "unparsed":
      return `원문 값이 스키마를 통과하지 못해 대조 불가로 남깁니다: ${detail}`;
    case "cross_check_conflict":
      return `규칙 추출과 LLM 추출이 갈려 대조 불가로 남깁니다: ${detail}`;
    case "llm_only":
      return `규칙 파서로 교차확인되지 않은 추출값이라 대조 불가로 남깁니다: ${detail}`;
    case "no_reference_data":
      return "이 항목을 대조할 공개 데이터가 없습니다(대조 불가).";
    case "structurally_impossible":
      return "개체 식별자가 없어 구조적으로 대조할 수 없습니다(대조 불가).";
    case "verifiable":
      return TRACE_KINDS.has(claim.kind) || claim.kind === PRICE_KIND
        ? undefined
        : "이 항목을 대조할 공공 데이터 어댑터가 아직 연결되지 않았습니다(대조 불가).";
  }
  const unreachable: never = claim.verifiability;
  throw new Error(`미판정 사유 규칙이 없는 상태입니다: ${String(unreachable)}`);
};

interface SubjectGroup {
  readonly subject: string;
  readonly claims: readonly Claim[];
  readonly identity: Claim | undefined;
}

const groupBySubject = (claims: readonly Claim[]): readonly SubjectGroup[] => {
  const order: string[] = [];
  const grouped = new Map<string, Claim[]>();
  for (const claim of claims) {
    const bucket = grouped.get(claim.subject);
    if (bucket) bucket.push(claim);
    else {
      grouped.set(claim.subject, [claim]);
      order.push(claim.subject);
    }
  }

  return order.map((subject) => {
    const subjectClaims = grouped.get(subject) ?? [];
    return {
      subject,
      claims: subjectClaims,
      identity: subjectClaims.find(
        (claim) =>
          claim.kind === "livestock_trace_no" &&
          claim.verifiability === "verifiable",
      ),
    };
  });
};

interface LookupOutcome {
  readonly record?: LivestockTraceRecord;
  readonly error?: string;
}

const lookupRecord = async (
  group: SubjectGroup,
  trace: LivestockTraceAdapter,
): Promise<LookupOutcome> => {
  if (!group.identity) return {};
  try {
    return { record: await trace.lookup(group.identity.value) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

export const judgeClaims = async (
  claims: readonly Claim[],
  deps: {
    readonly trace: LivestockTraceAdapter;
    readonly auction?: AuctionPriceAdapter;
  },
): Promise<JudgeOutcome> => {
  const ledgerClaims = claims.filter((claim) => claim.kind !== PRICE_KIND);
  const groups = groupBySubject(ledgerClaims);

  const outcomes = await mapWithConcurrency(groups, LOOKUP_CONCURRENCY, (group) =>
    lookupRecord(group, deps.trace),
  );

  const judgements: Judgement[] = [];
  const unjudged: UnjudgedClaim[] = [];

  groups.forEach((group, index) => {
    const { record, error } = outcomes[index];
    if (!record) {
      const fallbackReason = error
        ? `${group.subject}의 이력번호를 공적 원장에서 조회하지 못했습니다: ${error}`
        : `${group.subject}의 이력번호를 읽을 수 없어 공적 원장과 대조하지 못했습니다.`;
      for (const claim of group.claims) {
        unjudged.push({ claim, reason: unjudgedReason(claim) ?? fallbackReason });
      }
      return;
    }

    for (const claim of group.claims) {
      const reason = unjudgedReason(claim);
      if (reason) {
        unjudged.push({ claim, reason });
        continue;
      }
      const assessment = assess(claim, record);
      judgements.push(
        createJudgement({
          claim,
          verdict: assessment.verdict,
          evidence: [toEvidence(claim, deps.trace, record, assessment)],
          rationale: assessment.rationale,
        }),
      );
    }
  });

  const priceClaims = claims.filter((claim) => claim.kind === PRICE_KIND);
  const demoted = priceClaims.flatMap((claim) => {
    const reason = unjudgedReason(claim);
    return reason ? [{ claim, reason }] : [];
  });
  const placeable = priceClaims.filter(
    (claim) => unjudgedReason(claim) === undefined,
  );
  const priceLayer = placePrices({
    claims,
    priceClaims: placeable,
    judgements,
    auction: deps.auction,
  });

  return {
    judgements,
    unjudged: [...unjudged, ...demoted, ...priceLayer.unplaced],
    pricePlacements: priceLayer.placements,
  };
};
