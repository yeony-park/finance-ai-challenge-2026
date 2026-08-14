import type { Verdict } from "../../types";
import type { ReportSnapshot } from "../snapshot";
import type { RichSegment } from "./types";

export const VERDICT_LABEL: Record<Verdict, string> = {
  match: "일치",
  mismatch: "원장 미확인",
  unverifiable: "대조 불가",
};

export const t = (text: string): RichSegment => ({ text });
export const b = (text: string): RichSegment => ({ text, isStrong: true });

const MISMATCH_FIELD_FALLBACK = "일부 기재";

export const mismatchFieldLabel = (report: ReportSnapshot): string => {
  const fields = [
    ...new Set(
      report.judgements
        .filter((judgement) => judgement.verdict === "mismatch")
        .map((judgement) => judgement.claim.field),
    ),
  ];
  return fields.length > 0 ? fields.join("·") : MISMATCH_FIELD_FALLBACK;
};

export const shortSourceName = (sources: readonly string[]): string => {
  const first = sources[0];
  if (!first) return "출처 미기재";
  return first.split(" (")[0]?.trim() ?? first;
};
