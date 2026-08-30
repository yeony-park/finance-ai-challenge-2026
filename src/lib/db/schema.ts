import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

const provenanceCheck = (column: unknown, name: string) =>
  check(
    name,
    sql`${column} in ('public_record','manual_verified','synthetic')`,
  );

export const offerings = pgTable(
  "offerings",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    offerSlug: text("offer_slug").notNull().unique(),
    categoryId: text("category_id").notNull(),
    provenance: text("provenance").notNull(),
    titlePublic: text("title_public").notNull(),
    amountWon: bigint("amount_won", { mode: "number" }),
    opensOn: date("opens_on"),
    closesOn: date("closes_on"),
    detail: jsonb("detail")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "offerings_category_check",
      sql`${t.categoryId} in ('cattle','pig','art','real-estate')`,
    ),
    provenanceCheck(t.provenance, "offerings_provenance_check"),
    check(
      "offerings_close_after_open_check",
      sql`${t.closesOn} is null or ${t.opensOn} is null or ${t.closesOn} >= ${t.opensOn}`,
    ),
    index("offerings_category_provenance_idx").on(t.categoryId, t.provenance),
  ],
);

export const artAuctionRecords = pgTable(
  "art_auction_records",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    externalRef: text("external_ref").notNull().unique(),
    provenance: text("provenance").notNull(),
    artworkTitle: text("artwork_title").notNull(),
    auctionDate: date("auction_date").notNull(),
    auctionHouse: text("auction_house").notNull(),
    medium: text("medium"),
    widthCm: numeric("width_cm", { precision: 8, scale: 2 }),
    heightCm: numeric("height_cm", { precision: 8, scale: 2 }),
    currency: text("currency").notNull(),
    normalizedPriceKrw: bigint("normalized_price_krw", { mode: "number" }),
    result: text("result").notNull(),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    provenanceCheck(t.provenance, "art_auction_records_provenance_check"),
    check(
      "art_auction_records_result_check",
      sql`${t.result} in ('sold','unsold','withdrawn','unknown')`,
    ),
    index("art_auction_records_auction_date_idx").on(t.auctionDate),
  ],
);

export const reTrades = pgTable(
  "re_trades",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    provenance: text("provenance").notNull().default("public_record"),
    lawdCd: text("lawd_cd").notNull(),
    dealYm: text("deal_ym").notNull(),
    buildingUse: text("building_use"),
    dong: text("dong"),
    amountWon: bigint("amount_won", { mode: "number" }).notNull(),
    dealOn: date("deal_on").notNull(),
    buildingType: text("building_type"),
    floor: integer("floor"),
    buildingAreaSqm: numeric("building_area_sqm", { precision: 12, scale: 2 }),
    landAreaSqm: numeric("land_area_sqm", { precision: 12, scale: 2 }),
    buildYear: integer("build_year"),
    cancelled: boolean("cancelled").notNull().default(false),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    provenanceCheck(t.provenance, "re_trades_provenance_check"),
    check("re_trades_lawd_cd_check", sql`${t.lawdCd} ~ '^\\d{5}$'`),
    check(
      "re_trades_deal_ym_check",
      sql`${t.dealYm} ~ '^\\d{4}-(0[1-9]|1[0-2])$'`,
    ),
    unique("re_trades_natural_key")
      .on(t.lawdCd, t.dealYm, t.dong, t.dealOn, t.amountWon)
      .nullsNotDistinct(),
    index("re_trades_lawd_deal_ym_idx").on(t.lawdCd, t.dealYm),
  ],
);

export const ragDocuments = pgTable(
  "rag_documents",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    sourceId: text("source_id").notNull().unique(),
    title: text("title").notNull(),
    url: text("url"),
    license: text("license").notNull(),
    retrievedOn: date("retrieved_on").notNull(),
    provenance: text("provenance").notNull().default("public_record"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    provenanceCheck(t.provenance, "rag_documents_provenance_check"),
    check(
      "rag_documents_license_check",
      sql`${t.license} in ('green','yellow_confirmed')`,
    ),
  ],
);

export const ragChunks = pgTable(
  "rag_chunks",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    documentId: bigint("document_id", { mode: "bigint" })
      .notNull()
      .references(() => ragDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    tsv: tsvector("tsv").generatedAlwaysAs(
      sql`to_tsvector('simple', content)`,
    ),
  },
  (t) => [
    check("rag_chunks_chunk_index_check", sql`${t.chunkIndex} >= 0`),
    unique("rag_chunks_document_chunk_key").on(t.documentId, t.chunkIndex),
    index("rag_chunks_document_id_idx").on(t.documentId),
    index("rag_chunks_embedding_hnsw").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
    index("rag_chunks_tsv_gin").using("gin", t.tsv),
  ],
);

