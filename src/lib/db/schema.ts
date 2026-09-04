import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  pgView,
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

// 런타임 계정은 원본 detail JSON 대신 검색·Copilot·미술품 공개 화면에
// 필요한 키만 투영한 뷰를 조회한다. 뷰 정의는 0005 migration과 함께 유지한다.
export const runtimePublicOfferings = pgView("runtime_public_offerings", {
  offerSlug: text("offer_slug").notNull(),
  categoryId: text("category_id").notNull(),
  provenance: text("provenance").notNull(),
  titlePublic: text("title_public").notNull(),
  amountWon: bigint("amount_won", { mode: "number" }),
  opensOn: date("opens_on"),
  closesOn: date("closes_on"),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull(),
  sourceMeta: jsonb("source_meta").$type<Record<string, unknown>>().notNull(),
}).existing();

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
  "real_estate_trades",
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
    provenanceCheck(t.provenance, "real_estate_trades_provenance_check"),
    check("real_estate_trades_lawd_cd_check", sql`${t.lawdCd} ~ '^\\d{5}$'`),
    check(
      "real_estate_trades_deal_ym_check",
      sql`${t.dealYm} ~ '^\\d{4}-(0[1-9]|1[0-2])$'`,
    ),
    unique("real_estate_trades_natural_key")
      .on(t.lawdCd, t.dealYm, t.dong, t.dealOn, t.amountWon)
      .nullsNotDistinct(),
    index("real_estate_trades_lawd_deal_ym_idx").on(t.lawdCd, t.dealYm),
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
    scopeKind: text("scope_kind").notNull().default("generic"),
    ingestOwner: text("ingest_owner"),
    categoryId: text("category_id"),
    productId: text("product_id"),
    scenarioId: text("scenario_id"),
    dataNature: text("data_nature"),
    sourceKind: text("source_kind"),
    sourceUrl: text("source_url"),
    asOf: date("as_of"),
    sourceHash: text("source_hash"),
    approvedForPublic: boolean("approved_for_public"),
    approvedForExternalAi: boolean("approved_for_external_ai").default(false),
    piiReviewStatus: text("pii_review_status").default("not-reviewed"),
    status: text("status"),
    limitations: text("limitations").array(),
    scopeKey: text("scope_key").generatedAlwaysAs(
      sql`scope_kind || ':' || coalesce(ingest_owner, '') || ':' || coalesce(category_id, '') || ':' || coalesce(product_id, '') || ':' || coalesce(scenario_id, '') || ':' || coalesce(data_nature, '') || ':' || coalesce(source_kind, '')`,
    ),
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
    check(
      "rag_documents_scope_kind_check",
      sql`${t.scopeKind} in ('generic','product')`,
    ),
    check(
      "rag_documents_category_check",
      sql`${t.categoryId} is null or ${t.categoryId} in ('cattle','pig','art','real-estate')`,
    ),
    check(
      "rag_documents_ingest_owner_check",
      sql`${t.ingestOwner} is null or ${t.ingestOwner} ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'`,
    ),
    check(
      "rag_documents_data_nature_check",
      sql`${t.dataNature} is null or ${t.dataNature} in ('observed','scenario')`,
    ),
    check(
      "rag_documents_product_id_check",
      sql`${t.productId} is null or ${t.productId} ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'`,
    ),
    check(
      "rag_documents_scenario_id_check",
      sql`${t.scenarioId} is null or ${t.scenarioId} ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'`,
    ),
    check(
      "rag_documents_source_kind_check",
      sql`${t.sourceKind} is null or ${t.sourceKind} in ('issuer-claim','platform-claim','official-document','external-observation','scenario-input')`,
    ),
    check(
      "rag_documents_nature_source_check",
      sql`${t.dataNature} is null or ${t.sourceKind} is null or (${t.dataNature} = 'scenario' and ${t.sourceKind} = 'scenario-input') or (${t.dataNature} = 'observed' and ${t.sourceKind} <> 'scenario-input')`,
    ),
    check(
      "rag_documents_observed_scenario_check",
      sql`${t.dataNature} is null or ${t.dataNature} <> 'observed' or ${t.scenarioId} is null`,
    ),
    check(
      "rag_documents_scenario_scope_check",
      sql`${t.scopeKind} <> 'product' or ${t.dataNature} <> 'scenario' or ${t.scenarioId} is not null`,
    ),
    check(
      "rag_documents_status_check",
      sql`${t.status} is null or ${t.status} in ('ready','partial','ocr_required','damaged','encrypted','failed','revoked')`,
    ),
    check(
      "rag_documents_source_hash_check",
      sql`${t.sourceHash} is null or ${t.sourceHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "rag_documents_pii_review_status_check",
      sql`${t.piiReviewStatus} is null or ${t.piiReviewStatus} in ('passed','not-reviewed')`,
    ),
    check(
      "rag_documents_external_ai_gate_check",
      sql`${t.approvedForExternalAi} is distinct from true or ${t.piiReviewStatus} is not distinct from 'passed'`,
    ),
    check(
      "rag_documents_limitations_check",
      sql`${t.limitations} is null or (cardinality(${t.limitations}) <= 100 and array_position(${t.limitations}, null) is null)`,
    ),
    check(
      "rag_documents_product_scope_check",
      sql`(${t.scopeKind} = 'generic' and ${t.ingestOwner} is null and ${t.productId} is null and ${t.scenarioId} is null) or (${t.scopeKind} = 'product' and ${t.ingestOwner} is not null and ${t.categoryId} is not null and ${t.productId} is not null and length(${t.productId}) > 0 and ${t.dataNature} is not null and ${t.sourceKind} is not null and ${t.sourceUrl} is not null and length(${t.sourceUrl}) > 0 and ${t.asOf} is not null and ${t.sourceHash} is not null and ${t.approvedForPublic} is not null and ${t.approvedForExternalAi} is not null and ${t.piiReviewStatus} is not null and ${t.status} is not null and ${t.limitations} is not null)`,
    ),
    unique("rag_documents_id_scope_key").on(t.id, t.scopeKey),
    index("rag_documents_product_scope_idx")
      .on(
        t.scopeKind,
        t.categoryId,
        t.productId,
        t.dataNature,
        t.scenarioId,
        t.approvedForPublic,
        t.status,
      )
      .where(sql`${t.scopeKind} = 'product'`),
    index("rag_documents_ingest_owner_idx")
      .on(t.scopeKind, t.ingestOwner, t.sourceId)
      .where(sql`${t.scopeKind} = 'product' and ${t.ingestOwner} is not null`),
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
    scopeKind: text("scope_kind").notNull().default("generic"),
    ingestOwner: text("ingest_owner"),
    categoryId: text("category_id"),
    productId: text("product_id"),
    scenarioId: text("scenario_id"),
    dataNature: text("data_nature"),
    sourceKind: text("source_kind"),
    sourceUrl: text("source_url"),
    asOf: date("as_of"),
    sourceHash: text("source_hash"),
    approvedForPublic: boolean("approved_for_public"),
    approvedForExternalAi: boolean("approved_for_external_ai").default(false),
    piiReviewStatus: text("pii_review_status").default("not-reviewed"),
    status: text("status"),
    limitations: text("limitations").array(),
    page: integer("page"),
    chunkHash: text("chunk_hash"),
    canonicalText: text("canonical_text"),
    scopeKey: text("scope_key").generatedAlwaysAs(
      sql`scope_kind || ':' || coalesce(ingest_owner, '') || ':' || coalesce(category_id, '') || ':' || coalesce(product_id, '') || ':' || coalesce(scenario_id, '') || ':' || coalesce(data_nature, '') || ':' || coalesce(source_kind, '')`,
    ),
    embedding: vector("embedding", { dimensions: 1536 }),
    tsv: tsvector("tsv").generatedAlwaysAs(
      sql`to_tsvector('simple', content)`,
    ),
  },
  (t) => [
    check("rag_chunks_chunk_index_check", sql`${t.chunkIndex} >= 0`),
    check(
      "rag_chunks_scope_kind_check",
      sql`${t.scopeKind} in ('generic','product')`,
    ),
    check(
      "rag_chunks_category_check",
      sql`${t.categoryId} is null or ${t.categoryId} in ('cattle','pig','art','real-estate')`,
    ),
    check(
      "rag_chunks_ingest_owner_check",
      sql`${t.ingestOwner} is null or ${t.ingestOwner} ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'`,
    ),
    check(
      "rag_chunks_data_nature_check",
      sql`${t.dataNature} is null or ${t.dataNature} in ('observed','scenario')`,
    ),
    check(
      "rag_chunks_product_id_check",
      sql`${t.productId} is null or ${t.productId} ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'`,
    ),
    check(
      "rag_chunks_scenario_id_check",
      sql`${t.scenarioId} is null or ${t.scenarioId} ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'`,
    ),
    check(
      "rag_chunks_source_kind_check",
      sql`${t.sourceKind} is null or ${t.sourceKind} in ('issuer-claim','platform-claim','official-document','external-observation','scenario-input')`,
    ),
    check(
      "rag_chunks_nature_source_check",
      sql`${t.dataNature} is null or ${t.sourceKind} is null or (${t.dataNature} = 'scenario' and ${t.sourceKind} = 'scenario-input') or (${t.dataNature} = 'observed' and ${t.sourceKind} <> 'scenario-input')`,
    ),
    check(
      "rag_chunks_observed_scenario_check",
      sql`${t.dataNature} is null or ${t.dataNature} <> 'observed' or ${t.scenarioId} is null`,
    ),
    check(
      "rag_chunks_scenario_scope_check",
      sql`${t.scopeKind} <> 'product' or ${t.dataNature} <> 'scenario' or ${t.scenarioId} is not null`,
    ),
    check(
      "rag_chunks_status_check",
      sql`${t.status} is null or ${t.status} in ('ready','ocr_required','revoked')`,
    ),
    check(
      "rag_chunks_source_hash_check",
      sql`${t.sourceHash} is null or ${t.sourceHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "rag_chunks_pii_review_status_check",
      sql`${t.piiReviewStatus} is null or ${t.piiReviewStatus} in ('passed','not-reviewed')`,
    ),
    check(
      "rag_chunks_external_ai_gate_check",
      sql`${t.approvedForExternalAi} is distinct from true or ${t.piiReviewStatus} is not distinct from 'passed'`,
    ),
    check(
      "rag_chunks_chunk_hash_check",
      sql`${t.chunkHash} is null or ${t.chunkHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "rag_chunks_limitations_check",
      sql`${t.limitations} is null or (cardinality(${t.limitations}) <= 100 and array_position(${t.limitations}, null) is null)`,
    ),
    check(
      "rag_chunks_product_scope_check",
      sql`(${t.scopeKind} = 'generic' and ${t.ingestOwner} is null and ${t.productId} is null and ${t.scenarioId} is null) or (${t.scopeKind} = 'product' and ${t.ingestOwner} is not null and ${t.categoryId} is not null and ${t.productId} is not null and length(${t.productId}) > 0 and ${t.dataNature} is not null and ${t.sourceKind} is not null and ${t.sourceUrl} is not null and length(${t.sourceUrl}) > 0 and ${t.asOf} is not null and ${t.sourceHash} is not null and ${t.approvedForPublic} is not null and ${t.approvedForExternalAi} is not null and ${t.piiReviewStatus} is not null and ${t.status} is not null and ${t.limitations} is not null and ${t.page} is not null and ${t.page} > 0 and ${t.chunkHash} is not null and ${t.canonicalText} is not null and length(${t.canonicalText}) > 0)`,
    ),
    unique("rag_chunks_document_chunk_key").on(t.documentId, t.chunkIndex),
    foreignKey({
      name: "rag_chunks_document_scope_rag_documents_fk",
      columns: [t.documentId, t.scopeKey],
      foreignColumns: [ragDocuments.id, ragDocuments.scopeKey],
    }).onDelete("cascade"),
    index("rag_chunks_document_id_idx").on(t.documentId),
    index("rag_chunks_product_scope_idx")
      .on(
        t.scopeKind,
        t.categoryId,
        t.productId,
        t.dataNature,
        t.scenarioId,
        t.documentId,
      )
      .where(
        sql`${t.scopeKind} = 'product' and ${t.approvedForPublic} = true and ${t.status} = 'ready'`,
      ),
    index("rag_chunks_ingest_owner_idx")
      .on(t.scopeKind, t.ingestOwner, t.documentId)
      .where(sql`${t.scopeKind} = 'product' and ${t.ingestOwner} is not null`),
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
    pricePerKg: numeric("price_won_per_kg", { precision: 12, scale: 2 }),
    headCount: integer("head_count"),
    avgPricePerKg: numeric("avg_price_won_per_kg", { precision: 12, scale: 2 }),
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
