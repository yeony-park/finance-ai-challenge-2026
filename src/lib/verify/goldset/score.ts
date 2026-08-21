import type { Claim } from "../types";
import { isScorable, labelKey, type GoldLabel, type GoldSet } from "./types";

export interface ScoreBreakdown {
  readonly truePositive: number;
  readonly falsePositive: number;
  readonly falseNegative: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly exactMatch: number;
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

const compare = (
  goldByKey: ReadonlyMap<string, string>,
  predicted: readonly Claim[],
  skippedPending: number,
): ScoreResult => {
  const predictedByKey = new Map<string, Claim>(
    predicted.map((claim) => [labelKey(claim), claim]),
  );

  const mismatches: ScoreMismatch[] = [];
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  for (const [key, goldValue] of goldByKey) {
    const claim = predictedByKey.get(key);
    if (!claim) {
      falseNegative += 1;
      mismatches.push({ key, kind: "missing", gold: goldValue });
      continue;
    }
    if (normalize(claim.value) === normalize(goldValue)) {
      truePositive += 1;
      continue;
    }
    falseNegative += 1;
    falsePositive += 1;
    mismatches.push({
      key,
      kind: "wrong_value",
      gold: goldValue,
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

export const scoreExtraction = (
  gold: GoldSet,
  predicted: readonly Claim[],
): ScoreResult => {
  const scorable = gold.labels.filter(isScorable);
  return compare(
    new Map(scorable.map((label: GoldLabel) => [labelKey(label), label.value])),
    predicted,
    gold.labels.length - scorable.length,
  );
};

export const scoreAgainstPrelabels = (
  gold: GoldSet,
  predicted: readonly Claim[],
): ScoreResult =>
  compare(
    new Map(
      gold.labels.map((label: GoldLabel) => [
        labelKey(label),
        label.prelabeledValue,
      ]),
    ),
    predicted,
    0,
  );
