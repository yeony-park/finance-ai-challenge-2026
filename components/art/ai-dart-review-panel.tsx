"use client";

import { useState } from "react";

type ReviewResult = {
  mode: "live" | "demo";
  reviewStatus: "candidate_only";
  published: false;
  fallback: boolean;
  fallbackReasons: string[];
  documents: Array<{ receiptNo: string; sourceUrl: string; memberPath: string; documentSha256: string; memberSha256: string; encoding: string; chunkCount: number; declaredRole: string; lineageReviewStatus: string }>;
  candidates: Array<{ field: string; value: string; citations: Array<{ receiptNo: string; memberPath: string; quote: string }> }>;
  riskAssessment: { decisionStatus: "decided" | "not_assessed"; verdict: "worth_considering" | "conditional" | "caution" | "danger" | null; blockers: Array<{ code: string; message: string }>; signals: Array<{ id: string; severity: string; message: string }> };
  narrative: null | { corrections: Array<{ text: string }>; risks: Array<{ text: string }> };
  manifest: Array<{ receiptNo: string; declaredRole: string; sourceLabel: string; lineageReviewStatus: string; allowAutomaticPublication: false }>;
  limitations: string[];
};

const fieldLabels: Record<string, string> = {
  "offering.totalOfferingAmount": "총 공모금액",
  "offering.acquisitionPrice": "작품 취득가",
  "offering.unitPrice": "구좌가격",
  "offering.numberOfUnits": "구좌 수",
  "offering.subscriptionStart": "청약 시작일",
  "offering.subscriptionEnd": "청약 종료일",
  "offering.targetHoldingMonths": "목표 보유기간",
  "offering.disclosedCosts": "공개 비용",
  "artwork.title": "작품명",
  "artwork.productionYear": "제작연도",
  "artwork.medium": "재료",
  "artwork.width": "작품 너비",
  "artwork.height": "작품 높이",
};
const verdictLabels = { worth_considering: "해볼 만함", conditional: "조건부 해볼 만함", caution: "주의", danger: "위험" } as const;
const fallbackLabels: Record<string, string> = { demo_mode: "AI demo 모드", dart_artifact_unavailable: "DART XML artifact 확인 불가", ai_unavailable: "AI 서버 설정 없음", ai_candidate_rejected: "AI 필드 후보 검증 실패", ai_narrative_rejected: "AI 설명 검증 실패" };

export function AiDartReviewPanel({ productId }: { productId: string }) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function analyze() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/ai/analyze-product", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "request failed");
      setResult(body as ReviewResult);
    } catch {
      setError("AI 공시 검토를 완료하지 못했습니다. 저장된 상품 정보와 OpenDART 수신 상태는 계속 확인할 수 있습니다.");
    } finally { setLoading(false); }
  }
  const decision = result?.riskAssessment.decisionStatus === "not_assessed" ? "판정 보류" : result?.riskAssessment.verdict ? verdictLabels[result.riskAssessment.verdict] : "미평가";
  return <section className="content-section ai-dart-review" aria-label="AI OpenDART 공시 실사">
    <div className="ai-dart-review-heading"><div><p className="section-kicker">AI DISCLOSURE REVIEW</p><h2>AI 공시 실사 코파일럿</h2><p>AI가 DART XML에서 필드 후보를 찾고, 애플리케이션이 근거 ID와 위험 규칙을 다시 검증합니다.</p></div><button type="button" className="button button-primary" onClick={analyze} disabled={loading}>{loading ? "공시 읽는 중…" : result ? "다시 검토" : "AI로 공시 읽기"}</button></div>
    <p className="ai-candidate-warning"><strong>검증 후보 전용</strong> AI 추출값은 현재 상품 사실과 판정에 자동 반영되지 않습니다.</p>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {result ? <div className="ai-dart-result" aria-live="polite">
      <div className="ai-review-summary"><span>{result.mode === "live" ? "LIVE AI" : "DEMO FALLBACK"}</span><strong>{decision}</strong><small>{result.published ? "게시됨" : "미게시 후보"}</small></div>
      {result.fallbackReasons.length ? <p className="ai-fallback-note">제한 상태: {result.fallbackReasons.map((item) => fallbackLabels[item] ?? item).join(" · ")}</p> : null}
      <div className="ai-review-grid">
        <section><h3>연결 문서</h3>{result.documents.length ? <ul>{result.documents.map((document) => <li key={`${document.receiptNo}-${document.memberPath}`}><a href={document.sourceUrl} target="_blank" rel="noreferrer">{document.receiptNo}</a><span>{document.declaredRole} · {document.memberPath}</span><small>SHA-256 {document.memberSha256.slice(0, 16)}… · {document.encoding}</small></li>)}</ul> : <p>AI가 읽을 수 있는 검증된 XML artifact가 없습니다.</p>}</section>
        <section><h3>판정 제한</h3>{result.riskAssessment.blockers.length ? <ul>{result.riskAssessment.blockers.slice(0, 6).map((item, index) => <li key={`${item.code}-${index}`}>{item.message}</li>)}</ul> : <p>현재 규칙에서 확인된 blocker가 없습니다.</p>}</section>
      </div>
      <section className="ai-candidate-list"><h3>AI 필드 후보</h3>{result.candidates.length ? result.candidates.map((candidate) => <article key={candidate.field}><div><strong>{fieldLabels[candidate.field] ?? candidate.field}</strong><span>{candidate.value}</span></div>{candidate.citations.map((citation, index) => <blockquote key={`${citation.receiptNo}-${index}`}>{citation.quote}<cite>{citation.receiptNo} · {citation.memberPath}</cite></blockquote>)}</article>) : <p>검증을 통과한 AI 필드 후보가 없습니다. 값은 추정하지 않습니다.</p>}</section>
      {result.narrative && [...result.narrative.corrections, ...result.narrative.risks].length ? <section className="ai-grounded-narrative"><h3>근거 기반 AI 설명</h3>{[...result.narrative.corrections, ...result.narrative.risks].map((item, index) => <p key={index}>{item.text}</p>)}</section> : null}
      <ul className="ai-review-limitations">{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
    </div> : null}
  </section>;
}
