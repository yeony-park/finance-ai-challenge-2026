/**
 * 약관 분석 파이프라인 조립:
 * 코퍼스 조회 → 조항 분할 → 필드 추출 → 표준 편차 → 법 유형 후보 → 등급 → 근거 카드 → 출력 필터.
 *
 * 가드레일 불변식 (후행 부착 금지):
 *  - 근거 0건이면 주의·경고 없음 (grading 규칙 + isGradeConsistent 검증)
 *  - 인용은 스파인 코퍼스 레지스트리 등록 문서만 (미등록 인용은 프로그래머 오류로 throw)
 *  - 사용자에게 나가는 모든 텍스트는 출력 필터를 통과한다
 *  - 심결례는 건수를 지어내지 않는다 — 검색 연결만 안내 (정직성 원칙)
 */
import { LEGAL_DISCLAIMER } from "../spine/constants";
import { filterOutput } from "../spine/guardrail/output-filter";
import { findDoc } from "../spine/rag/corpus";
import type { Citation, LlmClient } from "../spine/types";
import { normalizeHeading, splitClauses } from "./clause-splitter";
import { findProduct, findStandard } from "./corpus";
import type { DeviationResult } from "./deviation";
import { detectDeviations } from "./deviation";
import { extractFields } from "./field-extractor";
import { decideGrade, isGradeConsistent } from "./grading";
import type { LegalTypeHit } from "./legal-types";
import { matchLegalTypes } from "./legal-types";
import type {
  AnalysisReport,
  ClauseFinding,
  EvidenceCard,
  RiskGrade,
} from "./types";

const SNIPPET_LENGTH = 160;
const GRADE_ORDER: Record<RiskGrade, number> = { 경고: 0, 주의: 1, 참고: 2 };

const citationOf = (sourceId: string, quote?: string): Citation => {
  const doc = findDoc(sourceId);
  if (!doc) {
    // 출처 강제 원칙 — 미등록 출처 인용은 데이터 버그이므로 조용히 넘어가지 않는다
    throw new Error(`미등록 출처 인용 시도: ${sourceId}`);
  }
  return { sourceId, title: doc.title, url: doc.url, quote };
};

/** 핵심 근거(편차·법 유형)만 생성 — 자동 부착 카드(심결례 안내)는 불변식 검증 뒤에 붙인다 */
const buildCoreEvidence = (
  standardRef: string,
  deviations: readonly DeviationResult[],
  legalHits: readonly LegalTypeHit[],
): readonly EvidenceCard[] => {
  const cards: EvidenceCard[] = [];

  for (const deviation of deviations) {
    cards.push({
      kind: "standard_deviation",
      summary:
        deviation.direction === "불리"
          ? `표준약관 편차(불리 방향) — ${deviation.detail}`
          : `표준약관 표현 차이(불리 단정 아님) — ${deviation.detail}`,
      citation: citationOf(standardRef, deviation.standardHeading),
    });
  }

  for (const hit of legalHits) {
    cards.push({
      kind: "legal_type",
      summary: `약관규제법 ${hit.rule.article}(${hit.rule.label}) 유형 후보 — ${hit.rule.note}`,
      citation: citationOf("act-terms-regulation", hit.matched),
    });
  }

  return cards;
};

const precedentSeedCard = (): EvidenceCard => ({
  kind: "precedent_seed",
  summary:
    "해당 유형의 실제 심결례는 공정거래위원회 결정문 데이터베이스에서 확인할 수 있습니다. (본 서비스는 심결례 건수를 추정하지 않습니다)",
  citation: citationOf("ftc-decisions"),
});

const buildExplanation = (
  grade: RiskGrade,
  unfavorableCount: number,
  reviewCount: number,
  legalCount: number,
): string => {
  if (grade === "참고") {
    return reviewCount > 0
      ? "표준약관과 표현 차이가 있으나 불리 여부를 단정할 근거는 없습니다. 원문 대조를 권장합니다."
      : "정보성 조항입니다.";
  }
  return `표준약관 대비 불리 방향 편차 ${unfavorableCount}건, 약관규제법 유형 근거 ${legalCount}건이 확인되어 '${grade}' 등급으로 표시합니다. 이는 확정 판정이 아닌 근거 기반 가능성 표시입니다.`;
};

export interface AnalyzeDeps {
  /** 있으면 리포트 상단 쉬운 말 요약을 생성한다(출력 필터 통과분만) */
  readonly llm?: LlmClient;
}

export type AnalyzeResult = AnalysisReport | { readonly kind: "not_found" };

