import { eq } from "drizzle-orm";

import type { CategoryId } from "@/lib/verify/contract/category";

import { getDirectDb } from "../client";
import { type OfferingRow, offeringRowSchema } from "../records";
import { offerings } from "../schema";
import type { Offering, OfferingsRepository } from "./types";

const MAX_OFFERINGS_PER_CATEGORY = 500;

type OfferingSelect = typeof offerings.$inferSelect;

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

export const createDbOfferingsRepository = (): OfferingsRepository => {
  const db = getDirectDb();
  return {
    mode: "db",
    async findBySlug(slug: string): Promise<Offering | null> {
      const rows = await db
        .select()
        .from(offerings)
        .where(eq(offerings.offerSlug, slug))
        .limit(1);
      return rows[0] ? toOffering(rows[0]) : null;
    },
    async listByCategory(categoryId: CategoryId): Promise<readonly Offering[]> {
      const rows = await db
        .select()
        .from(offerings)
        .where(eq(offerings.categoryId, categoryId))
        .limit(MAX_OFFERINGS_PER_CATEGORY);
      return rows.map(toOffering);
    },
  };
};
