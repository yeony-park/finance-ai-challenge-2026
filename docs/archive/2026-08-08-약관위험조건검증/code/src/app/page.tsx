"use client";

import { useEffect, useMemo, useState } from "react";
import { LEGAL_DISCLAIMER } from "@/lib/spine/constants";

interface Citation {
  sourceId: string;
  title: string;
  url: string;
  quote?: string;
}

interface EvidenceCard {
  kind: "standard_deviation" | "legal_type" | "precedent_seed";
  summary: string;
  citation: Citation;
}

type RiskGrade = "참고" | "주의" | "경고";

interface ClauseFinding {
  clauseId: string;
  heading: string;
  snippet: string;
  highlight: string | null;
  standardExcerpt: string | null;
  standardHeading: string | null;
  grade: RiskGrade;
  evidence: EvidenceCard[];
  explanation: string;
}

interface ExtractedField {
  kind: string;
  summary: string;
  clauseId: string;
}

interface AnalysisReport {
  productId: string;
  insurer: string;
  productName: string;
  category: string;
  sourceUrl: string;
  effectiveDate: string;
  standardRefTitle: string;
  totalClauses: number;
  unparsedClauses: number;
  clausesWithoutBaseline: number;
  fields: ExtractedField[];
  findings: ClauseFinding[];
  plainSummary: string | null;
  disclaimer: string;
}

interface ProductOption {
  productId: string;
  insurer: string;
  category: string;
  productName: string;
  demo: boolean;
}

/** 등급 3중 코딩: 색상 + 문자 라벨 + 명도 (디자인-방향.md — 색각 접근성) */
const GRADE_BADGE: Record<RiskGrade, string> = {
  경고: "bg-danger text-white",
  주의: "bg-caution-soft text-caution border border-caution",
  참고: "bg-paper text-ink-soft border border-line",
};

const GRADE_COUNT_CHIP: Record<RiskGrade, string> = {
  경고: "bg-danger-soft text-danger",
  주의: "bg-caution-soft text-caution",
  참고: "bg-paper text-ink-soft border border-line",
};

const EVIDENCE_LABEL: Record<EvidenceCard["kind"], string> = {
  standard_deviation: "표준약관 편차",
  legal_type: "법 유형 근거",
  precedent_seed: "심결례 연결",
};

const GRADES: readonly RiskGrade[] = ["경고", "주의", "참고"];

const renderSnippet = (snippet: string, highlight: string | null) => {
  if (!highlight) return snippet;
  const at = snippet.indexOf(highlight);
  if (at < 0) return snippet;
  return (
    <>
      {snippet.slice(0, at)}
      <mark className="rounded-xs bg-hl px-0.5">{highlight}</mark>
      {snippet.slice(at + highlight.length)}
    </>
  );
};

