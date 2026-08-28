import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { isRegisteredSource } from "@/lib/spine/rag/corpus";

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
const OFFERS_DIR = "data/offers";

const ragFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  documents: z.array(
    z.object({
      sourceId: z.string().min(1),
      title: z.string().min(1),
      url: z.string().nullable().optional(),
      license: z.enum(["green", "yellow_confirmed"]),
      retrievedOn: z.string(),
      chunks: z.array(
        z.object({
          chunkIndex: z.number().int().min(0),
          content: z.string().min(1),
        }),
      ),
    }),
  ),
});

const loadRagFixture = async (
  dataDir: string,
): Promise<readonly RagDocumentSeed[]> => {
  const dir = path.join(path.resolve(dataDir), RAG_DIR);
  assertSeedSourcePathAllowed(dir);
  let files: readonly string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const seeds: RagDocumentSeed[] = [];
  for (const file of [...files].sort()) {
    if (!file.endsWith(".json")) continue;
    const parsed = ragFixtureSchema.parse(
      JSON.parse(await readFile(path.join(dir, file), "utf8")),
    );
    for (const doc of parsed.documents) {
      if (!isRegisteredSource(doc.sourceId)) continue;
      seeds.push({
        document: ragDocumentRowSchema.parse({
          sourceId: doc.sourceId,
          title: doc.title,
          url: doc.url ?? null,
          license: doc.license,
          retrievedOn: doc.retrievedOn,
          provenance: "public_record",
        }),
        chunks: doc.chunks.map((chunk) =>
          ragChunkRowSchema.parse({
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            embedding: null,
          }),
        ),
      });
    }
  }
  return seeds;
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
    sourcePaths: [OFFERS_DIR, path.join(dataDir, RAG_DIR)],
  };
};
