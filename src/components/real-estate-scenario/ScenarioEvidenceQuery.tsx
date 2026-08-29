"use client";

import { useState, type FormEvent } from "react";

import s from "./scenario.module.css";

interface EvidenceHit {
  readonly chunkId: string;
  readonly title: string;
  readonly page: number;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly excerpt: string;
}

interface EvidenceResult {
  readonly outcome: "answer" | "evidence_only" | "abstain";
  readonly answer: string;
  readonly evidence: readonly EvidenceHit[];
  readonly limitations: readonly string[];
  readonly answerSource: "structured" | "approved_cache" | "live_llm" | "none";
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
  result: Pick<EvidenceResult, "outcome" | "answerSource" | "structuredSources">,
): string => {
  if (result.answerSource === "structured") {
    return result.structuredSources && result.structuredSources.length > 0
      ? "공식 공개정보에서 확인"
      : "시나리오 조건에서 확인";
  }
  if (result.answerSource === "approved_cache") return "상품 문서에서 확인";
  if (result.answerSource === "live_llm") return "상품 원문 인용으로 확인";
  return OUTCOME_LABEL[result.outcome];
};

export const ANSWER_SOURCE_LABEL: Readonly<Record<EvidenceResult["answerSource"], string>> = {
  structured: "등록 정보 또는 공식 공개정보",
  approved_cache: "상품 문서",
  live_llm: "연결된 상품 원문",
  none: "연결된 문서만 표시",
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

export type EvidenceQueryScope =
  | { readonly scenarioId: string; readonly offerId: string }
  | {
      readonly categoryId: "cattle" | "pig" | "art" | "real-estate";
      readonly productId: string;
      readonly dataNature: "observed" | "scenario";
      readonly namespace: "common";
    };

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
  readonly examples: readonly string[];
  readonly lead: string;
}) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<EvidenceResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const ask = async (value: string) => {
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
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  return (
    <section className={s.querySection} aria-labelledby="evidence-query-title">
      <p className={s.eyebrow}>상품 문서 질문</p>
      <h2 id="evidence-query-title" className={s.sectionTitle}>문서에서 확인할 내용을 물어보세요</h2>
      <p className={s.sectionLead}>{lead}</p>

      <div className={s.exampleRow} aria-label="예시 질문">
        {examples.map((example) => (
          <button key={example} type="button" className={s.exampleButton} onClick={() => void ask(example)}>
            {example}
          </button>
        ))}
      </div>

      <form className={s.queryForm} onSubmit={submit}>
        <label htmlFor="scenario-question" className="sr-only">상품 문서 질문</label>
        <input
          id="scenario-question"
          className={s.queryInput}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="예: 수수료와 회수 조건은 무엇인가요?"
          maxLength={200}
        />
        <button className={s.queryButton} type="submit" disabled={status === "loading" || !question.trim()}>
          {status === "loading" ? "문서 찾는 중" : "문서에서 찾기"}
        </button>
      </form>

      <div className={s.queryResult} aria-live="polite">
        {status === "error" ? (
          <p className={s.queryError}>문서를 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.</p>
        ) : result ? (
          <>
            <p className={s.resultOutcome}>{evidenceResultTitle(result)}</p>
            <p className={s.resultSource}>근거 유형 · {ANSWER_SOURCE_LABEL[result.answerSource]}</p>
            <p className={s.resultAnswer}>{result.answer}</p>
            {result.answerSource === "structured" ? (
              result.structuredSources && result.structuredSources.length > 0 ? (
                <StructuredSourceList sources={result.structuredSources} />
              ) : (
                <p className={s.resultSource}>확인 범위 · 시나리오 조건</p>
              )
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
            ) : null}
            {result.limitations.length > 0 ? (
              <ul className={s.limitList}>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
          </>
        ) : null}
      </div>
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
