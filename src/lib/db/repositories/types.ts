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

export interface ProductKnowledgeScope {
  readonly categoryId: CategoryId;
  readonly productId: string;
  readonly scenarioId?: string;
  readonly dataNature: "observed" | "scenario";
}

export interface ProductKnowledgeDocument extends ProductKnowledgeScope {
  readonly sourceId: string;
  readonly documentId: string;
  readonly title: string;
  readonly sourceKind: "issuer-claim" | "platform-claim" | "official-document" | "external-observation" | "scenario-input";
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly sourceHash: string;
  readonly status: "ready" | "partial";
  readonly approvedForPublic: boolean;
  readonly approvedForExternalAi: boolean;
  readonly piiReviewStatus: "passed" | "not-reviewed";
  readonly limitations: readonly string[];
}

export interface ProductKnowledgeChunk extends Omit<ProductKnowledgeDocument, "status"> {
  readonly status: "ready";
  readonly chunkId: string;
  readonly page: number;
  readonly text: string;
  readonly canonicalText: string;
  readonly chunkHash: string;
}

export interface ProductKnowledgeEvidenceGroup {
  readonly groupKind: "issuer-claim" | "external-observation";
  readonly label: string;
  readonly sourceKind: "official-document" | "external-observation";
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly dataNature: "observed";
  readonly sourceHash: string;
  readonly limitations: readonly string[];
  readonly items: readonly {
    readonly evidenceId: string;
    readonly label: string;
    readonly value: string;
    readonly documentId?: string;
    readonly chunkId?: string;
    readonly page?: number;
  }[];
}

export interface ProductKnowledgeResult {
  readonly documents: readonly ProductKnowledgeDocument[];
  readonly chunks: readonly ProductKnowledgeChunk[];
  readonly evidenceGroups?: readonly ProductKnowledgeEvidenceGroup[];
}

export interface ProductKnowledgeRepository {
  readonly mode: "db" | "file";
  findExact(scope: ProductKnowledgeScope): Promise<ProductKnowledgeResult>;
}
