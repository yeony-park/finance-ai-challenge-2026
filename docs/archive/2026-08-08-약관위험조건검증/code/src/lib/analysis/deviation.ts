/**
 * 표준약관 편차 탐지 — diff 기준선은 금감원 시행세칙 별표15 표준약관(stream5 교정: 공정위 아님).
 * 판정 근거를 모델이 아닌 "문서 비교"에 두는 축 1.
 * ① 조 제목 매칭 → ② 불리 변형 마커 대조 → ③ 마커 밖 차이는 "검토필요"로만 표시(불리 단정 금지).
 */
import { normalizeHeading, splitClauses } from "./clause-splitter";
import type { ClauseSpan } from "./types";

export type DeviationDirection = "불리" | "검토필요";

export interface DeviationResult {
  readonly clauseId: string;
  readonly standardHeading: string;
  /** 대응 표준약관 조문 전문 — UI 신구조문대비표(좌=표준, 우=상품) 렌더용 */
  readonly standardText: string;
  readonly direction: DeviationDirection;
  readonly detail: string;
  /** 편차로 잡힌 상품 약관 원문 구절 (UI 하이라이트용) */
  readonly matchedText: string;
}

/**
 * 불리 변형 마커 — 표준 문구(standardPattern)가 기준선에 있는데
 * 상품 약관이 이를 대체 문구(productPattern)로 바꾼 경우만 "불리"로 판정한다.
 */
interface UnfavorableMarker {
  readonly id: string;
  readonly productPattern: RegExp;
  readonly standardPattern: RegExp;
  readonly detail: string;
}

const UNFAVORABLE_MARKERS: readonly UnfavorableMarker[] = [
  {
    id: "termination-period-widen",
    productPattern: /상당한\s*기간/,
    standardPattern: /1개월/,
    detail:
      "표준약관은 해지권 행사 기간을 '안 날부터 1개월'로 제한하지만, 이 조항은 '상당한 기간'으로 넓혀 소비자에게 불리하게 변형되어 있습니다.",
  },
  {
    id: "company-defined-basis",
    productPattern: /회사가\s*정하는\s*(기준|바)/,
    standardPattern: /고의\s*또는\s*중대한\s*과실/,
    detail:
      "표준약관에 없는 '회사가 정하는 기준' 문구가 추가되어 판단 기준이 사업자 일방에게 넘어가 있습니다.",
  },
  {
    id: "deemed-renewal",
    productPattern: /표시하지\s*않으면[^\n]{0,20}(갱신|동의)[^\n]{0,14}것으로\s*보/,
    standardPattern: /갱신\s*의사를\s*표시한\s*경우/,
    detail:
      "표준약관은 계약자가 갱신 의사를 표시한 경우에 갱신되지만, 이 조항은 무응답을 갱신 동의로 간주합니다.",
  },
];

const tokenize = (text: string): ReadonlySet<string> =>
  new Set(text.replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean));

const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  const intersection = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 1 : intersection / union;
};

/** 이 값 미만이면 표준과 실질적으로 다른 조항으로 본다 (검토필요) */
const REVIEW_SIMILARITY_THRESHOLD = 0.85;

export const detectDeviations = (
  productClauses: readonly ClauseSpan[],
  standardId: string,
  standardRawText: string,
): readonly DeviationResult[] => {
  const standardClauses = splitClauses(standardId, standardRawText);
  const standardByHeading = new Map(
    standardClauses
      .filter((c) => c.parsed)
      .map((c) => [normalizeHeading(c.heading), c]),
  );

  const results: DeviationResult[] = [];

  for (const clause of productClauses) {
    if (!clause.parsed) continue;
    const standard = standardByHeading.get(normalizeHeading(clause.heading));
    // 기준선 없는 조항은 누락을 숨기지 않는다 — diff 대상 제외(파이프라인에서 "기준선 없음" 표기)
    if (!standard) continue;

    let unfavorableFound = false;
    for (const marker of UNFAVORABLE_MARKERS) {
      const productMatch = clause.text.match(marker.productPattern);
      const standardHasBaseline = marker.standardPattern.test(standard.text);
      // 표준 조항에는 상품의 변형 문구가 없어야 진짜 편차다 (표준 자체 오탐 방지)
      const standardLacksMarker = !marker.productPattern.test(standard.text);
      if (productMatch && standardHasBaseline && standardLacksMarker) {
        unfavorableFound = true;
        results.push({
          clauseId: clause.clauseId,
          standardHeading: standard.heading,
          standardText: standard.text,
          direction: "불리",
          detail: marker.detail,
          matchedText: productMatch[0],
        });
      }
    }

    if (!unfavorableFound) {
      const similarity = jaccard(tokenize(clause.text), tokenize(standard.text));
      if (similarity < REVIEW_SIMILARITY_THRESHOLD) {
        results.push({
          clauseId: clause.clauseId,
          standardHeading: standard.heading,
          standardText: standard.text,
          direction: "검토필요",
          detail: `표준약관 동일 조항과 표현 차이가 있습니다(유사도 ${(similarity * 100).toFixed(0)}%). 불리 여부는 단정하지 않으며 원문 대조를 권장합니다.`,
          matchedText: clause.text.slice(0, 60),
        });
      }
    }
  }

  return results;
};
