/** 입력 스크리닝 — 룰 매칭 점수를 합산해 allow/flag/block을 판정한다. */
import { BLOCK_SCORE_THRESHOLD, FLAG_SCORE_THRESHOLD } from "../constants";
import type { ScreenVerdict } from "../types";
import { matchRules } from "./rules";

export const screenInput = (input: string): ScreenVerdict => {
  const hits = matchRules(input);
  const score = hits.reduce((sum, hit) => sum + hit.weight, 0);

  if (score >= BLOCK_SCORE_THRESHOLD) return { decision: "block", score, hits };
  if (score >= FLAG_SCORE_THRESHOLD) return { decision: "flag", score, hits };
  return { decision: "allow", score, hits };
};
