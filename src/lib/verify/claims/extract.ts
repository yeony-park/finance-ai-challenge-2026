/**
 * 추출 모드 스위치 — 파이프라인이 보는 단일 진입점.
 *
 * - `rules-only`  : S0 경로. 규칙 파서 단독 (LLM 없음, 완전 결정적)
 * - `cross-check` : S1 기본값. 규칙·LLM을 같은 표에서 각각 뽑아 **필드 단위로 대조**한다
 *
 * 두 모드 모두 키·네트워크 없이 완주한다 — cross-check의 기본 클라이언트가 fake이기 때문이다.
 */
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
  /** cross-check 모드에서만 채워진다 */
  readonly crossCheck?: CrossCheckSummary;
  readonly crossCheckEntries?: readonly CrossCheckEntry[];
  readonly extractorName?: string;
}

export interface ExtractionOptions {
  readonly mode?: ExtractionMode;
  /** cross-check 모드의 LLM 클라이언트. 기본값은 fake — 테스트·CI가 네트워크에 닿지 않게 한다 */
  readonly extractor?: ClaimExtractionClient;
}

const summaryNote = (
  summary: CrossCheckSummary,
  clientName: string,
): string =>
  `규칙·LLM 교차검증(추출기 ${clientName}) — 양쪽 일치 ${summary.agreed}건 · 규칙 단독 ${summary.rulesOnly}건 · LLM 단독 ${summary.llmOnly}건 · 불일치 강등 ${summary.conflict}건`;

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
    // 게이트 실패 강등과 교차검증 강등은 같은 목록으로 합쳐 리포트에 남긴다
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
  };
};
