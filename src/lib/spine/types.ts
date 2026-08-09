/**
 * 신뢰 스파인 공통 타입.
 * 설계 원칙: 모든 데이터는 불변(immutable) — 단계마다 새 객체를 반환한다.
 */

export type ScreenDecision = "allow" | "flag" | "block";

export interface RuleHit {
  readonly ruleId: string;
  readonly category: string;
  readonly weight: number;
  readonly matched: string;
}

export interface ScreenVerdict {
  readonly decision: ScreenDecision;
  readonly score: number;
  readonly hits: readonly RuleHit[];
}

export interface Citation {
  readonly sourceId: string;
  readonly title: string;
  readonly url: string;
  readonly quote?: string;
}

export interface CorpusDoc {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly issuer: string;
  readonly content: string;
}

/** LLM이 반드시 채워야 하는 응답 계약 — 출처 없으면 abstain으로 강등된다. */
export interface LlmDraft {
  readonly text: string;
  readonly sourceIds: readonly string[];
}

export interface PendingAction {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly expiresAt: number;
}

/** 파이프라인 최종 응답 — UI는 이 kind로 분기한다. */
export type SpineAnswer =
  | {
      readonly kind: "answer";
      readonly text: string;
      readonly citations: readonly Citation[];
    }
  | {
      readonly kind: "abstain";
      readonly text: string;
      readonly officialChannels: readonly Citation[];
    }
  | {
      readonly kind: "blocked";
      readonly text: string;
      readonly hits: readonly RuleHit[];
    }
  | { readonly kind: "pending_action"; readonly action: PendingAction }
  | { readonly kind: "rate_limited"; readonly text: string };

export interface LlmClient {
  readonly name: string;
  complete(input: {
    readonly system: string;
    readonly user: string;
  }): Promise<LlmDraft>;
}
