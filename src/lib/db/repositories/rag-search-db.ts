import { sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { isRegisteredSource } from "@/lib/spine/rag/corpus";

import { getRuntimeDb } from "../client";
import type { RagHit, RagSearchRepository, RagSearchResult } from "./types";

const MAX_HITS = 5;

const searchRowSchema = z.object({
  source_id: z.string(),
  content: z.string(),
  score: z.union([z.number(), z.string()]),
  as_of: z.string(),
});

export type RagSqlExecutor = (query: SQL) => Promise<unknown>;

export const createDbRagSearchRepository = (
  execute: RagSqlExecutor = (query) => getRuntimeDb().execute(query),
): RagSearchRepository => {
  return {
    mode: "db",
    async search(query: string): Promise<RagSearchResult> {
      const raw = await execute(sql`
        SELECT d.source_id,
               c.content,
               ts_rank(c.tsv, websearch_to_tsquery('simple', ${query})) AS score,
               d.retrieved_on::text AS as_of
        FROM rag_chunks c
        JOIN rag_documents d ON d.id = c.document_id
        WHERE c.scope_kind = 'generic'
          AND d.scope_kind = 'generic'
          AND c.tsv @@ websearch_to_tsquery('simple', ${query})
        ORDER BY score DESC
        LIMIT ${MAX_HITS}
      `);

      const hits: readonly RagHit[] = z
        .array(searchRowSchema)
        .parse(raw)
        .filter((row) => isRegisteredSource(row.source_id))
        .map((row) => ({
          sourceId: row.source_id,
          content: row.content,
          score: Number(row.score),
          asOf: row.as_of,
        }));
      return { hits, degraded: true };
    },
  };
};
