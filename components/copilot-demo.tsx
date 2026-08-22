"use client";

import { FormEvent, useRef, useState } from "react";
import { ArrowIcon, EvidenceIcon, SparkIcon } from "@/components/icons";
import styles from "@/components/copilot.module.css";

type EvidenceLink = { id: string; title: string; url: string | null };
type Citation = { blockId: string; quote: string; title: string; evidence: EvidenceLink[] };
type Answer = {
  productId: string;
  productVersion: string;
  decisionStatus: "decided" | "not_assessed";
  answerBlocks: Array<{ text: string; citations: Citation[] }>;
};
type AskProductResponse = {
  answer: Answer;
  fallback: boolean;
  fallbackReason: string | null;
  mode: "demo" | "live";
  limitation: string;
};

const defaultQuestions = [
  "왜 판정을 보류했어?",
  "작가 거래량은 실제로 어느 정도야?",
  "취득가와 공모금액은 얼마야?",
  "이 플랫폼은 과거 청산을 제때 했어?",
  "가장 큰 위험요인 하나만 알려줘.",
  "확인된 긍정 근거도 있어?",
];

/**
 * `quickQuestions` and `response` remain optional so older non-product asset
 * pages can render their card. They intentionally do not create a sample answer.
 */
type CopilotDemoProps = {
  productId?: string;
  quickQuestions?: string[];
  response?: string;
};

function isSafeSourceUrl(url: string | null): url is string {
  if (!url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isEvidenceLink(value: unknown): value is EvidenceLink {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<EvidenceLink>;
  return typeof item.id === "string" && typeof item.title === "string" && (typeof item.url === "string" || item.url === null);
}

function isCitation(value: unknown): value is Citation {
  if (!value || typeof value !== "object") return false;
  const citation = value as Partial<Citation>;
  return typeof citation.blockId === "string" && typeof citation.quote === "string" && typeof citation.title === "string"
    && Array.isArray(citation.evidence) && citation.evidence.every(isEvidenceLink);
}

function isAskProductResponse(value: unknown): value is AskProductResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<AskProductResponse>;
  const answer = body.answer;
  if (!answer || typeof answer !== "object" || typeof answer.productId !== "string" || typeof answer.productVersion !== "string"
    || (answer.decisionStatus !== "decided" && answer.decisionStatus !== "not_assessed") || !Array.isArray(answer.answerBlocks)) return false;
  return typeof body.fallback === "boolean" && (body.mode === "demo" || body.mode === "live") && typeof body.limitation === "string"
    && (typeof body.fallbackReason === "string" || body.fallbackReason === null)
    && answer.answerBlocks.every((block) => Boolean(block) && typeof block.text === "string" && Array.isArray(block.citations) && block.citations.every(isCitation));
}

function responseStatus(response: AskProductResponse) {
  const mode = response.mode === "live" ? "LIVE" : "DEMO";
  const decision = response.answer.decisionStatus === "not_assessed" ? "판정 보류" : "판정 완료";
  if (response.fallback) return `${mode} · 저장 fact fallback · ${decision}`;
  return `${mode} · 검증된 AI 답변 · ${decision}`;
}

export function CopilotDemo({ productId, quickQuestions = defaultQuestions }: CopilotDemoProps) {
  const questions = quickQuestions.length ? quickQuestions : defaultQuestions;
  const [question, setQuestion] = useState(questions[0] ?? "");
  const [answer, setAnswer] = useState<AskProductResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasQuestion = question.trim().length > 0;

  function chooseQuestion(nextQuestion: string) {
    setQuestion(nextQuestion);
    inputRef.current?.focus();
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasQuestion || loading) return;
    if (!productId) {
      setError("이 데모 화면은 실제 상품과 연결되지 않았습니다.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/ask-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, question: question.trim() }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !isAskProductResponse(body)) throw new Error("invalid response");
      setAnswer(body);
    } catch {
      setError("AI 답변을 불러오지 못했습니다. 저장된 최신 분석은 위에서 계속 확인할 수 있습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="evidence-copilot" className={styles.card} aria-labelledby="copilot-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><SparkIcon /></span>
        <div>
          <p className={styles.label}>Evidence Copilot</p>
          <h2 id="copilot-title">근거부터 확인해 보세요</h2>
        </div>
        <span className={styles.status} aria-live="polite">
          {loading ? "근거 확인 중…" : answer ? responseStatus(answer) : productId ? "연결 대기" : "DEMO"}
        </span>
      </div>

      <div className={styles.questions} aria-label="추천질문">
        <span className={styles.questionsLabel}>추천질문</span>
        {questions.map((item) => (
          <button key={item} type="button" onClick={() => chooseQuestion(item)}>{item}</button>
        ))}
      </div>

      <form className={styles.form} onSubmit={submitQuestion}>
        <label className="sr-only" htmlFor="copilot-question">Copilot 질문</label>
        <input
          ref={inputRef}
          id="copilot-question"
          maxLength={1000}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="공시와 외부 근거에 대해 질문하세요"
          aria-describedby="copilot-question-limit"
        />
        <span id="copilot-question-limit" className={styles.characterCount}>{question.length}/1000자 제한</span>
        <button type="submit" aria-label="질문 보내기" disabled={loading || !hasQuestion}>
          <ArrowIcon />
        </button>
      </form>

      {error ? <p role="alert" className={styles.error}>{error}</p> : null}

      <div className={styles.answerBox} aria-live="polite" aria-busy={loading}>
        <div className={styles.answerSource}><EvidenceIcon /> {answer ? responseStatus(answer) : "근거 연결형 응답"}</div>
        {answer ? (
          answer.answer.answerBlocks.length ? answer.answer.answerBlocks.map((block, index) => (
            <article className={styles.answerBlock} key={`${block.text}-${index}`}>
              <p>{block.text}</p>
              {block.citations.map((citation) => (
                <div className={styles.citation} key={`${citation.blockId}-${citation.quote}`}>
                  <blockquote>{citation.quote}</blockquote>
                  <span>{citation.title}</span>
                  {citation.evidence.map((item) => isSafeSourceUrl(item.url) ? (
                    <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a>
                  ) : <small key={item.id}>{item.title}</small>)}
                </div>
              ))}
            </article>
          )) : <p>이 질문에 답할 검증된 상품 fact가 없습니다.</p>
        ) : <p>질문을 보내면 저장된 상품 fact와 출처를 함께 표시합니다.</p>}
        <small>{answer?.limitation ?? "검증된 저장 fact만 사용하며, 근거가 없는 내용은 답변하지 않습니다."}</small>
      </div>
    </section>
  );
}
