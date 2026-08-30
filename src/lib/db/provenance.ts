import { z } from "zod";

export const PROVENANCE_VALUES = [
  "public_record",
  "manual_verified",
  "synthetic",
] as const;

export type Provenance = (typeof PROVENANCE_VALUES)[number];

export const provenanceSchema = z.enum(PROVENANCE_VALUES);

export const SYNTHETIC_NAME_PREFIX = "예시 ";

export const LICENSE_VALUES = ["green", "yellow_confirmed"] as const;

export const licenseSchema = z.enum(LICENSE_VALUES);

export const AUCTION_RESULT_VALUES = [
  "sold",
  "unsold",
  "withdrawn",
  "unknown",
] as const;

export const verdictEligible = (
  provenances: readonly Provenance[],
): boolean =>
  provenances.length > 0 &&
  provenances.some((provenance) => provenance !== "synthetic");

export class SyntheticVerdictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyntheticVerdictError";
  }
}

export const assertVerdictProvenance = (
  provenances: readonly Provenance[],
): void => {
  if (!verdictEligible(provenances)) {
    throw new SyntheticVerdictError(
      "synthetic 근거만으로는 판정을 산출할 수 없습니다 — 대조 불가로 처리하세요 (R-STO-06).",
    );
  }
};
