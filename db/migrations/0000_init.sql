-- R-STO-09 append-only 초기 마이그레이션. src/lib/db/schema.ts와 동형 유지(드리프트는 실 DB 발급 후 drizzle-kit generate로 검증).
-- 제약·유니크·FK 이름은 drizzle 자동 명명 규약과 일치시켜 drizzle-kit generate가 허위 rename을 내지 않게 한다.
-- 확장 생성은 테이블 DDL보다 먼저(vector/tsvector 컬럼·HNSW/GIN opclass 의존). pg_trgm은 R-STO-15 [팀 결정 대기]로 미포함.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE offerings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_slug text NOT NULL CONSTRAINT offerings_offer_slug_unique UNIQUE,
  category_id text NOT NULL,
  provenance text NOT NULL,
  title_public text NOT NULL,
  amount_won bigint,
  opens_on date,
  closes_on date,
  detail jsonb NOT NULL DEFAULT '{}',
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offerings_category_check CHECK (category_id IN ('cattle','pig','art','real-estate')),
  CONSTRAINT offerings_provenance_check CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  CONSTRAINT offerings_close_after_open_check CHECK (closes_on IS NULL OR opens_on IS NULL OR closes_on >= opens_on)
);
CREATE INDEX offerings_category_provenance_idx ON offerings (category_id, provenance);

CREATE TABLE art_auction_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_ref text NOT NULL CONSTRAINT art_auction_records_external_ref_unique UNIQUE,
  provenance text NOT NULL,
  artwork_title text NOT NULL,
  auction_date date NOT NULL,
  auction_house text NOT NULL,
  medium text,
  width_cm numeric(8,2),
  height_cm numeric(8,2),
  currency text NOT NULL,
  normalized_price_krw bigint,
  result text NOT NULL,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT art_auction_records_provenance_check CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  CONSTRAINT art_auction_records_result_check CHECK (result IN ('sold','unsold','withdrawn','unknown'))
);
CREATE INDEX art_auction_records_auction_date_idx ON art_auction_records (auction_date);

CREATE TABLE re_trades (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provenance text NOT NULL DEFAULT 'public_record',
  lawd_cd text NOT NULL,
  deal_ym text NOT NULL,
  building_use text,
  dong text,
  amount_won bigint NOT NULL,
  deal_on date NOT NULL,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT re_trades_provenance_check CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  CONSTRAINT re_trades_lawd_cd_check CHECK (lawd_cd ~ '^\d{5}$'),
  CONSTRAINT re_trades_deal_ym_check CHECK (deal_ym ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT re_trades_natural_key UNIQUE (lawd_cd, deal_ym, dong, deal_on, amount_won)
);
CREATE INDEX re_trades_lawd_deal_ym_idx ON re_trades (lawd_cd, deal_ym);

CREATE TABLE rag_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL CONSTRAINT rag_documents_source_id_unique UNIQUE,
  title text NOT NULL,
  url text,
  license text NOT NULL,
  retrieved_on date NOT NULL,
  provenance text NOT NULL DEFAULT 'public_record',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rag_documents_provenance_check CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  CONSTRAINT rag_documents_license_check CHECK (license IN ('green','yellow_confirmed'))
);

CREATE TABLE rag_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL CONSTRAINT rag_chunks_document_id_rag_documents_id_fk REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  CONSTRAINT rag_chunks_chunk_index_check CHECK (chunk_index >= 0),
  CONSTRAINT rag_chunks_document_chunk_key UNIQUE (document_id, chunk_index)
);
CREATE INDEX rag_chunks_document_id_idx ON rag_chunks (document_id);
CREATE INDEX rag_chunks_embedding_hnsw ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX rag_chunks_tsv_gin ON rag_chunks USING gin (tsv);
