/**
 * 검증 파이프라인 — 원문 XML → 규칙 추출 → 어댑터 대조 → 3값 판정 → 근거 리포트.
 * 런타임 무관 순수 TS: CLI·Route Handler·cron이 모두 이 함수를 호출한다.
 */
import { extractClaims } from "./claims/extract-rules";
import { judgeClaims } from "./judge/engine";
import { buildReport } from "./report/build";
import { submittedOnFromRcpNo, type DocumentRef, type VerifyReport } from "./types";
import type { LivestockTraceAdapter } from "./adapters/livestock-trace";

/** 접수번호 → 공모 식별자. 미등록 문서는 접수번호 기반 기본값을 쓴다. */
const OFFER_REGISTRY: Readonly<Record<string, string>> = {
  "20260806000159": "bankcow-9",
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
}

export const runVerification = async (
  input: VerifyInput,
): Promise<VerifyReport> => {
  const document = documentRefOf(input.rcpNo);
  const extraction = extractClaims(input.xml, document);
  const outcome = await judgeClaims(extraction.claims, {
    trace: input.trace,
  });

  const demotionNotes = extraction.demotions.map(
    (demotion) => `확인 불가 강등: ${demotion.claimId} — ${demotion.reason}`,
  );

  return buildReport({
    document,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: input.trace.name === "fake" ? "fake" : "live",
    sources: [input.trace.sourceName],
    judgements: outcome.judgements,
    unjudged: outcome.unjudged,
    notes: [
      `규칙 기반 추출 claim ${extraction.claims.length}건 (LLM 미사용 — S0 범위)`,
      ...extraction.notes,
      ...demotionNotes,
    ],
  });
};
