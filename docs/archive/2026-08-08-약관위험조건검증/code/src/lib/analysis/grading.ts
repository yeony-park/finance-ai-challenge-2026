/**
 * 등급 규칙 — 참고/주의/경고의 유일한 결정 경로.
 * 표현 원칙(검토서 제3조·stream8): 확정 판정 금지, 근거 기반 가능성 표시.
 *
 * 규칙(명문화):
 *   경고 = 불리 방향 표준 편차 ≥1 AND 약관규제법 유형 근거 ≥1  (독립 근거 2계열)
 *   주의 = 불리 방향 표준 편차 ≥1 OR 약관규제법 유형 근거 ≥1   (근거 1계열)
 *   참고 = 그 외(검토필요 편차 등 정보성 신호만 있는 경우)
 *
 * 불변식: 근거(evidence) 0건이면 어떤 경우에도 주의·경고를 부여하지 않는다.
 */
import type { DeviationResult } from "./deviation";
import type { LegalTypeHit } from "./legal-types";
import type { RiskGrade } from "./types";

export interface GradeInput {
  readonly deviations: readonly DeviationResult[];
  readonly legalHits: readonly LegalTypeHit[];
}

export const decideGrade = ({ deviations, legalHits }: GradeInput): RiskGrade => {
  const unfavorable = deviations.filter((d) => d.direction === "불리").length;
  const legal = legalHits.length;

  if (unfavorable >= 1 && legal >= 1) return "경고";
  if (unfavorable >= 1 || legal >= 1) return "주의";
  return "참고";
};

/** 근거 개수 불변식 검증 — 파이프라인·테스트에서 공용 */
export const isGradeConsistent = (
  grade: RiskGrade,
  evidenceCount: number,
): boolean => (grade === "참고" ? true : evidenceCount >= 1);
