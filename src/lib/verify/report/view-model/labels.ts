/**
 * 판정 문구 표와 강조 텍스트 헬퍼.
 * 판정은 3값(일치 / 원장에서 확인되지 않음 / 확인 불가)만 쓰고 원인을 단정하지 않는다.
 */
import type { Verdict } from "../../types";
import type { RichSegment } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "원장에서 확인되지 않음",
  unverifiable: "확인 불가",
};

/** 개체 카드처럼 폭이 좁은 자리의 축약 표기 */
export const VERDICT_BADGE: Record<Verdict, string> = {
  match: "일치",
  mismatch: "미확인",
  unverifiable: "확인 불가",
};

export const t = (text: string): RichSegment => ({ text });
export const b = (text: string): RichSegment => ({ text, isStrong: true });

/** "축산물이력제 개체정보 (…)" → "축산물이력제 개체정보" */
export const shortSourceName = (sources: readonly string[]): string => {
  const first = sources[0];
  if (!first) return "출처 미기재";
  return first.split(" (")[0]?.trim() ?? first;
};
