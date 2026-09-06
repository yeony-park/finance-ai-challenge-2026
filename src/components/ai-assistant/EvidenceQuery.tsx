"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { isRecord, isStringArray } from "@/lib/client-response";
import type { EvidenceAnswer } from "@/lib/knowledge/evidence";

import { AiPanel } from "./AiPanel";
import s from "./ai-assistant.module.css";

interface EvidenceHit {
  readonly chunkId: string;
  readonly title: string;
  readonly page: number;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly excerpt: string;
  readonly dataNature?: "observed" | "scenario";
  readonly sourceKind?: string;
  readonly limitations?: readonly string[];
  readonly knowledgeScope?: "general" | "product";
}

export interface EvidenceResult extends Pick<EvidenceAnswer,
  "outcome" | "answer" | "limitations" | "responseKind" | "structuredSources"
> {
  readonly evidence: readonly EvidenceHit[];
  readonly answerSource: EvidenceAnswer["answerSource"] | "general_llm" | "mixed_llm";
  readonly knowledgeScope?: "general" | "product" | "mixed";
}

type StructuredSource = NonNullable<EvidenceAnswer["structuredSources"]>[number];

const isEvidenceResult = (value: unknown): value is EvidenceResult =>
  isRecord(value) &&
  (value.outcome === "answer" || value.outcome === "evidence_only" || value.outcome === "abstain") &&
  typeof value.answer === "string" &&
  (value.answerSource === "structured" || value.answerSource === "approved_cache" ||
    value.answerSource === "live_llm" || value.answerSource === "general_llm" ||
    value.answerSource === "mixed_llm" || value.answerSource === "none") &&
  (value.knowledgeScope === undefined || value.knowledgeScope === "general" ||
    value.knowledgeScope === "product" || value.knowledgeScope === "mixed") &&
  (value.responseKind === undefined || value.responseKind === "scope-guidance") &&
  isStringArray(value.limitations) &&
  Array.isArray(value.evidence) && value.evidence.every((item: unknown) =>
    isRecord(item) &&
    [item.chunkId, item.title, item.sourceUrl, item.asOf, item.excerpt].every((field) => typeof field === "string") &&
    typeof item.page === "number" && Number.isInteger(item.page) && item.page > 0 &&
    (item.dataNature === undefined || item.dataNature === "observed" || item.dataNature === "scenario") &&
    (item.sourceKind === undefined || typeof item.sourceKind === "string") &&
    (item.knowledgeScope === undefined || item.knowledgeScope === "general" || item.knowledgeScope === "product") &&
    (item.limitations === undefined || isStringArray(item.limitations))
  ) &&
  (value.structuredSources === undefined ||
    (Array.isArray(value.structuredSources) && value.structuredSources.every((item: unknown) =>
      isRecord(item) && item.dataNature === "observed" &&
      [item.label, item.url, item.asOf].every((field) => typeof field === "string")
    )));

const OUTCOME_LABEL: Readonly<Record<EvidenceResult["outcome"], string>> = {
  answer: "상품 문서에서 확인",
  evidence_only: "관련 문서만 확인됨",
  abstain: "확인 자료 부족 · 답변 보류",
};

export const evidenceResultTitle = (
  result: Pick<EvidenceResult, "outcome" | "answerSource" | "structuredSources" | "responseKind" | "knowledgeScope">,
): string => {
  if (result.responseKind === "scope-guidance") return "검색 범위 안내";
  if (result.answerSource === "general_llm") return "공개 일반지식을 바탕으로 생성한 답변";
  if (result.answerSource === "mixed_llm") return "일반 기준과 상품 원문을 바탕으로 생성한 답변";
  if (result.answerSource === "structured") {
    return result.structuredSources && result.structuredSources.length > 0
      ? "공식 공개정보에서 확인"
      : "상품 조건에서 확인";
  }
  if (result.answerSource === "approved_cache") return "연결된 상품 문서에서 확인";
  if (result.answerSource === "live_llm") return "상품 원문을 바탕으로 생성한 답변";
  return OUTCOME_LABEL[result.outcome];
};

