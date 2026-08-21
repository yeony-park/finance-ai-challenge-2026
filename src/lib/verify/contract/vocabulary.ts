import type { Verdict, Verifiability } from "../types";

export type EvidenceStatus =
  | "verified"
  | "mismatch"
  | "review"
  | "missing"
  | "stale";

export const VERDICT_LABELS: Readonly<Record<Verdict, string>> = {
  match: "일치",
  mismatch: "원장 불일치",
  unverifiable: "대조 불가",
};

export const EVIDENCE_STATUS_LABELS: Readonly<Record<EvidenceStatus, string>> = {
  verified: "근거 확인",
  mismatch: "원문 간 차이",
  review: "추가 대조",
  missing: "자료 미확인",
  stale: "현재성 재확인",
};

export interface EvidenceStatusInput {
  readonly verifiability: Verifiability;
  readonly verdict?: Verdict;
  readonly isStale?: boolean;
}

export const projectEvidenceStatus = (
  input: EvidenceStatusInput,
): EvidenceStatus => {
  if (input.verdict === "mismatch") return "mismatch";
  if (input.isStale) return "stale";
  if (input.verdict === "match") return "verified";
  if (input.verdict === "unverifiable") return "missing";
  switch (input.verifiability) {
    case "verifiable":
    case "unparsed":
    case "cross_check_conflict":
    case "llm_only":
      return "review";
    case "no_reference_data":
    case "structurally_impossible":
      return "missing";
    default: {
      const exhausted: never = input.verifiability;
      throw new Error(`알 수 없는 verifiability: ${String(exhausted)}`);
    }
  }
};
