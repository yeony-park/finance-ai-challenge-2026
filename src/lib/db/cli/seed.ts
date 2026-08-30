import { and, eq, notInArray } from "drizzle-orm";

import { closeConnections, getDirectDb } from "../client";
import { directDatabaseUrl } from "../env";
import {
  artAuctionRecords,
  offerings as offeringsTable,
  ragChunks,
  ragDocuments,
} from "../schema";
import {
  assertSeedSourcePathsAllowed,
  assertSyntheticNamesClean,
} from "../seed/guards";
import {
  type SeedPlan,
  buildSeedPlan,
  syntheticArtRefs,
  syntheticOfferSlugs,
} from "../seed/plan";

type Db = ReturnType<typeof getDirectDb>;
type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const seedOfferings = async (
  db: DbOrTx,
  plan: SeedPlan,
): Promise<void> => {
  for (const row of plan.offerings) {
    await db
      .insert(offeringsTable)
      .values(row)
      .onConflictDoUpdate({
        target: offeringsTable.offerSlug,
        set: {
          categoryId: row.categoryId,
          provenance: row.provenance,
          titlePublic: row.titlePublic,
          amountWon: row.amountWon,
          opensOn: row.opensOn,
          closesOn: row.closesOn,
          detail: row.detail,
          sourceMeta: row.sourceMeta,
        },
      });
  }
};

const seedArtRecords = async (
  db: DbOrTx,
  plan: SeedPlan,
): Promise<void> => {
  for (const row of plan.artRecords) {
    await db
      .insert(artAuctionRecords)
      .values({
        externalRef: row.externalRef,
        provenance: row.provenance,
        artworkTitle: row.artworkTitle,
        auctionDate: row.auctionDate,
        auctionHouse: row.auctionHouse,
        medium: row.medium,
        widthCm: row.widthCm === null ? null : String(row.widthCm),
        heightCm: row.heightCm === null ? null : String(row.heightCm),
        currency: row.currency,
        normalizedPriceKrw: row.normalizedPriceKrw,
        result: row.result,
        sourceMeta: row.sourceMeta,
      })
      .onConflictDoUpdate({
        target: artAuctionRecords.externalRef,
        set: {
          provenance: row.provenance,
          artworkTitle: row.artworkTitle,
          auctionDate: row.auctionDate,
          auctionHouse: row.auctionHouse,
          medium: row.medium,
          widthCm: row.widthCm === null ? null : String(row.widthCm),
          heightCm: row.heightCm === null ? null : String(row.heightCm),
          currency: row.currency,
          normalizedPriceKrw: row.normalizedPriceKrw,
          result: row.result,
          sourceMeta: row.sourceMeta,
        },
      });
  }
};

const seedRag = async (
  db: DbOrTx,
  plan: SeedPlan,
): Promise<void> => {
  for (const seed of plan.ragDocuments) {
    const inserted = await db
      .insert(ragDocuments)
      .values(seed.document)
      .onConflictDoUpdate({
        target: ragDocuments.sourceId,
        set: {
          title: seed.document.title,
          url: seed.document.url,
          license: seed.document.license,
          retrievedOn: seed.document.retrievedOn,
          provenance: seed.document.provenance,
        },
      })
      .returning({ id: ragDocuments.id });
    const documentId = inserted[0]?.id;
    if (documentId === undefined) {
      console.warn(
        `[db:seed] rag 문서 ${seed.document.sourceId} id 회수 실패 — 청크 적재 건너뜀`,
      );
      continue;
    }
    for (const chunk of seed.chunks) {
      await db
        .insert(ragChunks)
        .values({
          documentId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: chunk.embedding,
        })
        .onConflictDoUpdate({
          target: [ragChunks.documentId, ragChunks.chunkIndex],
          set: { content: chunk.content, embedding: chunk.embedding },
        });
    }
  }
};

const pruneStaleSynthetic = async (
  db: DbOrTx,
  plan: SeedPlan,
): Promise<void> => {
  const slugs = syntheticOfferSlugs(plan);
  if (slugs.length > 0) {
    await db
      .delete(offeringsTable)
      .where(
        and(
          eq(offeringsTable.provenance, "synthetic"),
          notInArray(offeringsTable.offerSlug, [...slugs]),
        ),
      );
  }
  const refs = syntheticArtRefs(plan);
  if (refs.length > 0) {
    await db
      .delete(artAuctionRecords)
      .where(
        and(
          eq(artAuctionRecords.provenance, "synthetic"),
          notInArray(artAuctionRecords.externalRef, [...refs]),
        ),
      );
  }
};

const main = async (): Promise<void> => {
  const plan = await buildSeedPlan();

  assertSeedSourcePathsAllowed(plan.sourcePaths);
  assertSyntheticNamesClean(plan.syntheticNames);

  if (!directDatabaseUrl()) {
    console.log(
      "[db:seed] 원천 경로·synthetic 명칭 가드 통과. DATABASE_URL_DIRECT 미설정 — not_configured. 적재는 생략합니다 (file 모드).",
    );
    return;
  }

  const db = getDirectDb();
  await db.transaction((tx) => seedOfferings(tx, plan));
  await db.transaction((tx) => seedArtRecords(tx, plan));
  await db.transaction((tx) => seedRag(tx, plan));
  await db.transaction((tx) => pruneStaleSynthetic(tx, plan));

  console.log(
    `[db:seed] 완료 — offerings ${plan.offerings.length} · art_records ${plan.artRecords.length} · rag_docs ${plan.ragDocuments.length} (멱등 ON CONFLICT + 플랜 외 synthetic prune).`,
  );
};

main()
  .catch((error: unknown) => {
    console.error(
      `[db:seed] 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void closeConnections();
  });
