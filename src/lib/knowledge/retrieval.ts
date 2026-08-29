import { createHash } from "node:crypto";

import { OFFERS, type OfferEntry } from "@/components/site/offers";
import { CATEGORY_IDS, type CategoryId } from "@/lib/content/categories";
import {
  resolveOfferingsRepository,
  type Offering,
  type OfferingsRepository,
} from "@/lib/db/repositories/offerings";
import { resolveRagSearchRepository } from "@/lib/db/repositories/rag-search";
import type { RagSearchRepository } from "@/lib/db/repositories/types";
import { findDoc } from "@/lib/spine/rag/corpus";

export interface RetrievalRepositories {
  readonly offerings: OfferingsRepository;
  readonly rag: RagSearchRepository;
}

export interface GenericKnowledgeEvidence {
  readonly sourceId: string;
  readonly label: string;
  readonly url: string;
  readonly excerpt: string;
  readonly asOf: string;
  readonly hash: string;
  readonly status: "approved";
  readonly dataNature: "observed";
  readonly categoryId: CategoryId | null;
  readonly productId: null;
  readonly score: number;
}

export const resolveRetrievalRepositories = async (options: {
  readonly dataDir?: string;
  readonly offerings?: OfferingsRepository;
  readonly rag?: RagSearchRepository;
} = {}): Promise<RetrievalRepositories> => {
  const [offerings, rag] = await Promise.all([
    options.offerings ?? resolveOfferingsRepository({ dataDir: options.dataDir }),
    options.rag ?? resolveRagSearchRepository({ dataDir: options.dataDir }),
  ]);
  return { offerings, rag };
};

const categoryOf = (offer: OfferEntry): CategoryId =>
  offer.assetKind === "real-estate" ? "real-estate" : "cattle";

export const publishedEntryFor = (offering: Offering): OfferEntry | null => {
  if (offering.provenance === "synthetic") return null;
  const entry = OFFERS.find((item) => item.id === offering.offerSlug) ?? null;
  return entry && categoryOf(entry) === offering.categoryId ? entry : null;
};

export const listPublishedRepositoryOfferings = async (
  repository: OfferingsRepository,
  categoryId?: CategoryId,
): Promise<readonly { readonly offering: Offering; readonly entry: OfferEntry }[]> => {
  const categories = categoryId ? [categoryId] : CATEGORY_IDS;
  const rows = (await Promise.all(categories.map((category) => repository.listByCategory(category)))).flat();
  return rows.flatMap((offering) => {
    const entry = publishedEntryFor(offering);
    return entry ? [{ offering, entry }] : [];
  });
};

export type PublishedOfferingScope =
  | { readonly status: "found"; readonly offering: Offering; readonly entry: OfferEntry }
  | { readonly status: "unknown" | "category-mismatch" };

export const findPublishedOfferingScope = async (
  repository: OfferingsRepository,
  categoryId: CategoryId,
  productId: string,
): Promise<PublishedOfferingScope> => {
  const offering = await repository.findBySlug(productId);
  if (!offering) return { status: "unknown" };
  if (offering.categoryId !== categoryId) return { status: "category-mismatch" };
  const entry = publishedEntryFor(offering);
  return entry ? { status: "found", offering, entry } : { status: "unknown" };
};

export const isGenericKnowledgeQuery = (query: string): boolean =>
  /(?:공시|원장|대조|검증|확인|제도|방법|무엇|어떻게|주의|위험)/.test(query);

export const retrieveGenericKnowledge = async (
  repository: RagSearchRepository,
  query: string,
  categoryId?: CategoryId,
): Promise<{ readonly evidence: readonly GenericKnowledgeEvidence[]; readonly degraded: boolean }> => {
  const result = await repository.search(query, { categoryId });
  const evidence = result.hits.flatMap((hit) => {
    const source = findDoc(hit.sourceId);
    if (!source) return [];
    return [{
      sourceId: hit.sourceId,
      label: source.title,
      url: source.url,
      excerpt: hit.content.replace(/\s+/g, " ").trim().slice(0, 320),
      asOf: hit.asOf,
      hash: createHash("sha256").update(hit.content).digest("hex"),
      status: "approved" as const,
      dataNature: "observed" as const,
      categoryId: null,
      productId: null,
      score: hit.score,
    }];
  });
  return { evidence, degraded: result.degraded };
};
