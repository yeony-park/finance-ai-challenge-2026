/**
 * 판정 문구 표와 강조 텍스트 헬퍼.
 *
 * 화면에 내보내는 판정 명칭은 3종(일치 / 원장 미확인 / 대조 불가)뿐이고 원인을 단정하지 않는다.
 * 내부 코드 식별자(`Verdict` = match/mismatch/unverifiable)와 문서용 용어("불일치")는 그대로 두되,
 * 사용자에게 보이는 문자열은 이 표를 통해서만 나간다(홈-IA-개편 §2 판정 명칭 정책).
 * 좁은 자리(개체 카드 뱃지)도 같은 명칭을 쓴다 — 자리마다 다른 이름이 붙지 않게.
 */
import type { Verdict } from "../../types";
import type { RichSegment } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "원장 미확인",
  unverifiable: "대조 불가",
};

export const t = (text: string): RichSegment => ({ text });
export const b = (text: string): RichSegment => ({ text, isStrong: true });

/** "축산물이력제 개체정보 (…)" → "축산물이력제 개체정보" */
export const shortSourceName = (sources: readonly string[]): string => {
  const first = sources[0];
  if (!first) return "출처 미기재";
  return first.split(" (")[0]?.trim() ?? first;
};
