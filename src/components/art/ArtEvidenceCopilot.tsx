"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import s from "./ArtEvidenceCopilot.module.css";

interface CopilotProductOption {
  readonly id: string;
  readonly label: string;
}

interface EvidenceLink {
  readonly id: string;
  readonly title: string;
  readonly url: string | null;
}

interface Citation {
  readonly blockId: string;
  readonly quote: string;
  readonly title: string;
  readonly evidence: readonly EvidenceLink[];
}

interface AnswerBlock {
  readonly text: string;
  readonly citations: readonly Citation[];
}

interface AskProductResponse {
  readonly answer: {
    readonly productId: string;
    readonly productVersion: string;
    readonly decisionStatus: "decided" | "not_assessed";
    readonly answerBlocks: readonly AnswerBlock[];
  };
  readonly fallback: boolean;
  readonly fallbackReason: string | null;
  readonly mode: "demo" | "live";
  readonly limitation: string;
}

const QUICK_QUESTIONS = [
  "공모금액과 구성은 어떻게 확인했어?",
  "왜 이 근거 상태로 판정했어?",
  "현재 확인할 수 없는 정보는 뭐야?",
  "확인한 공시 원문과 기준일을 알려줘.",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEvidenceLink(value: unknown): value is EvidenceLink {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (typeof value.url === "string" || value.url === null)
  );
}

function isCitation(value: unknown): value is Citation {
  if (!isRecord(value)) return false;
  return (
    typeof value.blockId === "string" &&
    typeof value.quote === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidenceLink)
  );
}

function isAnswerBlock(value: unknown): value is AnswerBlock {
  if (!isRecord(value)) return false;
  return (
    typeof value.text === "string" &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation)
  );
}

function isAskProductResponse(value: unknown): value is AskProductResponse {
  if (!isRecord(value) || !isRecord(value.answer)) return false;
  const { answer } = value;
  return (
    typeof answer.productId === "string" &&
    typeof answer.productVersion === "string" &&
    (answer.decisionStatus === "decided" ||
      answer.decisionStatus === "not_assessed") &&
    Array.isArray(answer.answerBlocks) &&
    answer.answerBlocks.every(isAnswerBlock) &&
    typeof value.fallback === "boolean" &&
    (typeof value.fallbackReason === "string" ||
      value.fallbackReason === null) &&
    (value.mode === "demo" || value.mode === "live") &&
    typeof value.limitation === "string"
  );
}

export function isAllowedCitationUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "dart.fss.or.kr";
  } catch {
    return false;
  }
}

function responseStatus(response: AskProductResponse): string {
  const mode = response.mode === "live" ? "LIVE" : "DEMO";
  const source = response.fallback ? "저장 근거 응답" : "검증된 AI 응답";
  const decision =
    response.answer.decisionStatus === "decided" ? "판정 완료" : "판정 보류";
  return `${mode} · ${source} · ${decision}`;
}

interface ArtEvidenceCopilotProps {
  readonly products: readonly CopilotProductOption[];
  readonly selectedProductId?: string;
  readonly onSelectedProductIdChange?: (productId: string) => void;
}

