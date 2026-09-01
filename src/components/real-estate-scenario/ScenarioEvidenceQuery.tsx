"use client";

import { useRef, useState, type FormEvent } from "react";

import s from "./scenario.module.css";

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
}

interface EvidenceResult {
  readonly outcome: "answer" | "evidence_only" | "abstain";
  readonly answer: string;
  readonly evidence: readonly EvidenceHit[];
  readonly limitations: readonly string[];
  readonly answerSource: "structured" | "approved_cache" | "live_llm" | "none";
  readonly responseKind?: "scope-guidance";
  readonly structuredSources?: readonly StructuredSource[];
}

interface StructuredSource {
  readonly label: string;
  readonly url: string;
  readonly asOf: string;
  readonly dataNature: "observed";
}

const OUTCOME_LABEL: Readonly<Record<EvidenceResult["outcome"], string>> = {
  answer: "상품 문서에서 확인",
  evidence_only: "관련 문서만 확인됨",
  abstain: "확인 자료 부족 · 답변 보류",
};

export const evidenceResultTitle = (
  result: Pick<EvidenceResult, "outcome" | "answerSource" | "structuredSources" | "responseKind">,
): string => {
  if (result.responseKind === "scope-guidance") return "검색 범위 안내";
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

type EvidenceExample = string | { readonly label: string; readonly q: string };

export const safeCitationUrl = (value: string): string | null => {
  if (/^\/scenario-documents\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(value)) return value;
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

      <div className={s.resultGroup}>
        <h3 className={s.resultHeading}>확인 근거</h3>
        {hasStructuredSources ? <StructuredSourceList sources={result.structuredSources ?? []} /> : null}
        {result.answerSource === "structured" && !hasStructuredSources ? (
          <p className={s.resultNote}>등록된 상품 조건을 바탕으로 확인했습니다.</p>
        ) : null}
        {result.evidence.length > 0 ? (
          <ul className={s.citationList}>
            {result.evidence.map((item) => {
              const url = safeCitationUrl(item.sourceUrl);
              const href = url ? `${url.replace(/#.*$/, "")}#page=${item.page}` : null;
              const label = `${item.title} · ${item.page}쪽 · ${item.asOf} 기준`;
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
      </div>

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

export function EvidenceQuery({
  scope,
  examples,
  lead,
}: {
  readonly scope: EvidenceQueryScope;
  readonly examples: readonly EvidenceExample[];
  readonly lead: string;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const ask = async (value: string, restoreSubmitFocus = false) => {
    const q = value.trim();
    if (!q) return;
    setQuestion(q);
    setStatus("loading");
    setResult(null);
    try {
      const response = await fetch("/api/evidence/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(evidenceRequestBody(scope, q)),
      });
      if (!response.ok) throw new Error("request failed");
      setResult((await response.json()) as EvidenceResult);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      if (restoreSubmitFocus) {
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
    <section className={s.querySection} aria-labelledby="evidence-query-title">
      <p className={s.eyebrow}>AI Copilot</p>
      <h2 id="evidence-query-title" className={s.sectionTitle}>상품 조건과 문서 근거를 물어보세요</h2>
      <p className={s.sectionLead}>{lead}</p>

      <div className={s.exampleRow} aria-label="예시 질문">
        {examples.map((example) => {
          const label = typeof example === "string" ? example : example.label;
          const q = typeof example === "string" ? example : example.q;
          return (
            <button key={label} type="button" className={s.exampleButton} onClick={() => void ask(q)}>
              {label}
            </button>
          );
        })}
      </div>

      <form className={s.queryForm} onSubmit={submit}>
        <label htmlFor="scenario-question" className="sr-only">AI Copilot 질문</label>
        <input
          id="scenario-question"
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
          Copilot에게 묻기
        </button>
      </form>

      <p className="sr-only" role="status" aria-live="polite">{statusMessage}</p>
      {status === "error" ? (
        <div className={s.queryResult}>
          <p className={s.queryError}>문서를 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.</p>
        </div>
      ) : result ? <EvidenceResultPanel result={result} /> : null}
    </section>
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
      lead="투자 조건은 등록된 시나리오 조건에서 확인하고, 문서 질문은 해당 상품에 연결된 공개 문서 범위에서만 찾습니다. 확인 자료가 없으면 답을 만들지 않고 보류합니다."
    />
  );
}

export function CattleFilingEvidenceQuery({ productId }: { readonly productId: string }) {
  return (
    <EvidenceQuery
      scope={cattleFilingEvidenceScope(productId)}
      examples={CATTLE_FILING_EVIDENCE_EXAMPLES}
      lead="DART 공시와 축산물이력 외부 대조를 구분해 확인합니다. 현재는 이 상품에 연결된 공시 근거만 보여주며, 투자 판단이나 생성 답변을 만들지 않습니다."
    />
  );
}

export function PigFilingEvidenceQuery({ productId }: { readonly productId: string }) {
  return (
    <EvidenceQuery
      scope={pigFilingEvidenceScope(productId)}
      examples={PIG_FILING_EVIDENCE_EXAMPLES}
      lead="DART 공시의 상품 조건과 축산물이력 외부 대조를 구분해 확인합니다. 현재는 이 상품에 연결된 공시 근거만 보여주며, 투자 판단이나 생성 답변을 만들지 않습니다."
    />
  );
}
