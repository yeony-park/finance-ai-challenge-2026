import type { Claim, DocumentRef } from "../types";
import {
  extractClaimsFrom,
  headTableMissingNote,
  selectHeadTable,
  type ClaimDemotion,
} from "./extract-rules";
import { extractClaimsWithLlm } from "./extract-llm";
import { crossCheckClaims, type CrossCheckEntry, type CrossCheckSummary } from "./cross-check";
import {
  createFakeClaimExtractionClient,
  type ClaimExtractionClient,
} from "./llm-client";

export type ExtractionMode = "rules-only" | "cross-check";

export const DEFAULT_EXTRACTION_MODE: ExtractionMode = "cross-check";

export interface ExtractionRun {
  readonly mode: ExtractionMode;
  readonly claims: readonly Claim[];
  readonly demotions: readonly ClaimDemotion[];
  readonly notes: readonly string[];
  readonly crossCheck?: CrossCheckSummary;
  readonly crossCheckEntries?: readonly CrossCheckEntry[];
  readonly extractorName?: string;
  readonly llmClaims?: readonly Claim[];
}

export interface ExtractionOptions {
  readonly mode?: ExtractionMode;
  readonly extractor?: ClaimExtractionClient;
}

const summaryNote = (
  summary: CrossCheckSummary,
  clientName: string,
): string =>
  `규칙·LLM 교차검증(추출기 ${clientName}) — 양쪽 일치 ${summary.agreed}건 · 규칙 단독 ${summary.rulesOnly}건 · LLM 단독 ${summary.llmOnly}건 · 값 상충 강등 ${summary.conflict}건`;

export const runExtraction = async (
  xml: string,
  document: DocumentRef,
  options: ExtractionOptions = {},
): Promise<ExtractionRun> => {
  const mode = options.mode ?? DEFAULT_EXTRACTION_MODE;
  const selection = selectHeadTable(xml, document);

  if (!selection) {
    return {
      mode,
      claims: [],
      demotions: [],
      notes: [headTableMissingNote(document.offerId)],
    };
  }

  const rules = extractClaimsFrom(selection, document);
  if (mode === "rules-only") {
    return {
      mode,
      claims: rules.claims,
      demotions: rules.demotions,
      notes: [
        `규칙 기반 추출 claim ${rules.claims.length}건 (rules-only 모드 — LLM 교차검증 없음)`,
        ...rules.notes,
      ],
    };
  }

  const client = options.extractor ?? createFakeClaimExtractionClient();
  const llm = await extractClaimsWithLlm(selection, document, client);
  const checked = crossCheckClaims(rules.claims, llm.claims);

  return {
    mode,
    claims: checked.claims,
    demotions: [...rules.demotions, ...checked.demotions],
    notes: [
      `규칙 기반 추출 claim ${rules.claims.length}건 · LLM 추출 claim ${llm.claims.length}건`,
      summaryNote(checked.summary, llm.clientName),
      ...rules.notes,
      ...llm.notes,
    ],
    crossCheck: checked.summary,
    crossCheckEntries: checked.entries,
    extractorName: llm.clientName,
    llmClaims: llm.claims,
  };
};
