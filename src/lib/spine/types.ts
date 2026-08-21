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

export type CorpusDocKind = "public_record" | "regulation" | "service_doc";

export interface CorpusDoc {
  readonly id: string;
  readonly kind: CorpusDocKind;
  readonly title: string;
  readonly url: string;
  readonly issuer: string;
  readonly content: string;
}

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
