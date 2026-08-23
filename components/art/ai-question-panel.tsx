"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./ai-question-panel.module.css";

type GroundingContext = { productVersion: string; factBlockIds: string[] };
type Evidence = { id: string; title: string; url: string | null; publisher: string | null; asOfDate: string | null; collectedAt: string | null };
type Citation = { blockId: string; quote: string; title: string; evidence: Evidence[] };
type Answer = { productId: string; productVersion: string; decisionStatus: "decided" | "not_assessed"; answerBlocks: Array<{ text: string; citations: Citation[] }> };
type Turn = { question: string; answer: Answer; fallback: boolean; fallbackReason: string | null };
type StoredConversation = { turns: Turn[]; groundingContext: GroundingContext | null };

const examples = ["왜 판정을 보류했어?", "작가 거래량은 실제로 어느 정도야?", "취득가와 공모금액은 얼마야?", "이 플랫폼은 과거 청산을 제때 했어?", "가장 큰 위험요인 하나만 알려줘.", "확인된 긍정 근거도 있어?"];
const maxTurns = 8;
const maxStoredBytes = 30_000;
const maxTextLength = 2_000;
const maxQuoteLength = 1_500;
const maxEvidencePerCitation = 6;
const storageKey = (productId: string) => `jeomjeom:product-copilot:${productId}`;

function boundedString(value: unknown, limit: number) {
  return typeof value === "string" && value.length <= limit ? value : null;
}
function safeUrl(value: unknown) {
  const url = boundedString(value, 2_000);
  if (!url || /[\u0000-\u001F\u007F]/.test(url)) return null;
  try {
    if (url.startsWith("/") && !url.startsWith("//")) {
      const base = "https://jeomjeom.invalid";
      const parsed = new URL(url, base);
      return parsed.origin === base ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
    }
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password ? parsed.href : null;
  } catch { return null; }
}
function parseGroundingContext(value: unknown): GroundingContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const productVersion = boundedString(raw.productVersion, 96);
  if (!productVersion || !Array.isArray(raw.factBlockIds) || raw.factBlockIds.length > 12) return null;
  const factBlockIds = raw.factBlockIds.map((id) => boundedString(id, 128));
  const validId = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
  if (factBlockIds.some((id) => !id || !validId.test(id)) || new Set(factBlockIds).size !== factBlockIds.length) return null;
  return { productVersion, factBlockIds: factBlockIds as string[] };
}
function parseAnswer(value: unknown, expectedProductId: string): Answer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const productId = boundedString(raw.productId, 128);
  const productVersion = boundedString(raw.productVersion, 96);
  if (productId !== expectedProductId || !productVersion || (raw.decisionStatus !== "decided" && raw.decisionStatus !== "not_assessed") || !Array.isArray(raw.answerBlocks) || raw.answerBlocks.length > 12) return null;
  const answerBlocks = raw.answerBlocks.map((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return null;
    const item = block as Record<string, unknown>;
    const text = boundedString(item.text, maxTextLength);
    if (!text || !Array.isArray(item.citations) || item.citations.length > 12) return null;
    const citations = item.citations.map((citation) => {
      if (!citation || typeof citation !== "object" || Array.isArray(citation)) return null;
      const source = citation as Record<string, unknown>;
      const blockId = boundedString(source.blockId, 256);
      const quote = boundedString(source.quote, maxQuoteLength);
      const title = boundedString(source.title, 500);
      if (!blockId || !quote || !title || !Array.isArray(source.evidence)) return null;
      const evidence = source.evidence.slice(0, maxEvidencePerCitation).map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const rawEvidence = item as Record<string, unknown>;
        const id = boundedString(rawEvidence.id, 256);
        const evidenceTitle = boundedString(rawEvidence.title, 500);
        if (!id || !evidenceTitle) return null;
        return {
          id, title: evidenceTitle, url: safeUrl(rawEvidence.url),
          publisher: boundedString(rawEvidence.publisher, 300),
          asOfDate: boundedString(rawEvidence.asOfDate, 64),
          collectedAt: boundedString(rawEvidence.collectedAt, 64),
        };
      });
      return evidence.some((item) => item === null) ? null : { blockId, quote, title, evidence: evidence as Evidence[] };
    });
    return citations.some((citation) => citation === null) ? null : { text, citations: citations as Citation[] };
  });
  return answerBlocks.some((block) => block === null) ? null : { productId, productVersion, decisionStatus: raw.decisionStatus, answerBlocks: answerBlocks as Answer["answerBlocks"] };
}
function parseStored(value: unknown, productId: string): StoredConversation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.turns) || raw.turns.length > maxTurns) return null;
  const turns = raw.turns.map((turn) => {
    if (!turn || typeof turn !== "object" || Array.isArray(turn)) return null;
    const entry = turn as Record<string, unknown>;
    const question = boundedString(entry.question, 1_000);
    const answer = parseAnswer(entry.answer, productId);
    return question && answer && typeof entry.fallback === "boolean" && (entry.fallbackReason === null || boundedString(entry.fallbackReason, 256)) ? { question, answer, fallback: entry.fallback, fallbackReason: typeof entry.fallbackReason === "string" ? entry.fallbackReason : null } : null;
  });
  const groundingContext = raw.groundingContext === null ? null : parseGroundingContext(raw.groundingContext);
  return turns.some((turn) => turn === null) || (raw.groundingContext !== null && !groundingContext) ? null : { turns: turns as Turn[], groundingContext };
}
function statusLabel(answer: Answer, fallback: boolean) {
  return `${fallback ? "저장 fact fallback" : "검증된 AI 답변"} · ${answer.decisionStatus === "not_assessed" ? "판정 보류" : "판정 완료"}`;
}