export const analyzeProduct = async (
  productId: string,
  deps: AnalyzeDeps = {},
): Promise<AnalyzeResult> => {
  const product = findProduct(productId);
  if (!product) return { kind: "not_found" };

  const standard = findStandard(product.standardRef);
  const clauses = splitClauses(product.productId, product.rawText);
  const parsedClauses = clauses.filter((c) => c.parsed);
  const fields = extractFields(clauses);

  const deviations = standard
    ? detectDeviations(clauses, standard.id, standard.rawText)
    : [];
  const deviationsByClause = new Map<string, DeviationResult[]>();
  for (const deviation of deviations) {
    const list = deviationsByClause.get(deviation.clauseId) ?? [];
    deviationsByClause.set(deviation.clauseId, [...list, deviation]);
  }

  const standardHeadings = new Set(
    standard
      ? splitClauses(standard.id, standard.rawText)
          .filter((c) => c.parsed)
          .map((c) => normalizeHeading(c.heading))
      : [],
  );
  const clausesWithoutBaseline = parsedClauses.filter(
    (c) => !standardHeadings.has(normalizeHeading(c.heading)),
  ).length;

  const findings: ClauseFinding[] = [];
  for (const clause of parsedClauses) {
    const clauseDeviations = deviationsByClause.get(clause.clauseId) ?? [];
    const legalHits = matchLegalTypes(clause);
    if (clauseDeviations.length === 0 && legalHits.length === 0) continue;

    const grade = decideGrade({ deviations: clauseDeviations, legalHits });
    const coreEvidence = buildCoreEvidence(
      product.standardRef,
      clauseDeviations,
      legalHits,
    );
    // 불변식 검증은 자동 부착 카드를 세기 전에 — 핵심 근거만으로 성립해야 한다
    if (!isGradeConsistent(grade, coreEvidence.length)) {
      throw new Error(`등급 불변식 위반: ${clause.clauseId} ${grade} 근거 0건`);
    }
    const evidence =
      grade === "참고" ? coreEvidence : [...coreEvidence, precedentSeedCard()];

    const unfavorable = clauseDeviations.filter((d) => d.direction === "불리");
    const explanationRaw = buildExplanation(
      grade,
      unfavorable.length,
      clauseDeviations.length - unfavorable.length,
      legalHits.length,
    );
    const filtered = filterOutput(explanationRaw);
    const primaryDeviation = unfavorable[0] ?? clauseDeviations[0];

    findings.push({
      clauseId: clause.clauseId,
      heading: clause.heading,
      snippet: clause.text.slice(0, SNIPPET_LENGTH),
      highlight: unfavorable[0]?.matchedText ?? null,
      standardExcerpt: primaryDeviation?.standardText ?? null,
      standardHeading: primaryDeviation?.standardHeading ?? null,
      grade,
      evidence,
      // 출력 필터 미통과 텍스트는 화면에 내보내지 않는다 (템플릿 회귀 방어)
      explanation: filtered.ok ? filtered.text : "설명 문구가 표현 원칙 검사를 통과하지 못해 표시하지 않습니다.",
    });
  }

  findings.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade]);

  let plainSummary: string | null = null;
  if (deps.llm && findings.some((f) => f.grade !== "참고")) {
    try {
      const draft = await deps.llm.complete({
        // JSON 계약은 LlmClient 어댑터 공통 요구사항 — 누락 시 live 모드에서 침묵 실패한다
        system:
          '너는 보험약관 분석 결과를 쉬운 말로 요약하는 보조 AI다. 단정 판정 표현("무효다", "독소조항이다" 등)은 금지한다. 반드시 JSON {"text": string, "sourceIds": string[]}로만 응답하고 sourceIds는 빈 배열로 두어라.',
        user: `[쉬운설명] ${product.productName}의 주요 소견: ${findings
          .filter((f) => f.grade !== "참고")
          .map((f) => f.heading)
          .join(", ")}`,
      });
      const filtered = filterOutput(draft.text);
      plainSummary = filtered.ok ? filtered.text : null;
    } catch {
      plainSummary = null; // 쉬운 말 요약은 부가 기능 — 실패해도 리포트는 나간다
    }
  }

  return {
    kind: "report",
    productId: product.productId,
    insurer: product.insurer,
    productName: product.productName,
    category: product.category,
    sourceUrl: product.sourceUrl,
    effectiveDate: product.effectiveDate,
    standardRefTitle: standard?.title ?? "기준선 없음",
    totalClauses: parsedClauses.length,
    unparsedClauses: clauses.length - parsedClauses.length,
    clausesWithoutBaseline,
    fields,
    findings,
    plainSummary,
    disclaimer: LEGAL_DISCLAIMER,
  };
};
