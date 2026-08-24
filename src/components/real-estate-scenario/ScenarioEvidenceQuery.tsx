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
}

const OUTCOME_LABEL: Readonly<Record<EvidenceResult["outcome"], string>> = {
  answer: "승인된 답변과 근거",
  evidence_only: "관련 근거만 확인됨",
  abstain: "근거 부족 · 답변 보류",
};

const EXAMPLES = [
  "최소투자금은 얼마인가요?",
  "운용기간과 매각조건은 무엇인가요?",
  "운영그룹의 과거이력은 무엇인가요?",
] as const;

const safeCitationUrl = (value: string): string | null => {
  if (/^\/scenario-documents\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.pdf$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

export function ScenarioEvidenceQuery({
  scenarioId,
  offerId,
}: {
  readonly scenarioId: string;
  readonly offerId: string;
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
        body: JSON.stringify({ scenarioId, offerId, q, limit: 5 }),
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
    <section className={s.querySection} aria-labelledby="scenario-query-title">
      <p className={s.eyebrow}>상품 범위 근거 질문</p>
      <h2 id="scenario-query-title" className={s.sectionTitle}>문서에서 확인할 내용을 물어보세요</h2>
      <p className={s.sectionLead}>
        이 상품에 연결된 공개 승인 문서 안에서만 찾습니다. 근거가 없으면 답을 만들지 않고 보류합니다.
      </p>

      <div className={s.exampleRow} aria-label="예시 질문">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" className={s.exampleButton} onClick={() => void ask(example)}>
            {example}
          </button>
        ))}
      </div>

      <form className={s.queryForm} onSubmit={submit}>
        <label htmlFor="scenario-question" className="sr-only">상품 근거 질문</label>
        <input
          id="scenario-question"
          className={s.queryInput}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="예: 수수료와 회수 조건은 무엇인가요?"
          maxLength={200}
        />
        <button className={s.queryButton} type="submit" disabled={status === "loading" || !question.trim()}>
          {status === "loading" ? "근거 찾는 중" : "근거 찾기"}
        </button>
      </form>

      <div className={s.queryResult} aria-live="polite">
        {status === "error" ? (
          <p className={s.queryError}>근거를 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.</p>
        ) : result ? (
          <>
            <p className={s.resultOutcome}>{OUTCOME_LABEL[result.outcome]}</p>
            <p className={s.resultAnswer}>{result.answer}</p>
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