export function ArtEvidenceCopilot({
  products,
  selectedProductId,
  onSelectedProductIdChange,
}: ArtEvidenceCopilotProps) {
  const [internalProductId, setInternalProductId] = useState(
    products[0]?.id ?? "",
  );
  const productId = selectedProductId ?? internalProductId;
  const [question, setQuestion] = useState<string>(QUICK_QUESTIONS[0]);
  const [answer, setAnswer] = useState<AskProductResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () => () => {
      const request = requestRef.current;
      requestRef.current = null;
      request?.abort();
    },
    [],
  );

  const chooseQuestion = (nextQuestion: string) => {
    setQuestion(nextQuestion);
    inputRef.current?.focus();
  };

  const changeProduct = (nextProductId: string) => {
    requestRef.current?.abort();
    if (onSelectedProductIdChange) {
      onSelectedProductIdChange(nextProductId);
    } else {
      setInternalProductId(nextProductId);
    }
    setAnswer(null);
    setError("");
    setLoading(false);
  };

  const submitQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuestion = question.trim();
    if (!productId || !normalizedQuestion || loading) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    const requestedProductId = productId;

    try {
      const response = await fetch("/api/ai/ask-product", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: requestedProductId,
          question: normalizedQuestion,
        }),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (
        !response.ok ||
        !isAskProductResponse(body) ||
        body.answer.productId !== requestedProductId
      ) {
        throw new Error("invalid response");
      }
      setAnswer(body);
    } catch (caught) {
      if ((caught as { name?: string }).name !== "AbortError") {
        setAnswer(null);
        setError(
          "답변을 불러오지 못했습니다. 위의 저장된 공시 근거는 계속 확인할 수 있습니다.",
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const hasQuestion = question.trim().length > 0;
  const status = loading
    ? "공시 근거 확인 중…"
    : answer
      ? responseStatus(answer)
      : productId
        ? "질문 대기"
        : "연결할 상품 없음";

  return (
    <section
      id="evidence-copilot"
      className={s.card}
      aria-labelledby="evidence-copilot-title"
    >
      <div className={s.heading}>
        <div>
          <p className={s.eyebrow}>Evidence Copilot</p>
          <h3 id="evidence-copilot-title">공시 근거에 질문하기</h3>
        </div>
        <span className={s.status} aria-live="polite">
          {status}
        </span>
      </div>

      <p className={s.lead}>
        선택한 상품의 저장된 사실과 DART 원문 범위 안에서만 답합니다. 근거가
        없으면 확인할 수 없다고 표시합니다.
      </p>

      <label className={s.selectLabel} htmlFor="copilot-product">
        질문할 상품
      </label>
      <select
        id="copilot-product"
        className={s.select}
        value={productId}
        disabled={products.length === 0 || loading}
        onChange={(event) => changeProduct(event.target.value)}
      >
        {products.length === 0 ? (
          <option value="">연결할 상품이 없습니다</option>
        ) : (
          products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.label}
            </option>
          ))
        )}
      </select>

      <div className={s.questions} aria-label="빠른 질문">
        <span>빠른 질문</span>
        {QUICK_QUESTIONS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={question === item}
            onClick={() => chooseQuestion(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <form className={s.form} onSubmit={submitQuestion}>
        <label className={s.questionLabel} htmlFor="copilot-question">
          질문
        </label>
        <textarea
          ref={inputRef}
          id="copilot-question"
          rows={3}
          maxLength={1000}
          value={question}
          placeholder="공시와 저장 근거에 대해 질문하세요"
          aria-describedby="copilot-question-limit"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className={s.formFooter}>
          <span id="copilot-question-limit">
            {question.length.toLocaleString("ko-KR")}/1,000자
          </span>
          <button
            type="submit"
            disabled={!productId || !hasQuestion || loading}
          >
            {loading ? "확인 중…" : "근거로 답변 받기"}
          </button>
        </div>
      </form>

      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={s.answer} aria-live="polite" aria-busy={loading}>
        <strong>{answer ? responseStatus(answer) : "근거 연결형 응답"}</strong>
        {answer ? (
          answer.answer.answerBlocks.length > 0 ? (
            answer.answer.answerBlocks.map((block, blockIndex) => (
              <article key={`${blockIndex}-${block.text}`} className={s.answerBlock}>
                <p>{block.text}</p>
                {block.citations.length > 0 ? (
                  <ul className={s.citations}>
                    {block.citations.map((citation, citationIndex) => (
                      <li key={`${citation.blockId}-${citationIndex}`}>
                        <blockquote>{citation.quote}</blockquote>
                        <b>{citation.title}</b>
                        {citation.evidence.length > 0 ? (
                          <span className={s.evidenceLinks}>
                            {citation.evidence.map((item) =>
                              isAllowedCitationUrl(item.url) ? (
                                <a
                                  key={item.id}
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {item.title} ↗
                                </a>
                              ) : (
                                <small key={item.id}>{item.title}</small>
                              ),
                            )}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))
          ) : (
            <p>이 질문에 답할 검증된 상품 사실이 없습니다.</p>
          )
        ) : (
          <p>질문을 보내면 답변과 연결된 공시 출처를 함께 표시합니다.</p>
        )}
        <small>
          {answer?.limitation ??
            "검증된 저장 사실만 사용하며, 투자 판단이나 수익 전망을 제공하지 않습니다."}
        </small>
      </div>
    </section>
  );
}