export const cattleAuctionPrices = pgTable(
  "cattle_auction_prices",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    month: text("month").notNull(),
    breedCd: text("breed_cd").notNull(),
    sexCd: text("sex_cd").notNull(),
    gradeCd: text("grade_cd").notNull(),
    pricePerKg: numeric("price_per_kg", { precision: 12, scale: 2 }),
    headCount: integer("head_count"),
    avgPricePerKg: numeric("avg_price_per_kg", { precision: 12, scale: 2 }),
    sampleSize: integer("sample_size"),
    partial: boolean("partial").notNull().default(false),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("cattle_auction_prices_natural_key").on(
      t.month,
      t.breedCd,
      t.sexCd,
      t.gradeCd,
    ),
    index("cattle_auction_prices_month_idx").on(t.month),
  ],
);

export const pigAuctionPrices = pgTable(
  "pig_auction_prices",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    month: text("month").notNull(),
    skinType: text("skin_type").notNull(),
    sex: text("sex").notNull(),
    grade: text("grade").notNull(),
    region: text("region").notNull(),
    headCount: integer("head_count"),
    priceWonPerKg: numeric("price_won_per_kg", { precision: 12, scale: 2 }),
    amountWon: bigint("amount_won", { mode: "number" }),
    weightKg: bigint("weight_kg", { mode: "number" }),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("pig_auction_prices_natural_key").on(
      t.month,
      t.skinType,
      t.sex,
      t.grade,
      t.region,
    ),
    index("pig_auction_prices_month_idx").on(t.month),
  ],
);

export const offeringFilingFacts = pgTable(
  "offering_filing_facts",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    offerSlug: text("offer_slug").notNull(),
    rcpNo: text("rcp_no").notNull(),
    submittedOn: text("submitted_on").notNull(),
    factId: text("fact_id").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    section: text("section").notNull(),
    short: text("short"),
    sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("offering_filing_facts_natural_key").on(
      t.offerSlug,
      t.rcpNo,
      t.factId,
    ),
    index("offering_filing_facts_offer_slug_idx").on(t.offerSlug),
  ],
);

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    runKey: text("run_key").notNull().unique(),
    offerSlug: text("offer_slug").notNull(),
    rcpNo: text("rcp_no"),
    trigger: text("trigger").notNull(),
    mode: text("mode").notNull(),
    extractionMode: text("extraction_mode"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
    verdictCounts: jsonb("verdict_counts")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    sourceIds: text("source_ids").array().notNull().default([]),
    artifactName: text("artifact_name"),
    artifactSha256: text("artifact_sha256"),
    ledgerCalls: integer("ledger_calls"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "verification_runs_trigger_check",
      sql`${t.trigger} in ('cli','cron','api')`,
    ),
    check(
      "verification_runs_mode_check",
      sql`${t.mode} in ('fake','live','snapshot')`,
    ),
    check(
      "verification_runs_status_check",
      sql`${t.status} in ('ok','failed','degraded')`,
    ),
    index("verification_runs_offer_generated_idx").on(
      t.offerSlug,
      t.generatedAt,
    ),
    index("verification_runs_trigger_created_idx").on(t.trigger, t.createdAt),
  ],
);

export const monitorRuns = pgTable(
  "monitor_runs",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().unique(),
    source: text("source").notNull(),
    eventCounts: jsonb("event_counts")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    blobKey: text("blob_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const monitorEvents = pgTable(
  "monitor_events",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    monitorRunId: bigint("monitor_run_id", { mode: "bigint" })
      .notNull()
      .references(() => monitorRuns.id, { onDelete: "cascade" }),
    offerSlug: text("offer_slug").notNull(),
    kind: text("kind").notNull(),
    baseRcpNo: text("base_rcp_no"),
    checkedThrough: text("checked_through"),
    amendmentRcpNos: text("amendment_rcp_nos").array().notNull().default([]),
  },
  (t) => [
    check(
      "monitor_events_kind_check",
      sql`${t.kind} in ('no_amendment','amendment_detected','detection_failed')`,
    ),
    index("monitor_events_monitor_run_id_idx").on(t.monitorRunId),
    index("monitor_events_offer_kind_idx").on(t.offerSlug, t.kind),
  ],
);

export const ledgerObservations = pgTable(
  "ledger_observations",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().generatedAlwaysAsIdentity(),
    categoryId: text("category_id").notNull(),
    subjectKey: text("subject_key").notNull(),
    sourceId: text("source_id").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    subjectExists: boolean("subject_exists"),
    fields: jsonb("fields")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (t) => [
    check(
      "ledger_observations_category_check",
      sql`${t.categoryId} in ('cattle','pig','art','real-estate')`,
    ),
    unique("ledger_observations_natural_key").on(
      t.subjectKey,
      t.sourceId,
      t.observedAt,
    ),
    index("ledger_observations_subject_observed_idx").on(
      t.subjectKey,
      t.observedAt,
    ),
  ],
);
