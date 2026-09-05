import path from "node:path";

import {
  genericCorpusChunkIdentity,
  genericCorpusDocumentHash,
  loadGenericCorpusDocuments,
} from "@/lib/knowledge/local-rag/generic-corpus";

import {
  type ArtAuctionRecordRow,
  type OfferingRow,
  type RagChunkRow,
  type RagDocumentRow,
  ragChunkRowSchema,
  ragDocumentRowSchema,
} from "../records";
import { loadFileModeOfferings } from "../repositories/offerings";
import { type SyntheticNameField, assertSeedSourcePathAllowed } from "./guards";
import { syntheticArtAuctionRecords } from "./synthetic";

export interface RagDocumentSeed {
  readonly document: RagDocumentRow;
  readonly chunks: readonly RagChunkRow[];
}

export interface SeedPlan {
  readonly offerings: readonly OfferingRow[];
  readonly artRecords: readonly ArtAuctionRecordRow[];
  readonly ragDocuments: readonly RagDocumentSeed[];
  readonly syntheticNames: readonly SyntheticNameField[];
  readonly sourcePaths: readonly string[];
}

const RAG_DIR = "reference/rag";
const OFFERS_SUBDIR = "offers";

const loadRagFixture = async (
  dataDir: string,
): Promise<readonly RagDocumentSeed[]> => {
  assertSeedSourcePathAllowed(path.join(path.resolve(dataDir), RAG_DIR));
  return (await loadGenericCorpusDocuments(dataDir)).map((doc) => ({
    document: ragDocumentRowSchema.parse({
      sourceId: doc.sourceId,
      title: doc.title,
      url: doc.sourceUrl,
      license: "green",
      retrievedOn: doc.asOf,
      provenance: "public_record",
      scopeKind: "generic",
      sourceUrl: doc.sourceUrl,
      asOf: doc.asOf,
      sourceHash: genericCorpusDocumentHash(doc),
      approvedForPublic: true,
      approvedForExternalAi: true,
      piiReviewStatus: "passed",
      status: "ready",
      limitations: [],
    }),
    chunks: doc.chunks.map((chunk) => {
      const identity = genericCorpusChunkIdentity(doc, chunk);
      return ragChunkRowSchema.parse({
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: null,
        scopeKind: "generic",
        sourceUrl: doc.sourceUrl,
        asOf: doc.asOf,
        sourceHash: identity.sourceHash,
        approvedForPublic: true,
        approvedForExternalAi: true,
        piiReviewStatus: "passed",
        status: "ready",
        limitations: [],
        page: chunk.chunkIndex + 1,
        chunkHash: identity.chunkHash,
        canonicalText: identity.canonicalText,
      });
    }),
  }));
};

const detailStrings = (
  prefix: string,
  value: unknown,
): readonly SyntheticNameField[] => {
  if (typeof value === "string") return [{ field: prefix, value }];
  if (Array.isArray(value)) {
    return value.flatMap((inner, index) =>
      detailStrings(`${prefix}[${index}]`, inner),
    );
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, inner]) =>
      detailStrings(`${prefix}.${key}`, inner),
    );
  }
  return [];
};

const syntheticNamesOf = (
  offerings: readonly OfferingRow[],
  artRecords: readonly ArtAuctionRecordRow[],
): readonly SyntheticNameField[] => [
  ...offerings
    .filter((offering) => offering.provenance === "synthetic")
    .flatMap((offering) => [
      { field: "title_public", value: offering.titlePublic },
      ...detailStrings("detail", offering.detail),
    ]),
  ...artRecords
    .filter((record) => record.provenance === "synthetic")
    .flatMap((record) => [
      { field: "artwork_title", value: record.artworkTitle },
      { field: "auction_house", value: record.auctionHouse },
    ]),
];

export const syntheticOfferSlugs = (plan: SeedPlan): readonly string[] =>
  plan.offerings
    .filter((offering) => offering.provenance === "synthetic")
    .map((offering) => offering.offerSlug);

export const syntheticArtRefs = (plan: SeedPlan): readonly string[] =>
  plan.artRecords
    .filter((record) => record.provenance === "synthetic")
    .map((record) => record.externalRef);

export const buildSeedPlan = async (
  dataDir = "data",
): Promise<SeedPlan> => {
  const offerings = await loadFileModeOfferings(dataDir);
  const artRecords = syntheticArtAuctionRecords();
  const ragDocuments = await loadRagFixture(dataDir);
  return {
    offerings,
    artRecords,
    ragDocuments,
    syntheticNames: syntheticNamesOf(offerings, artRecords),
    sourcePaths: [
      path.join(dataDir, OFFERS_SUBDIR),
      path.join(dataDir, RAG_DIR),
    ],
  };
};
