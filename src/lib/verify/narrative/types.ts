import type { ExplainLevel } from "../report/view-model/types";

export const NARRATIVE_TAGS = ["fact", "issuer_claim", "calc", "ai"] as const;

export type NarrativeTag = (typeof NARRATIVE_TAGS)[number];

export const NARRATIVE_TAG_LABEL: Record<NarrativeTag, string> = {
  fact: "확인된 사실",
  issuer_claim: "발행사 주장",
  calc: "계산",
  ai: "AI 해석",
};

export const NARRATIVE_LAYERS = ["reality", "price", "history"] as const;

export type NarrativeLayerId = (typeof NARRATIVE_LAYERS)[number];

export const NARRATIVE_LAYER_LABEL: Record<NarrativeLayerId, string> = {
  reality: "① 실재성",
  price: "② 가격 위치",
  history: "③ 이행·감시",
};

export interface NarrativeSentence {
  readonly tag: NarrativeTag;
  readonly text: string;
}

export interface NarrativeLevel {
  readonly layers: Readonly<Record<NarrativeLayerId, readonly NarrativeSentence[]>>;
  readonly overall: readonly NarrativeSentence[];
}

export interface NarrativeFilterLog {
  readonly discarded: number;
  readonly retried: boolean;
  readonly violations: readonly string[];
}

export interface NarrativeDocument {
  readonly offerId: string;
  readonly rcpNo: string;
  readonly reportFileName: string;
  readonly reportGeneratedAt: string;
  readonly generatedAt: string;
  readonly generator: "llm" | "fake";
  readonly model: string;
  readonly levels: Readonly<Record<ExplainLevel, NarrativeLevel>>;
  readonly filter: NarrativeFilterLog;
}

export const isEmptyNarrativeLevel = (level: NarrativeLevel): boolean =>
  level.overall.length === 0 &&
  NARRATIVE_LAYERS.every((layer) => level.layers[layer].length === 0);
