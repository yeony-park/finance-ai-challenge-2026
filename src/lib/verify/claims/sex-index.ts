/**
 * 개체별 성별 색인 — 신고서 표의 **행 단위**로 성별 서술을 읽는다.
 *
 * 왜 행 단위인가
 * - 신고서 본문에는 "거세우의 경우 26개월 이후 출하" 같은 일반 서술이 곳곳에 있다.
 *   문서 전체를 1회 스캔해 그 값을 전 개체에 붙이면, 혼성 우군(숫소·암소·거세 혼재)에서
 *   전 개체에 같은 성별이 찍혀 **가짜 불일치**가 만들어진다.
 * - 개체 명세표에는 성별 열이 없지만, 취득가액·사료비 표의 행 머리가
 *   "한우 송아지(숫소) ○○ 1호" 형태라 행 안에서 개체와 성별이 함께 관측된다.
 *
 * 매칭 우선순위는 이력번호(정확) → 개체명(문자열)이다.
 * 한 개체에 서로 다른 성별이 관측되면 색인에 넣지 않는다 — 그 개체는 확인 불가로 강등된다.
 */
import type { ParsedTable } from "../parse/tables";

/** 산문·표에 적힌 성별 표기 → 정규화 값 */
const SEX_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/송아지\s*\(\s*숫소\s*\)/, "수"],
  [/송아지\s*\(\s*암소\s*\)/, "암"],
  [/숫송아지/, "수"],
  [/암송아지/, "암"],
  [/거세우/, "거세"],
];

/** 텍스트 한 덩어리에서 성별 표기를 읽는다 (없으면 undefined) */
export const detectSex = (text: string): string | undefined => {
  for (const [pattern, value] of SEX_PATTERNS) {
    if (pattern.test(text)) return value;
  }
  return undefined;
};

/** 성별을 붙일 대상 — 개체 명세표에서 이미 읽어낸 행 */
export interface SexIndexTarget {
  readonly subject: string;
  /** 명세표 기재 이력번호 원문 (게이트 통과 여부와 무관) */
  readonly traceNoRaw: string;
}

const digitsOf = (raw: string): string => raw.replace(/\D/g, "");

/** 이 행이 가리키는 개체를 찾는다. 하나로 특정되지 않으면 undefined. */
const matchTarget = (
  rowText: string,
  targets: readonly SexIndexTarget[],
): SexIndexTarget | undefined => {
  const rowDigits = digitsOf(rowText);
  const byTraceNo = targets.filter((target) => {
    const digits = digitsOf(target.traceNoRaw);
    return digits.length >= 9 && rowDigits.includes(digits);
  });
  if (byTraceNo.length === 1) return byTraceNo[0];
  if (byTraceNo.length > 1) return undefined;

  const bySubject = targets.filter((target) => rowText.includes(target.subject));
  return bySubject.length === 1 ? bySubject[0] : undefined;
};

/**
 * 표 전체를 훑어 개체별 성별 색인을 만든다.
 * 개체 명세표 자신도 대상에 포함하지만, 성별 서술이 없으면 아무것도 기록되지 않는다.
 */
export const buildSexIndex = (
  tables: readonly ParsedTable[],
  targets: readonly SexIndexTarget[],
): ReadonlyMap<string, string> => {
  const observed = new Map<string, Set<string>>();

  for (const table of tables) {
    for (const cells of table.rows) {
      const rowText = cells.join(" ");
      const sex = detectSex(rowText);
      if (sex === undefined) continue;

      const target = matchTarget(rowText, targets);
      if (!target) continue;

      const bucket = observed.get(target.subject) ?? new Set<string>();
      bucket.add(sex);
      observed.set(target.subject, bucket);
    }
  }

  const index = new Map<string, string>();
  for (const [subject, values] of observed) {
    // 같은 개체에 상충하는 성별이 관측되면 판정 재료로 쓰지 않는다
    if (values.size !== 1) continue;
    const [only] = values;
    if (only) index.set(subject, only);
  }
  return index;
};
