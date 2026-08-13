import type { Verdict } from "../../types";
import type { RichSegment } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "원장 미확인",
  unverifiable: "대조 불가",
};

export const t = (text: string): RichSegment => ({ text });
export const b = (text: string): RichSegment => ({ text, isStrong: true });

export const shortSourceName = (sources: readonly string[]): string => {
  const first = sources[0];
  if (!first) return "출처 미기재";
  return first.split(" (")[0]?.trim() ?? first;
};