export const evidenceSourceLabel = (result: EvidenceResult): string => {
  if (result.responseKind === "scope-guidance") return "검색 범위 안내";
  if (result.knowledgeScope === "general") return "일반 공개정보";
  if (result.knowledgeScope === "mixed") {
    const scopes = new Set(result.evidence.map((item) => item.knowledgeScope));
    if (scopes.has("general") && scopes.has("product")) return "일반 공개정보 · 현재 상품 문서";
    if (scopes.has("general")) return "일반 공개정보";
    if (scopes.has("product")) return "현재 상품 문서";
  }
  if (result.answerSource === "structured") {
    return result.structuredSources && result.structuredSources.length > 0
      ? "공식 공개정보"
      : "상품 조건";
  }

  const evidence = result.evidence;
  if (evidence.some((item) =>
    item.dataNature === "observed" &&
    (item.sourceKind === "official-document" || item.sourceKind === "external-observation")
  )) return "공식 공개정보";
  if (evidence.some((item) => item.sourceKind === "scenario-input")) return "상품 조건";
  if (result.answerSource === "approved_cache" || result.answerSource === "live_llm") {
    return "문서 근거";
  }
  return "확인 가능한 근거 없음";
};

const comparableText = (value: string): string => value
  .replace(/\s+/g, " ")
  .replace(/[.,!?·:;()[\]{}'"“”‘’]/g, "")
  .trim()
  .toLocaleLowerCase("ko-KR");

export const directLimitations = (result: EvidenceResult): readonly string[] => {
  if (result.answerSource === "structured") return [];

  const evidenceLimitations = result.evidence.flatMap((item) => item.limitations ?? []);
  const candidates = evidenceLimitations.length > 0 ? evidenceLimitations : result.limitations;
  const answer = comparableText(result.answer);
  const seen = new Set<string>();

  return candidates.filter((item) => {
    const normalized = comparableText(item);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return !answer || (!answer.includes(normalized) && !normalized.includes(answer));
  }).slice(0, 3);
};

const SCENARIO_EXAMPLES = [
  "최소투자금은 얼마인가요?",
  "운용기간과 매각조건은 무엇인가요?",
  "가상 운영주체의 과거 이력은 무엇인가요?",
] as const;

export const COMMON_EVIDENCE_EXAMPLES = [
  "이 상품의 핵심 조건은 무엇인가요?",
  "위험 요인은 무엇인가요?",
  "수수료와 회수 조건은 무엇인가요?",
] as const;

export const CATTLE_FILING_EVIDENCE_EXAMPLES = [
  "공모가격은 얼마인가요?",
  "예상 사업기간은 얼마인가요?",
  "수수료는 어떻게 되나요?",
  "투자자보호기금은 어떻게 운영되나요?",
] as const;

export const PIG_FILING_EVIDENCE_EXAMPLES = [
  { label: "공모 좌수·단가·총액", q: "공모 좌수·단가·총액" },
  { label: "청약·배정 및 납입 절차", q: "청약·배정 및 납입 절차" },
  { label: "투자자 보호기금", q: "투자자 보호기금" },
  { label: "수수료 부담 위험", q: "한정된 수수료 위험" },
] as const;

export type EvidenceExample = string | { readonly label: string; readonly q: string };

export const safeCitationUrl = (value: string): string | null => {
  if (/^\/scenario-documents\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(value)) return value;
  if (/^\/art\?product=synthetic-offering-\d{2}$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

export function StructuredSourceList({ sources }: { readonly sources: readonly StructuredSource[] }) {
  return (
    <ul className={s.sourceList} aria-label="공식 공개정보 출처">
      {sources.map((source) => {
        const url = safeCitationUrl(source.url);
        const label = `${source.label} · ${source.asOf} 기준`;
        return (
          <li key={`${source.url}-${source.asOf}`}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (새 창)`}>
                출처 · {source.label}
              </a>
            ) : <span>출처 · {source.label}</span>}
            <span>{source.asOf} 기준 · 공식 공개정보</span>
          </li>
        );
      })}
    </ul>
  );
}

export function EvidenceResultPanel({ result }: { readonly result: EvidenceResult }) {
  const limitations = directLimitations(result);
  const hasStructuredSources = result.structuredSources && result.structuredSources.length > 0;

  return (
    <div className={s.queryResult}>
      <div className={s.resultGroup}>
        <h3 className={s.resultHeading}>답변</h3>
        <p className={s.resultOutcome}>{evidenceResultTitle(result)}</p>
        <p className={s.resultSource}>근거 유형 · {evidenceSourceLabel(result)}</p>
        <p className={s.resultAnswer}>{result.answer}</p>
      </div>

      <details className={s.resultGroup}>
        <summary className={s.resultHeading}>확인 근거</summary>
        {hasStructuredSources ? <StructuredSourceList sources={result.structuredSources ?? []} /> : null}
        {result.answerSource === "structured" && !hasStructuredSources ? (
          <p className={s.resultNote}>등록된 상품 조건을 바탕으로 확인했습니다.</p>
        ) : null}
        {result.evidence.length > 0 ? (
          <ul className={s.citationList}>
            {result.evidence.map((item) => {
              const url = safeCitationUrl(item.sourceUrl);
              const isArtJson = url?.startsWith("/art?product=synthetic-offering-") === true;
              const isGeneral = item.knowledgeScope === "general";
              const href = url
                ? isGeneral
                  ? url
                  : isArtJson ? `${url}#selected-art-product` : `${url.replace(/#.*$/, "")}#page=${item.page}`
                : null;
              const locator = isGeneral
                ? "공통 지식"
                : isArtJson
                ? `근거 섹션 ${item.page}`
                : item.chunkId.includes("-dart-full-")
                  ? `문서 섹션 ${item.page}`
                  : `${item.page}쪽`;
              const label = `${item.title} · ${locator} · ${item.asOf} 기준`;
              return (
                <li key={item.chunkId}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (새 창)`}>
                      {label}
                    </a>
                  ) : <span>{label}</span>}
                  <p>{item.excerpt}</p>
                </li>
              );
            })}
          </ul>
        ) : result.answerSource !== "structured" ? (
          <p className={s.resultNote}>질문과 직접 연결된 근거를 찾지 못했습니다.</p>
        ) : null}
      </details>

      <div className={s.resultGroup}>
        <h3 className={s.resultHeading}>확인 한계</h3>
        {limitations.length > 0 ? (
          <ul className={s.limitList}>{limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : (
          <p className={s.resultNote}>추가로 구분해 표시할 확인 한계가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export type EvidenceQueryScope =
  | { readonly scenarioId: string; readonly offerId: string }
  | {
      readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
      readonly productId: string;
      readonly dataNature: "observed";
      readonly namespace: "common" | "published-offer";
      readonly scenarioId?: never;
    }
  | {
      readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
      readonly productId: string;
      readonly dataNature: "scenario";
      readonly namespace: "common";
      readonly scenarioId: string;
    };

export const cattleFilingEvidenceScope = (productId: string): EvidenceQueryScope => ({
  categoryId: "cattle",
  productId,
  dataNature: "observed",
  namespace: "published-offer",
});

export const pigFilingEvidenceScope = (productId: string): EvidenceQueryScope => ({
  categoryId: "pig",
  productId,
  dataNature: "observed",
  namespace: "published-offer",
});

export const evidenceRequestBody = (scope: EvidenceQueryScope, q: string) => ({
  ...scope,
  q: q.trim(),
  limit: 5,
});

export type AskEvidence = (
  scope: EvidenceQueryScope,
  question: string,
  signal: AbortSignal,
) => Promise<EvidenceResult>;

export const requestEvidence: AskEvidence = async (scope, question, signal) => {
  const response = await fetch("/api/evidence/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(evidenceRequestBody(scope, question)),
    signal,
  });
  if (!response.ok) throw new Error("request failed");
  const result: unknown = await response.json();
  if (!isEvidenceResult(result)) throw new Error("invalid evidence response");
  return result;
};

export interface EvidenceQueryProps {
  readonly scope: EvidenceQueryScope;
  readonly examples: readonly EvidenceExample[];
  readonly lead: string;
  /** Client-side adapter for the team's RAG service. */
  readonly onAsk?: AskEvidence;
}

export function EvidenceQuery(props: EvidenceQueryProps) {
  return <EvidenceQueryForm key={JSON.stringify(props.scope)} {...props} />;
}

function EvidenceQueryForm({
  scope,
  examples,
  lead,
  onAsk = requestEvidence,
}: EvidenceQueryProps) {
  const questionId = useId();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const ask = async (value: string, restoreSubmitFocus = false) => {
    const q = value.trim();
    if (!q || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setQuestion(q);
    setStatus("loading");
    setResult(null);
    try {
      const answer = await onAsk(scope, q, controller.signal);
      if (controller.signal.aborted) return;
      setResult(answer);
      setStatus("idle");
    } catch {
      if (controller.signal.aborted) return;
      setStatus("error");
    } finally {
      requestRef.current = null;
      if (restoreSubmitFocus && !controller.signal.aborted) {
        window.requestAnimationFrame(() => submitButtonRef.current?.focus());
      }
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "loading") return;
    void ask(question, true);
  };

  const statusMessage = status === "loading"
    ? "근거 확인 중"
    : status === "error"
      ? "근거 확인 실패"
      : result
        ? "근거 확인 완료"
        : "";

  return (
    <AiPanel title="Copilot" busy={status === "loading"}>
      <p className={s.lead}>{lead}</p>

      <div className={s.exampleRow} aria-label="예시 질문">
        {examples.map((example) => {
          const label = typeof example === "string" ? example : example.label;
          const q = typeof example === "string" ? example : example.q;
          return (
            <button key={label} type="button" className={s.exampleButton} disabled={status === "loading"} onClick={() => void ask(q)}>
              {label}
            </button>
          );
        })}
      </div>

      <form className={s.queryForm} onSubmit={submit}>
        <label htmlFor={questionId} className="sr-only">AI Copilot 질문</label>
        <textarea
          id={questionId}
          rows={2}
          className={s.queryInput}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="예: 수수료와 회수 조건은 무엇인가요?"
          maxLength={200}
        />
        <button
          ref={submitButtonRef}
          className={s.queryButton}
          type="submit"
          disabled={status === "loading" || !question.trim()}
          aria-busy={status === "loading"}
        >
          {status === "loading" ? "확인 중…" : "Copilot에게 묻기"}
        </button>
      </form>

      <p className={status === "loading" ? s.resultNote : "sr-only"} role="status" aria-live="polite">{statusMessage}</p>
      {status === "error" ? (
        <div className={s.queryResult}>
          <p className={s.queryError} role="alert">답변을 불러오지 못했습니다. 질문을 다시 보내 주세요.</p>
        </div>
      ) : result ? <EvidenceResultPanel result={result} /> : null}
    </AiPanel>
  );
}

export function ScenarioEvidenceQuery({
  scenarioId,
  offerId,
}: {
  readonly scenarioId: string;
  readonly offerId: string;
}) {
  return (
    <EvidenceQuery
      scope={{ scenarioId, offerId }}
      examples={SCENARIO_EXAMPLES}
      lead="시나리오 조건과 연결된 문서를 바탕으로 답합니다."
    />
  );
}

export function CattleFilingEvidenceQuery({ productId }: { readonly productId: string }) {
  return (
    <EvidenceQuery
      scope={cattleFilingEvidenceScope(productId)}
      examples={CATTLE_FILING_EVIDENCE_EXAMPLES}
      lead="이 상품의 DART 공시에서 답변 근거를 찾습니다."
    />
  );
}

export function CattleMinimumFilingEvidenceQuery({ productId }: { readonly productId: string }) {
  return (
    <EvidenceQuery
      scope={cattleFilingEvidenceScope(productId)}
      examples={["원금 미보장"]}
      lead="이 상품은 공시의 원금 미보장 문단만 확인할 수 있습니다."
    />
  );
}

export function PigFilingEvidenceQuery({ productId }: { readonly productId: string }) {
  return (
    <EvidenceQuery
      scope={pigFilingEvidenceScope(productId)}
      examples={PIG_FILING_EVIDENCE_EXAMPLES}
      lead="이 상품의 DART 공시에서 답변 근거를 찾습니다."
    />
  );
}
