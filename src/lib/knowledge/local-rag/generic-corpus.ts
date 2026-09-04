import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { findDoc } from "@/lib/spine/rag/corpus";
import { containsObviousPii } from "../document-extraction";
import type { GenericKnowledgeEvidence } from "../retrieval";

const GenericFixtureSchema = z.strictObject({
  schemaVersion: z.literal(1),
  documents: z.array(z.strictObject({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url().optional(),
    license: z.enum(["green", "yellow_confirmed"]),
    approvedForExternalAi: z.boolean().default(false),
    retrievedOn: z.string().date(),
    scopeKind: z.enum(["generic", "product"]).default("generic"),
    chunks: z.array(z.strictObject({
      chunkIndex: z.number().int().min(0),
      content: z.string().trim().min(1),
      scopeKind: z.enum(["generic", "product"]).default("generic"),
    })).min(1),
  })),
});

export interface GenericCorpusDocument {
  readonly sourceId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly asOf: string;
  readonly chunks: readonly {
    readonly chunkIndex: number;
    readonly content: string;
  }[];
}

export const loadGenericCorpusDocuments = async (
  dataRoot = "data",
): Promise<readonly GenericCorpusDocument[]> => {
  const root = path.resolve(dataRoot, "reference/rag");
  const files = await readdir(root).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const documents = new Map<string, GenericCorpusDocument>();
  for (const fileName of files.filter((file) => file.endsWith(".json")).sort()) {
    const parsed = GenericFixtureSchema.parse(JSON.parse(await readFile(path.join(root, fileName), "utf8")));
    for (const document of parsed.documents) {
      if (
        document.scopeKind !== "generic" ||
        document.license !== "green" ||
        !document.approvedForExternalAi
      ) continue;
      const source = findDoc(document.sourceId);
      if (!source) throw new Error(`등록되지 않은 일반 지식 출처입니다: ${document.sourceId}`);
      if (documents.has(document.sourceId)) throw new Error(`중복된 일반 지식 출처입니다: ${document.sourceId}`);
      const chunks = document.chunks.filter((chunk) =>
        chunk.scopeKind === "generic" && !containsObviousPii(chunk.content)
      );
      if (chunks.length === 0) continue;
      if (document.url && document.url !== source.url) {
        throw new Error(`등록 정보와 URL이 다른 일반 지식 출처입니다: ${document.sourceId}`);
      }
      if (new Set(chunks.map((chunk) => chunk.chunkIndex)).size !== chunks.length) {
        throw new Error(`chunkIndex가 중복된 일반 지식 출처입니다: ${document.sourceId}`);
      }
      documents.set(document.sourceId, {
        sourceId: document.sourceId,
        title: document.title,
        sourceUrl: source.url,
        asOf: document.retrievedOn,
        chunks,
      });
    }
  }
  return [...documents.values()];
};

const keywordScore = (content: string, query: string): number => {
  const tokens = query.toLowerCase().split(/\s+/).map((token) => token.trim()).filter((token) => token.length >= 2);
  if (tokens.length === 0) return 0;
  const haystack = content.toLowerCase();
  return tokens.filter((token) => haystack.includes(token)).length / tokens.length;
};

export const searchApprovedGenericCorpus = async (
  query: string,
  dataRoot = "data",
  limit = 5,
): Promise<readonly GenericKnowledgeEvidence[]> => {
  const documents = await loadGenericCorpusDocuments(dataRoot);
  return documents.flatMap((document) => document.chunks.map((chunk): GenericKnowledgeEvidence => ({
    sourceId: document.sourceId,
    label: document.title,
    url: document.sourceUrl,
    excerpt: chunk.content.replace(/\s+/g, " ").trim().slice(0, 320),
    asOf: document.asOf,
    hash: createHash("sha256").update(chunk.content).digest("hex"),
    status: "approved",
    dataNature: "observed",
    categoryId: null,
    productId: null,
    score: keywordScore(chunk.content, query),
  })))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.hash.localeCompare(right.hash))
    .slice(0, Math.min(Math.max(limit, 1), 20));
};