export default function Home() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [insurer, setInsurer] = useState("");
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llmMode, setLlmMode] = useState("확인 중…");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analyze", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setError("상품 목록을 불러오지 못했습니다."));
    fetch("/api/health", { signal: controller.signal })
      .then((r) => r.json())
      .then((h) => setLlmMode(h.checks?.llmMode ?? "unknown"))
      .catch(() => setLlmMode("unknown"));
    return () => controller.abort();
  }, []);

  const insurers = useMemo(
    () => [...new Set(products.map((p) => p.insurer))],
    [products],
  );
  const categories = useMemo(
    () => [
      ...new Set(
        products.filter((p) => p.insurer === insurer).map((p) => p.category),
      ),
    ],
    [products, insurer],
  );
  const candidates = useMemo(
    () => products.filter((p) => p.insurer === insurer && p.category === category),
    [products, insurer, category],
  );

  const gradeCounts = useMemo(() => {
    const counts: Record<RiskGrade, number> = { 경고: 0, 주의: 0, 참고: 0 };
    for (const finding of report?.findings ?? []) counts[finding.grade] += 1;
    return counts;
  }, [report]);

  const cleanClauses = report
    ? report.totalClauses - report.findings.length
    : 0;

  const analyze = async () => {
    if (!productId || isLoading) return;
    setIsLoading(true);
    setReport(null);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "분석에 실패했습니다.");
      } else {
        setReport(data.report);
      }
    } catch {
      setError("요청에 실패했습니다. 서버 상태를 확인해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-16 pt-10">
      {/* 상단 스트립 — 검토서 topbar 문법 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3 font-mono text-xs text-ink-soft">
        <span>
          금융문서 위험조건 검증 · <strong className="font-medium text-ink">2026 금융 AI Challenge</strong>
        </span>
        <span>
          LLM <span className="text-ink">{llmMode}</span>
          {llmMode === "fake" && " (모의 모드 · 키 불필요)"}
        </span>
      </div>

      <header className="mb-8 pt-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-danger">
          약관 스캔 — 근거 기반 가능성 표시
        </p>
        <h1 className="font-serif text-3xl font-bold leading-snug">
          약관을 읽지 않아도,
          <br />
          불리 가능 조항은 놓치지 않게.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
          조항 전수 스캔 → 표준약관(별표15) 편차 → 약관규제법 유형 근거 → 단계형
          등급. 모든 판정에는 출처와 원문이 연결됩니다.
        </p>
      </header>

      {/* 상품 선택 */}
      <section className="rounded-lg border border-line bg-card p-5 shadow-sm">
        <p className="mb-3 font-mono text-[11px] tracking-wide text-ink-soft">
          ① 보험사 → ② 상품군 → ③ 상품 — 업로드 없이 3번의 선택으로 분석
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={insurer}
            onChange={(e) => {
              setInsurer(e.target.value);
              setCategory("");
              setProductId("");
            }}
            className="rounded-md border border-line bg-card p-2 text-sm"
          >
            <option value="">① 보험사</option>
            {insurers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setProductId("");
            }}
            disabled={!insurer}
            className="rounded-md border border-line bg-card p-2 text-sm disabled:opacity-40"
          >
            <option value="">② 상품군</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={!category}
            className="rounded-md border border-line bg-card p-2 text-sm disabled:opacity-40"
          >
            <option value="">③ 상품</option>
            {candidates.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.productName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={analyze}
            disabled={!productId || isLoading}
            className="rounded-md bg-ink px-5 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {isLoading ? "분석 중…" : "약관 분석"}
          </button>
        </div>
        {products.some((p) => p.demo) && (
          <p className="mt-3 font-mono text-[11px] text-caution">
            ⚠ 현재 코퍼스는 시연용 가상 약관입니다 — 실제 상품·보험사가 아닙니다.
          </p>
        )}
      </section>

      {error && (
        <p className="mt-4 rounded-md bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {report && (
        <section className="mt-8 space-y-5">
          {/* 종합 요약 스트립 — "종합 1 + 조항 N" 위계 */}
          <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl font-bold">
                {report.productName}
              </h2>
              <span className="font-mono text-[11px] text-ink-soft">
                {report.insurer} · 시행 {report.effectiveDate}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {GRADES.map((grade) => (
                <span
                  key={grade}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${GRADE_COUNT_CHIP[grade]}`}
                >
                  {grade} {gradeCounts[grade]}
                </span>
              ))}
              <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-semibold text-ok">
                이상 없음 {cleanClauses}
              </span>
            </div>

            <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-soft">
              조항 {report.totalClauses}개 스캔 · 미분할 {report.unparsedClauses} ·
              기준선 없음 {report.clausesWithoutBaseline} · 기준선:{" "}
              {report.standardRefTitle}
            </p>

            {report.plainSummary && (
              <div className="mt-4 rounded-md bg-paper p-4">
                <span className="mb-1 inline-block rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[10px] text-ink-soft">
                  AI 분석
                </span>
                <p className="text-sm leading-relaxed">{report.plainSummary}</p>
              </div>
            )}

            {/* 등급 범례 — 산정 기준을 화면에서 즉시 설명 */}
            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer font-mono text-[11px] text-ink-soft hover:text-ink">
                등급 산정 기준 보기
              </summary>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
                <li>
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${GRADE_BADGE.경고}`}>경고</span>
                  표준약관 불리 편차 <b className="text-ink">그리고</b> 약관규제법 유형 근거 — 독립 근거 2계열
                </li>
                <li>
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${GRADE_BADGE.주의}`}>주의</span>
                  두 계열 중 한 가지 근거만 확인된 경우
                </li>
                <li>
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${GRADE_BADGE.참고}`}>참고</span>
                  불리 단정 근거 없음 — 표현 차이 등 정보성 신호만 있는 경우
                </li>
                <li className="pt-1">근거가 없는 조항에는 어떤 경우에도 주의·경고를 표시하지 않습니다.</li>
              </ul>
            </details>
          </div>

          {report.findings.length === 0 && (
            <p className="rounded-lg border border-ok bg-ok-soft p-4 text-sm text-ok">
              표준약관 편차·법 유형 후보가 발견되지 않았습니다. (분석 범위 내)
            </p>
          )}

          {/* 조항 카드 — 좌: 세리프 원문 / 우: 판정·근거 주석 */}
          {report.findings.map((finding) => (
            <article
              key={finding.clauseId}
              className="overflow-hidden rounded-lg border border-line bg-card shadow-sm"
            >
              <div className="grid md:grid-cols-[1fr_260px]">
                <div className="border-b border-dashed border-line p-5 md:border-b-0 md:border-r">
                  <p className="mb-2 font-mono text-[11px] text-ink-soft">
                    {finding.clauseId.split("#")[1]} · 약관 원문
                  </p>
                  <h3 className="font-serif text-sm font-bold">
                    {finding.heading}
                  </h3>
                  <p className="mt-2 font-serif text-[15px] leading-[1.9] text-ink">
                    {renderSnippet(finding.snippet, finding.highlight)}…
                  </p>

                  {finding.standardExcerpt && (
                    <details className="mt-3">
                      <summary className="cursor-pointer font-mono text-[11px] text-ink-soft hover:text-ink">
                        표준약관 대비 보기 (신구조문대비)
                      </summary>
                      <div className="mt-2 grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
                        <div className="bg-paper p-3">
                          <p className="mb-1 font-mono text-[10px] text-ink-soft">
                            표준약관 — {finding.standardHeading}
                          </p>
                          <p className="font-serif text-xs leading-[1.8] text-ink-soft">
                            {finding.standardExcerpt}
                          </p>
                        </div>
                        <div className="bg-card p-3">
                          <p className="mb-1 font-mono text-[10px] text-ink-soft">
                            이 약관
                          </p>
                          <p className="font-serif text-xs leading-[1.8]">
                            {renderSnippet(finding.snippet, finding.highlight)}…
                          </p>
                        </div>
                      </div>
                    </details>
                  )}
                </div>

                <div className="flex flex-col gap-3 bg-[#FBFBF8] p-5">
                  <span
                    className={`self-start rounded px-2.5 py-1 text-xs font-bold ${GRADE_BADGE[finding.grade]}`}
                  >
                    {finding.grade}
                  </span>
                  <p className="text-[13px] leading-relaxed text-ink">
                    {finding.explanation}
                  </p>
                  <ul className="space-y-2 border-t border-line pt-3">
                    {finding.evidence.map((card, i) => (
                      <li
                        key={`${finding.clauseId}-ev-${i}`}
                        className="text-[11px] leading-relaxed"
                      >
                        <span className="mr-1 font-mono text-[10px] text-danger">
                          {EVIDENCE_LABEL[card.kind]}
                        </span>
                        <span className="text-ink-soft">{card.summary}</span>{" "}
                        <a
                          href={card.citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
                        >
                          {card.citation.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}

          {report.fields.length > 0 && (
            <div className="rounded-lg border border-line bg-card p-5 shadow-sm">
              <h3 className="font-serif text-sm font-bold">
                핵심 조건 추출 — 7필드 스키마
              </h3>
              <ul className="mt-3 divide-y divide-line/60">
                {report.fields.map((field, i) => (
                  <li key={`f-${i}`} className="flex gap-3 py-2 text-xs">
                    <span className="w-16 shrink-0 font-semibold text-ink">
                      {field.kind}
                    </span>
                    <span className="text-ink-soft">{field.summary}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-soft">
                      {field.clauseId.split("#")[1]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <footer className="mt-12 border-t border-line pt-4">
        <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
          {LEGAL_DISCLAIMER}
        </p>
      </footer>
    </main>
  );
}
