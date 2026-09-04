import { eq } from "drizzle-orm";

import type { CategoryId } from "@/lib/verify/contract/category";

import { getDirectDb, getRuntimeDb, type Database } from "../client";
import { type OfferingRow, offeringRowSchema } from "../records";
import { offerings, runtimePublicOfferings } from "../schema";
import type { Offering, OfferingsRepository } from "./types";

const MAX_OFFERINGS_PER_CATEGORY = 500;

export const PUBLIC_OFFERING_SELECTION = {
  offerSlug: runtimePublicOfferings.offerSlug,
  categoryId: runtimePublicOfferings.categoryId,
  provenance: runtimePublicOfferings.provenance,
  titlePublic: runtimePublicOfferings.titlePublic,
  amountWon: runtimePublicOfferings.amountWon,
  opensOn: runtimePublicOfferings.opensOn,
  closesOn: runtimePublicOfferings.closesOn,
  detail: runtimePublicOfferings.detail,
  sourceMeta: runtimePublicOfferings.sourceMeta,
} as const;

const DIRECT_OFFERING_SELECTION = {
  offerSlug: offerings.offerSlug,
  categoryId: offerings.categoryId,
  provenance: offerings.provenance,
  titlePublic: offerings.titlePublic,
  amountWon: offerings.amountWon,
  opensOn: offerings.opensOn,
  closesOn: offerings.closesOn,
  detail: offerings.detail,
  sourceMeta: offerings.sourceMeta,
} as const;

interface OfferingSelect {
  readonly offerSlug: string;
  readonly categoryId: string;
  readonly provenance: string;
  readonly titlePublic: string;
  readonly amountWon: number | null;
  readonly opensOn: string | null;
  readonly closesOn: string | null;
  readonly detail: unknown;
  readonly sourceMeta: unknown;
}

const toOffering = (row: OfferingSelect): OfferingRow =>
  offeringRowSchema.parse({
    offerSlug: row.offerSlug,
    categoryId: row.categoryId,
    provenance: row.provenance,
    titlePublic: row.titlePublic,
    amountWon: row.amountWon,
    opensOn: row.opensOn,
    closesOn: row.closesOn,
    detail: row.detail,
    sourceMeta: row.sourceMeta,
  });

const createRuntimeOfferingsRepository = (db: Database): OfferingsRepository => ({
  mode: "db",
  async findBySlug(slug: string): Promise<Offering | null> {
    const rows = await db
      .select(PUBLIC_OFFERING_SELECTION)
      .from(runtimePublicOfferings)
      .where(eq(runtimePublicOfferings.offerSlug, slug))
      .limit(1);
    return rows[0] ? toOffering(rows[0]) : null;
  },
  async listByCategory(categoryId: CategoryId): Promise<readonly Offering[]> {
    const rows = await db
      .select(PUBLIC_OFFERING_SELECTION)
      .from(runtimePublicOfferings)
      .where(eq(runtimePublicOfferings.categoryId, categoryId))
      .limit(MAX_OFFERINGS_PER_CATEGORY);
    return rows.map(toOffering);
  },
});

const createDirectRepository = (db: Database): OfferingsRepository => ({
  mode: "db",
  async findBySlug(slug: string): Promise<Offering | null> {
    const rows = await db
      .select(DIRECT_OFFERING_SELECTION)
      .from(offerings)
      .where(eq(offerings.offerSlug, slug))
      .limit(1);
    return rows[0] ? toOffering(rows[0]) : null;
  },
  async listByCategory(categoryId: CategoryId): Promise<readonly Offering[]> {
    const rows = await db
      .select(DIRECT_OFFERING_SELECTION)
      .from(offerings)
      .where(eq(offerings.categoryId, categoryId))
      .limit(MAX_OFFERINGS_PER_CATEGORY);
    return rows.map(toOffering);
  },
});

export const createDbOfferingsRepository = (): OfferingsRepository =>
  createRuntimeOfferingsRepository(getRuntimeDb());

export const createDirectOfferingsRepository = (): OfferingsRepository =>
  createDirectRepository(getDirectDb());
