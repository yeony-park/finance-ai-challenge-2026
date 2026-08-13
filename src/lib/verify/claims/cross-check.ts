/**
 * 규칙 추출 ↔ LLM 추출 **필드 단위 교차검증**.
 *
 * 채택 규칙 (주석이 아니라 `__tests__/cross-check.test.ts`가 계약이다)
 * | 상황 | 결정 | claim 처리 |
 * |---|---|---|
 * | 양쪽이 같은 값 | `agreed` | 채택 · 출처 `both` · 검증 가능 상태 유지 |
 * | 양쪽이 다른 값 | `conflict` | **확인 불가 강등**(`cross_check_conflict`) · 판정 생성 안 함 · 두 값 모두 사유에 기록 |
 * | 규칙만 있음 | `rules_only` | 채택 · 출처 `rules` — 규칙 파서는 결정적·재현 가능하므로 판정 재료로 쓴다 |
 * | LLM만 있음 | `llm_only` | 기록하되 **판정 보류**(`llm_only`) — 규칙으로 교차확인되지 않은 값은 근거가 되지 못한다 |
 * | 규칙이 게이트 실패(`unparsed`) | `rules_only` | LLM 값으로 **복구하지 않는다** — 형식이 깨진 원문을 모델이 메우게 두지 않는다 |
 *
 * 불변식
 * - 파이프라인은 어떤 경우에도 멈추지 않는다 (강등은 있어도 중단은 없다)
 * - 강등된 필드는 판정이 만들어지지 않으므로 "근거 0건 판정 없음" 불변식이 그대로 유지된다
 * - 출력 순서는 규칙 추출 순서 → LLM 단독 추출 순서 (결정적)
 */
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

/** 비교는 정규화된 값끼리 한다 — 서식 차이를 불일치로 오인하지 않기 위해 */
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

    // 게이트를 통과하지 못한 필드는 LLM 값으로 되살리지 않는다
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
