import { closeConnections, getDirectDb, getDirectSql } from "../client";
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
  livestockDiseaseEvents,
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

const ingestLivestockDisease = async (
  db: DbOrTx,
  plan: IngestPlan,
): Promise<void> => {
  for (const row of plan.livestockDisease) {
    const values = {
      sourceEventId: row.sourceEventId,
      disease: row.disease,
      species: row.species,
      occurredOn: row.occurredOn,
      province: row.province,
      cityCounty: row.cityCounty,
      region: row.region,
      headCount: row.headCount,
      headCountBasis: row.headCountBasis,
      latitude: String(row.latitude),
      longitude: String(row.longitude),
      locationPrecision: row.locationPrecision,
      sourceUrl: row.sourceUrl,
      sourceMeta: row.sourceMeta,
    };
    await db
      .insert(livestockDiseaseEvents)
      .values(values)
      .onConflictDoUpdate({
        target: [
          livestockDiseaseEvents.disease,
          livestockDiseaseEvents.sourceEventId,
        ],
        set: values,
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
    "data/synthetic/art-investment.json",
  ]);

  const counts = `cattle ${plan.cattleAuction.length} · real_estate_trades ${plan.reTrades.length} · pig ${plan.pigAuction.length} · disease ${plan.livestockDisease.length} · filing_facts ${plan.filingFacts.length} · knowledge_docs ${knowledgePlan.documents.length} · knowledge_chunks ${knowledgePlan.chunks.length}`;

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
  const directSql = getDirectSql();
  await directSql`
    ALTER TABLE rag_documents
    VALIDATE CONSTRAINT rag_documents_product_canonical_id_required_check
  `;
  await directSql`
    ALTER TABLE rag_chunks
    VALIDATE CONSTRAINT rag_chunks_product_canonical_id_required_check
  `;
  await db.transaction((tx) => ingestCattle(tx, plan));
  await db.transaction((tx) => ingestReTrades(tx, plan));
  await db.transaction((tx) => ingestPig(tx, plan));
  await db.transaction((tx) => ingestLivestockDisease(tx, plan));
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
