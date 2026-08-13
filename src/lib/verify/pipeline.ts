/**
 * 검증 파이프라인 — 원문 XML → 규칙 추출 → 어댑터 대조 → 3값 판정 → 근거 리포트.
 * 런타임 무관 순수 TS: CLI·Route Handler·cron이 모두 이 함수를 호출한다.
 */
import { runExtraction, type ExtractionMode } from "./claims/extract";
import type { ClaimExtractionClient } from "./claims/llm-client";
import { judgeClaims } from "./judge/engine";
import { buildReport } from "./report/build";
import { submittedOnFromRcpNo, type DocumentRef, type VerifyReport } from "./types";
import type { LivestockTraceAdapter } from "./adapters/livestock-trace";

/**
 * 접수번호 → 공모 식별자. 미등록 문서는 접수번호 기반 기본값을 쓴다.
 * 슬러그는 발행사명이 아니라 자산 종류로 둔다 — 공개 URL·디렉토리에 발행사 브랜드를 박지 않는다.
 */
const OFFER_REGISTRY: Readonly<Record<string, string>> = {
  "20260806000159": "livestock-9",
};

export const resolveOfferId = (rcpNo: string): string =>
  OFFER_REGISTRY[rcpNo] ?? `offer-${rcpNo}`;

export const documentRefOf = (rcpNo: string): DocumentRef => ({
  offerId: resolveOfferId(rcpNo),
  rcpNo,
  submittedOn: submittedOnFromRcpNo(rcpNo),
});

export interface VerifyInput {
  readonly rcpNo: string;
  readonly xml: string;
  readonly trace: LivestockTraceAdapter;
  readonly generatedAt?: string;
  /** 추출 모드 — 기본값은 cross-check(규칙+LLM 교차검증) */
  readonly extractionMode?: ExtractionMode;
  /**
   * cross-check 모드의 LLM 클라이언트.
   * 생략하면 fake — 이 기본값 덕분에 테스트·CI는 키·네트워크 없이 완주한다.
   * 실키 경로는 호출자(CLI·Route Handler)가 명시적으로 주입한다.
   */
  readonly extractor?: ClaimExtractionClient;
}

export const runVerification = async (
  input: VerifyInput,
): Promise<VerifyReport> => {
  const document = documentRefOf(input.rcpNo);
  const extraction = await runExtraction(input.xml, document, {
    ...(input.extractionMode === undefined
      ? {}
      : { mode: input.extractionMode }),
    ...(input.extractor === undefined ? {} : { extractor: input.extractor }),
  });
  const outcome = await judgeClaims(extraction.claims, {
    trace: input.trace,
  });

  const demotionNotes = extraction.demotions.map(
    (demotion) => `대조 불가 강등: ${demotion.claimId} — ${demotion.reason}`,
  );

  return buildReport({
    document,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: input.trace.name === "fake" ? "fake" : "live",
    sources: [input.trace.sourceName],
    judgements: outcome.judgements,
    unjudged: outcome.unjudged,
    notes: [`추출 모드: ${extraction.mode}`, ...extraction.notes, ...demotionNotes],
  });
};
