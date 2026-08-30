import { closeConnections, getDirectDb } from "../client";
import { directDatabaseUrl } from "../env";
import { buildIngestPlan, type IngestPlan } from "../ingest/build";
import { buildKnowledgeIngestPlan } from "../ingest/knowledge";
import { loadManifestIndex } from "../ingest/manifest";
import {
  KNOWLEDGE_FULL_SNAPSHOT,
  createDrizzleKnowledgeWriteExecutor,
  writeKnowledgeIngestPlan,
} from "../ingest/write-knowledge";
import {
  cattleAuctionPrices,
  offeringFilingFacts,
  pigAuctionPrices,
  reTrades,
} from "../schema";
import { assertSeedSourcePathsAllowed } from "../seed/guards";

type Db = ReturnType<typeof getDirectDb>;
type DbOrTx = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const numeric = (value: number | null): string | null =>
  value === null ? null : String(value);

const ingestCattle = async (db: DbOrTx, plan: IngestPlan): Promise<void> => {
  for (const row of plan.cattleAuction) {
    await db
      .insert(cattleAuctionPrices)
      .values({
        month: row.month,
        breedCd: row.breedCd,
        sexCd: row.sexCd,
        gradeCd: row.gradeCd,
        pricePerKg: numeric(row.pricePerKg),
        headCount: row.headCount,
        avgPricePerKg: numeric(row.avgPricePerKg),
        sampleSize: row.sampleSize,
        partial: row.partial,
        sourceMeta: row.sourceMeta,
      })
      .onConflictDoUpdate({
        target: [
          cattleAuctionPrices.month,
          cattleAuctionPrices.breedCd,
          cattleAuctionPrices.sexCd,
          cattleAuctionPrices.gradeCd,
        ],
        set: {
          pricePerKg: numeric(row.pricePerKg),
          headCount: row.headCount,
          avgPricePerKg: numeric(row.avgPricePerKg),
          sampleSize: row.sampleSize,
          partial: row.partial,
          sourceMeta: row.sourceMeta,
        },
      });
  }
};

const ingestReTrades = async (db: DbOrTx, plan: IngestPlan): Promise<void> => {
  for (const row of plan.reTrades) {
    const values = {
      provenance: row.provenance,
      lawdCd: row.lawdCd,
      dealYm: row.dealYm,
      buildingUse: row.buildingUse,
      dong: row.dong,
      amountWon: row.amountWon,
      dealOn: row.dealOn,
      buildingType: row.buildingType,
      floor: row.floor,
      buildingAreaSqm: numeric(row.buildingAreaSqm),
      landAreaSqm: numeric(row.landAreaSqm),
      buildYear: row.buildYear,
      cancelled: row.cancelled,
      sourceMeta: row.sourceMeta,
    };
    await db
      .insert(reTrades)
      .values(values)
      .onConflictDoUpdate({
        target: [
          reTrades.lawdCd,
          reTrades.dealYm,
          reTrades.dong,
          reTrades.dealOn,
          reTrades.amountWon,
        ],
        set: {
          buildingUse: values.buildingUse,
          buildingType: values.buildingType,
          floor: values.floor,
          buildingAreaSqm: values.buildingAreaSqm,
          landAreaSqm: values.landAreaSqm,
          buildYear: values.buildYear,
          cancelled: values.cancelled,
          sourceMeta: values.sourceMeta,
        },
      });
  }
};

const ingestPig = async (db: DbOrTx, plan: IngestPlan): Promise<void> => {
  for (const row of plan.pigAuction) {
    await db
      .insert(pigAuctionPrices)
      .values({
        month: row.month,
        skinType: row.skinType,
        sex: row.sex,
        grade: row.grade,
        region: row.region,
        headCount: row.headCount,
        priceWonPerKg: numeric(row.priceWonPerKg),
        amountWon: row.amountWon,
        weightKg: row.weightKg,
        sourceMeta: row.sourceMeta,
      })
      .onConflictDoUpdate({
        target: [
          pigAuctionPrices.month,
          pigAuctionPrices.skinType,
          pigAuctionPrices.sex,
          pigAuctionPrices.grade,
          pigAuctionPrices.region,
        ],
        set: {
          headCount: row.headCount,
          priceWonPerKg: numeric(row.priceWonPerKg),
          amountWon: row.amountWon,
          weightKg: row.weightKg,
          sourceMeta: row.sourceMeta,
        },
      });
  }
};

const ingestFilingFacts = async (db: DbOrTx, plan: IngestPlan): Promise<void> => {
  for (const row of plan.filingFacts) {
    await db
      .insert(offeringFilingFacts)
      .values(row)
      .onConflictDoUpdate({
        target: [
          offeringFilingFacts.offerSlug,
          offeringFilingFacts.rcpNo,
          offeringFilingFacts.factId,
        ],
        set: {
          submittedOn: row.submittedOn,
          label: row.label,
          value: row.value,
          section: row.section,
          short: row.short,
          sourceMeta: row.sourceMeta,
        },
      });
  }
};

const main = async (): Promise<void> => {
  const [index, knowledgePlan] = await Promise.all([
    loadManifestIndex(),
    buildKnowledgeIngestPlan("data"),
  ]);
  const plan = await buildIngestPlan("data", index);

  assertSeedSourcePathsAllowed([
    ...plan.sourcePaths,
    "data/knowledge/generated/index.json",
    "data/knowledge/documents",
    "data/knowledge/chunks",
    "data/scenarios/real-estate",
  ]);

  const counts = `cattle ${plan.cattleAuction.length} · re_trades ${plan.reTrades.length} · pig ${plan.pigAuction.length} · filing_facts ${plan.filingFacts.length} · knowledge_docs ${knowledgePlan.documents.length} · knowledge_chunks ${knowledgePlan.chunks.length}`;

  if (!directDatabaseUrl()) {
    console.log(
      `[db:ingest] 원천 경로 가드 통과 (${counts}). DATABASE_URL_DIRECT 미설정 — not_configured. 적재 생략 (file 모드).`,
    );
    return;
  }

  const db = getDirectDb();
  await writeKnowledgeIngestPlan(
    knowledgePlan,
    createDrizzleKnowledgeWriteExecutor(db),
    KNOWLEDGE_FULL_SNAPSHOT,
  );
  await db.transaction((tx) => ingestCattle(tx, plan));
  await db.transaction((tx) => ingestReTrades(tx, plan));
  await db.transaction((tx) => ingestPig(tx, plan));
  await db.transaction((tx) => ingestFilingFacts(tx, plan));
  console.log(`[db:ingest] 완료 — ${counts} (멱등 자연키 ON CONFLICT).`);
};

main()
  .catch((error: unknown) => {
    console.error(
      `[db:ingest] 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void closeConnections();
  });
