import type { CategoryId } from "@/lib/verify/contract/category";

import type { OfferingRow } from "../records";

export type Offering = OfferingRow;

export interface OfferingsRepository {
  readonly mode: "db" | "file";
  findBySlug(slug: string): Promise<Offering | null>;
  listByCategory(categoryId: CategoryId): Promise<readonly Offering[]>;
}

export interface RagHit {
  readonly sourceId: string;
  readonly content: string;
  readonly score: number;
  readonly asOf: string;
}

export interface RagSearchResult {
  readonly hits: readonly RagHit[];
  readonly degraded: boolean;
}

export interface RagSearchRepository {
  readonly mode: "db" | "file";
  search(
    query: string,
    opts?: { readonly categoryId?: CategoryId },
  ): Promise<RagSearchResult>;
}
