import { sql } from "drizzle-orm";
import {
  bigint,
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
    unique("re_trades_natural_key").on(
      t.lawdCd,
      t.dealYm,
      t.dong,
      t.dealOn,
      t.amountWon,
    ),
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
