/**
 * 약관 분석 도메인 계약.
 * 스파인 타입과 동일 원칙: 전 필드 불변(readonly), 판별 유니언으로 UI 분기.
 * 표현 원칙: 등급은 확정 판정이 아닌 "근거 기반 가능성 표시" — 근거 없는 경고·주의는 타입이 아니라
 * grading 규칙에서 강제한다(등급 부여 함수가 유일한 생성 경로).
 */
import type { Citation } from "../spine/types";

/** 검토서 표현 원칙의 3단계 등급 */
export type RiskGrade = "참고" | "주의" | "경고";

export const FIELD_KINDS = [
  "보장기간",
  "면책사유",
  "해지·해제",
  "감액·삭감",
  "자동갱신",
  "알릴의무",
  "보험금지급",
] as const;

export type FieldKind = (typeof FIELD_KINDS)[number];

export interface ClauseSpan {
  readonly clauseId: string;
  readonly articleNo: number | null;
  readonly heading: string;
  readonly text: string;
  /** 정규식 분할에 실패한 잔여 텍스트는 숨기지 않고 미분할로 정직 표기 */
  readonly parsed: boolean;
}

export interface ExtractedField {
  readonly kind: FieldKind;
  readonly summary: string;
  readonly clauseId: string;
}

export type EvidenceKind = "standard_deviation" | "legal_type" | "precedent_seed";

export interface EvidenceCard {
  readonly kind: EvidenceKind;
  readonly summary: string;
  /** 출처는 스파인 코퍼스 레지스트리에 등록된 문서만 인용한다 */
  readonly citation: Citation;
}

export interface ClauseFinding {
  readonly clauseId: string;
  readonly heading: string;
  readonly snippet: string;
  /** UI 하이라이트용 — 편차가 잡힌 원문 구절 */
  readonly highlight: string | null;
  /** 신구조문대비표(좌=표준, 우=상품) 렌더용 표준 조문 — 편차 소견에만 존재 */
  readonly standardExcerpt: string | null;
  readonly standardHeading: string | null;
  readonly grade: RiskGrade;
  readonly evidence: readonly EvidenceCard[];
  readonly explanation: string;
}

export interface AnalysisReport {
  readonly kind: "report";
  readonly productId: string;
  readonly insurer: string;
  readonly productName: string;
  readonly category: string;
  readonly sourceUrl: string;
  readonly effectiveDate: string;
  readonly standardRefTitle: string;
  readonly totalClauses: number;
  readonly unparsedClauses: number;
  /** 표준약관에 대응 조항이 없어 diff 기준선이 없는 조항 수 — 커버리지 한계를 숨기지 않는다 */
  readonly clausesWithoutBaseline: number;
  readonly fields: readonly ExtractedField[];
  readonly findings: readonly ClauseFinding[];
  /** LLM 쉬운 말 요약(선택) — 출력 필터 통과분만 */
  readonly plainSummary: string | null;
  readonly disclaimer: string;
}

/** 코퍼스 원문 — ingest 스크립트가 data/raw에서 생성 */
export interface CorpusProduct {
  readonly productId: string;
  readonly insurer: string;
  readonly productName: string;
  readonly category: string;
  readonly sourceUrl: string;
  readonly effectiveDate: string;
  /** diff 기준선이 되는 표준약관 id (스파인 코퍼스 등록 id와 일치) */
  readonly standardRef: string;
  /** true면 시연용 가상 문서 — UI에 반드시 고지 */
  readonly demo: boolean;
  readonly rawText: string;
}

export interface StandardTerms {
  readonly id: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly rawText: string;
}

export interface AnalysisCorpus {
  readonly products: readonly CorpusProduct[];
  readonly standards: readonly StandardTerms[];
}
