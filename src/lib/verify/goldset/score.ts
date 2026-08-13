/**
 * 골드셋 대비 추출 점수 — **골격**(S1 착수분).
 * 본 측정(표본 10건·모드별 비교)은 S2 범위이므로, 여기서는 계산 규칙만 고정한다.
 *
 * 채점 규칙
 * - 비교 단위는 `{kind}:{subject}` 필드 하나
 * - TP: 골드에 있고 예측도 같은 값을 냈다
 * - FP: 예측했는데 골드에 없거나(허위 생성) 값이 다르다
 * - FN: 골드에 있는데 예측이 없거나 값이 다르다  (값이 다르면 FP·FN 양쪽에 든다)
 * - 검수를 마치지 않은(`pending`) 라벨은 분모에서 제외하고 그 수를 따로 보고한다
 */
import type { Claim } from "../types";
import { isScorable, labelKey, type GoldLabel, type GoldSet } from "./types";

export interface ScoreBreakdown {
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly falseNegative: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  /** 정답 대비 정확히 일치한 비율 (exact match) */
  readonly exactMatch: number;
  /** 측정에서 제외한 미검수 라벨 수 — 점수와 함께 반드시 보고한다 */
  readonly skippedPending: number;
}

export interface ScoreMismatch {
  readonly key: string;
  readonly kind: "wrong_value" | "missing" | "spurious";
  readonly gold?: string;
  readonly predicted?: string;
}

export interface ScoreResult {
  readonly breakdown: ScoreBreakdown;
  readonly mismatches: readonly ScoreMismatch[];
}

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : numerator / denominator;

const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();

export const scoreExtraction = (
  gold: GoldSet,
  predicted: readonly Claim[],
): ScoreResult => {
  const scorable = gold.labels.filter(isScorable);
  const skippedPending = gold.labels.length - scorable.length;

  const goldByKey = new Map<string, GoldLabel>(
    scorable.map((label) => [labelKey(label), label]),
  );
  const predictedByKey = new Map<string, Claim>(
    predicted.map((claim) => [labelKey(claim), claim]),
  );

  const mismatches: ScoreMismatch[] = [];
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const [key, label] of goldByKey) {
    const claim = predictedByKey.get(key);
    if (!claim) {
      falseNegative += 1;
      mismatches.push({ key, kind: "missing", gold: label.value });
      continue;
    }
    if (normalize(claim.value) === normalize(label.value)) {
      truePositive += 1;
      continue;
    }
    falseNegative += 1;
    falsePositive += 1;
    mismatches.push({
      key,
      kind: "wrong_value",
      gold: label.value,
      predicted: claim.value,
    });
  }

  for (const [key, claim] of predictedByKey) {
    if (goldByKey.has(key)) continue;
    falsePositive += 1;
    mismatches.push({ key, kind: "spurious", predicted: claim.value });
  }

  const precision = ratio(truePositive, truePositive + falsePositive);
  const recall = ratio(truePositive, truePositive + falseNegative);

  return {
    breakdown: {
      truePositive,
      falsePositive,
      falseNegative,
      precision,
      recall,
      f1: ratio(2 * precision * recall, precision + recall),
      exactMatch: ratio(truePositive, goldByKey.size),
      skippedPending,
    },
    mismatches,
  };
};
