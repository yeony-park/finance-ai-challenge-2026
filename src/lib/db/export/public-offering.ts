import { maskFreeText } from "@/lib/verify/report/mask";

import type { Offering } from "../repositories/types";

export interface PublicOffering {
  readonly offerSlug: string;
  readonly categoryId: string;
  readonly provenance: string;
  readonly titlePublic: string;
  readonly amountWon: number | null;
  readonly opensOn: string | null;
  readonly closesOn: string | null;
  readonly isExample: boolean;
  readonly detail: Record<string, unknown>;
}

const maskDeep = (value: unknown): unknown => {
  if (typeof value === "string") return maskFreeText(value);
  if (Array.isArray(value)) return value.map(maskDeep);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, maskDeep(inner)]),
    );
  }
  return value;
};

export const toPublicOffering = (offering: Offering): PublicOffering => ({
  offerSlug: offering.offerSlug,
  categoryId: offering.categoryId,
  provenance: offering.provenance,
  titlePublic: maskFreeText(offering.titlePublic),
  amountWon: offering.amountWon,
  opensOn: offering.opensOn,
  closesOn: offering.closesOn,
  isExample: offering.provenance === "synthetic",
  detail: maskDeep(offering.detail) as Record<string, unknown>,
});

export interface PublicOfferingsManifest {
  readonly schemaVersion: 1;
  readonly generatedBy: "db:export";
  readonly offerings: readonly PublicOffering[];
}

export const toPublicOfferingsManifest = (
  offerings: readonly Offering[],
): PublicOfferingsManifest => ({
  schemaVersion: 1,
  generatedBy: "db:export",
  offerings: [...offerings]
    .sort((a, b) => a.offerSlug.localeCompare(b.offerSlug))
    .map(toPublicOffering),
});