function Conversation({ productId }: { productId: string }) {
  const [question, setQuestion] = useState(examples[0]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [groundingContext, setGroundingContext] = useState<GroundingContext | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // Defer the browser-only restore so the server render stays deterministic.
    const restore = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(storageKey(productId));
        const parsed = raw && raw.length <= maxStoredBytes ? parseStored(JSON.parse(raw), productId) : null;
        if (parsed) { setTurns(parsed.turns); setGroundingContext(parsed.groundingContext); }
        else if (raw) window.sessionStorage.removeItem(storageKey(productId));
      } catch { window.sessionStorage.removeItem(storageKey(productId)); }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, [productId]);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (!turns.length && groundingContext === null) {
        window.sessionStorage.removeItem(storageKey(productId));
        return;
      }
      const value: StoredConversation = { turns: turns.slice(-maxTurns), groundingContext };
      const serialized = JSON.stringify(value);
      if (serialized.length <= maxStoredBytes) window.sessionStorage.setItem(storageKey(productId), serialized);
      else window.sessionStorage.removeItem(storageKey(productId));
    } catch { /* Storage can be unavailable or full; the active conversation still works. */ }
  }, [groundingContext, loaded, productId, turns]);

  function resetConversation(message = "대화를 초기화했습니다. 다음 질문은 현재 상품의 새 근거부터 확인합니다.") {
    setTurns([]); setGroundingContext(null); setError(""); setNotice(message);
    try { window.sessionStorage.removeItem(storageKey(productId)); } catch { /* no-op */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentQuestion = question.trim();
    if (!currentQuestion || loading) return;
    setLoading(true); setError(""); setNotice("");
    try {
      const payload: { productId: string; question: string; groundingContext?: GroundingContext } = { productId, question: currentQuestion };
      if (groundingContext) payload.groundingContext = groundingContext;
      const response = await fetch("/api/ai/ask-product", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body: unknown = await response.json().catch(() => null);
      const code = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).code : null;
      if (response.status === 409 && (code === "stale_grounding_context" || code === "resetRequired")) {
        resetConversation("근거 기준이 변경되어 이전 대화를 안전하게 초기화했습니다. 질문을 다시 보내면 현재 상품 근거만 사용합니다.");
        return;
      }
      if (!response.ok || !body || typeof body !== "object" || Array.isArray(body)) throw new Error("request failed");
      const raw = body as Record<string, unknown>;
      const answer = parseAnswer(raw.answer, productId);
      if (!answer) throw new Error("invalid response");
      const nextContext = raw.groundingContext === undefined ? groundingContext : parseGroundingContext(raw.groundingContext);
      if (raw.groundingContext !== undefined && (!nextContext || nextContext.productVersion !== answer.productVersion)) throw new Error("invalid context");
      setTurns((previous) => [...previous, { question: currentQuestion, answer, fallback: raw.fallback === true, fallbackReason: boundedString(raw.fallbackReason, 256) }].slice(-maxTurns));
      setGroundingContext(nextContext);
      setQuestion("");
    } catch {
      setError("AI 답변을 불러오지 못했습니다. 저장된 최신 분석은 위에서 계속 확인할 수 있습니다.");
    } finally { setLoading(false); }
  }

  return <section className={`${styles.panel} ai-question-panel`} aria-labelledby="product-copilot-title">
    <div className={styles.heading}><p className="section-kicker">GROUNDED PRODUCT Q&A</p><h2 id="product-copilot-title">AI에게 근거 질문하기</h2><p>상품별 허용 fact block만 사용합니다. 이전 AI 답변 문장이나 이전 질문 내용은 후속 요청에 다시 보내지 않습니다.</p></div>
    <div className={styles.controls}><p className={styles.contextStatus} role="status">{groundingContext ? `현재 근거 연결됨 · fact block ${groundingContext.factBlockIds.length}개` : "연결된 이전 근거 없음 · 다음 질문에서 현재 상품 근거를 새로 확인합니다."}</p><button type="button" className="button button-secondary" onClick={() => resetConversation()}>대화 초기화</button></div>
    <div className={`${styles.chips} question-examples`} aria-label="추천 후속 질문">{examples.map((item) => <button type="button" key={item} onClick={() => setQuestion(item)} disabled={loading}>{item}</button>)}</div>
    <form className={styles.form} onSubmit={submit}><label htmlFor={`product-question-${productId}`}>상품에 대해 물어보기</label><div><input id={`product-question-${productId}`} maxLength={1000} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 이 판단을 보류한 근거는 무엇인가요?" disabled={loading} /><button className="button button-primary" disabled={loading || !question.trim()}>{loading ? "근거 확인 중…" : "질문하기"}</button></div></form>
    {error ? <p role="alert" className="form-error">{error}</p> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    <div className={styles.conversation} aria-live="polite" aria-busy={loading}>
      {!turns.length && !loading ? <p className={styles.empty}>아직 답변이 없습니다. 질문을 보내면 인용 가능한 현재 상품 fact block만 답변에 표시합니다.</p> : null}
      {turns.map((turn, turnIndex) => <article className={styles.turn} key={`${turn.question}-${turnIndex}`}>
        <div className={styles.question}><h3>내 질문</h3><p>{turn.question}</p></div>
        <div className={styles.answer}><p className={styles.answerStatus}>{statusLabel(turn.answer, turn.fallback)}</p>
          {turn.fallbackReason ? <p className={styles.fallback}>제한 상태: {turn.fallbackReason}</p> : null}
          {turn.answer.answerBlocks.length ? turn.answer.answerBlocks.map((block, blockIndex) => <section key={`${block.text}-${blockIndex}`} className={styles.answerBlock}><p>{block.text}</p>{block.citations.map((citation, citationIndex) => <div className={styles.citation} key={`${citation.blockId}-${citationIndex}`}><p><strong>Fact block ID</strong> {citation.blockId}</p><p><strong>제목</strong> {citation.title}</p><blockquote>{citation.quote}</blockquote>{citation.evidence.length ? <ul>{citation.evidence.map((evidence) => <li key={evidence.id}><strong>{evidence.publisher ?? "발행처 미기재"}</strong>{" · "}{evidence.url ? <a href={evidence.url} target="_blank" rel="noopener noreferrer">{evidence.title} ↗</a> : evidence.title}<small>기준일: {evidence.asOfDate ?? "미기재"} · 수집일: {evidence.collectedAt ?? "미기재"}</small></li>)}</ul> : <p className={styles.noEvidence}>연결된 원문 출처가 없습니다.</p>}</div>)}</section>) : <p className={styles.emptyGrounding}>이 질문에 답할 검증된 상품 fact가 없습니다. 판단이나 추정을 대신 만들지 않습니다.</p>}
        </div>
      </article>)}
    </div>
  </section>;
}

export function AiQuestionPanel({ productId }: { productId: string }) {
  return <Conversation key={productId} productId={productId} />;
}
