"use client";

import { FormEvent, useState } from "react";

type Citation = { blockId: string; quote: string; title: string; evidence: Array<{ id: string; title: string; url: string | null }> };
type Answer = { productId: string; productVersion: string; decisionStatus: "decided" | "not_assessed"; answerBlocks: Array<{ text: string; citations: Citation[] }> };
const examples = ["왜 판정을 보류했어?", "작가 거래량은 실제로 어느 정도야?", "취득가와 공모금액은 얼마야?", "이 플랫폼은 과거 청산을 제때 했어?", "가장 큰 위험요인 하나만 알려줘.", "확인된 긍정 근거도 있어?"];

export function AiQuestionPanel({ productId }: { productId: string }) {
  const [q, setQ] = useState(examples[0]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!q.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/ai/ask-product", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId, question: q }) });
      const body = await response.json();
      if (!response.ok) throw new Error();
      setAnswer(body.answer); setFallback(Boolean(body.fallback));
    } catch {
      setError("AI 답변을 불러오지 못했습니다. 저장된 최신 분석은 위에서 계속 확인할 수 있습니다.");
    } finally { setLoading(false); }
  }
  return <section className="ai-question-panel"><div><p className="section-kicker">GROUNDED PRODUCT Q&A</p><h2>AI에게 근거 질문하기</h2><p>상품별로 허용된 fact block만 사용합니다. 답변의 숫자와 인용이 근거와 다르면 전체 응답을 폐기합니다.</p></div>
    <div className="question-examples">{examples.map((item) => <button type="button" key={item} onClick={() => setQ(item)}>{item}</button>)}</div>
    <form onSubmit={submit}><label className="sr-only" htmlFor="product-question">상품 질문</label><input id="product-question" maxLength={1000} value={q} onChange={(event) => setQ(event.target.value)}/><button className="button button-primary" disabled={loading}>{loading ? "근거 확인 중…" : "질문하기"}</button></form>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    {answer ? <div className="ai-answer" aria-live="polite"><p className="ai-answer-status">{fallback ? "저장 fact fallback" : "검증된 AI 답변"} · {answer.decisionStatus === "not_assessed" ? "판정 보류" : "판정 완료"}</p>{answer.answerBlocks.length ? answer.answerBlocks.map((block, index) => <article key={index}><strong>{block.text}</strong>{block.citations.map((citation) => <div className="ai-answer-citation" key={`${citation.blockId}-${citation.quote}`}><blockquote>{citation.quote}</blockquote><span>{citation.title}</span>{citation.evidence.map((item) => item.url ? <a key={item.id} href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a> : <small key={item.id}>{item.title}</small>)}</div>)}</article>) : <p>이 질문에 답할 검증된 상품 fact가 없습니다.</p>}</div> : null}
  </section>;
}
