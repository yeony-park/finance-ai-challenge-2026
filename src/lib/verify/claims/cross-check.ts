import type { Claim } from "../types";
import type { ClaimDemotion } from "./extract-rules";

export type CrossCheckDecision =
  | "agreed"
  | "conflict"
  | "rules_only"
  | "llm_only";

export interface CrossCheckEntry {
  readonly claimId: string;
  readonly decision: CrossCheckDecision;
  readonly rulesValue?: string;
  readonly llmValue?: string;
}

export interface CrossCheckSummary {
  readonly agreed: number;
  readonly conflict: number;
  readonly rulesOnly: number;
  readonly llmOnly: number;
}

export interface CrossCheckResult {
  readonly claims: readonly Claim[];
  readonly entries: readonly CrossCheckEntry[];
  readonly demotions: readonly ClaimDemotion[];
  readonly summary: CrossCheckSummary;
}

const comparable = (value: string): string => value.replace(/\s+/g, " ").trim();

const conflictReason = (rules: string, llm: string): string =>
  `규칙 추출값("${rules}")과 LLM 추출값("${llm}")이 달라 확인 불가로 강등했습니다.`;

const LLM_ONLY_REASON =
  "LLM만 추출한 값이라 규칙 파서로 교차확인되지 않았습니다 (판정 보류).";

export const crossCheckClaims = (
  rulesClaims: readonly Claim[],
  llmClaims: readonly Claim[],
): CrossCheckResult => {
  const llmById = new Map(llmClaims.map((claim) => [claim.id, claim]));
  const matchedIds = new Set<string>();

  const claims: Claim[] = [];
  const entries: CrossCheckEntry[] = [];
  const demotions: ClaimDemotion[] = [];

  for (const rules of rulesClaims) {
    const llm = llmById.get(rules.id);
    if (llm) matchedIds.add(rules.id);

    if (rules.verifiability === "unparsed" || !llm) {
      claims.push({ ...rules, extractedBy: "rules" });
      entries.push({
        claimId: rules.id,
        decision: "rules_only",
        rulesValue: rules.value,
        ...(llm === undefined ? {} : { llmValue: llm.value }),
      });
      continue;
    }

    if (comparable(rules.value) === comparable(llm.value)) {
      claims.push({ ...rules, extractedBy: "both" });
      entries.push({
        claimId: rules.id,
        decision: "agreed",
        rulesValue: rules.value,
        llmValue: llm.value,
      });
      continue;
    }

    const reason = conflictReason(rules.value, llm.value);
    claims.push({
      ...rules,
      verifiability: "cross_check_conflict",
      demotionReason: reason,
      extractedBy: "both",
    });
    entries.push({
      claimId: rules.id,
      decision: "conflict",
      rulesValue: rules.value,
      llmValue: llm.value,
    });
    demotions.push({ claimId: rules.id, reason });
  }

  for (const llm of llmClaims) {
    if (matchedIds.has(llm.id)) continue;
    claims.push({
      ...llm,
      verifiability: "llm_only",
      demotionReason: LLM_ONLY_REASON,
      extractedBy: "llm",
    });
    entries.push({
      claimId: llm.id,
      decision: "llm_only",
      llmValue: llm.value,
    });
    demotions.push({ claimId: llm.id, reason: LLM_ONLY_REASON });
  }

  const count = (decision: CrossCheckDecision): number =>
    entries.filter((entry) => entry.decision === decision).length;

  return {
    claims,
    entries,
    demotions,
    summary: {
      agreed: count("agreed"),
      conflict: count("conflict"),
      rulesOnly: count("rules_only"),
      llmOnly: count("llm_only"),
    },
  };
};
