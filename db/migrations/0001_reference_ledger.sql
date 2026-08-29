-- R-STO-09 append-only. 0000_init.sql 수정 금지 — re_trades 확장은 ALTER, 신규 원장/이력은 CREATE.
-- src/lib/db/schema.ts와 동형 유지(drizzle-kit generate 무-diff 대조는 worklog db-layer.md 기록).
-- 09 §3.5(참조 원장 통합표) + §5(Run Ledger) 기준.

ALTER TABLE re_trades
  ADD COLUMN building_type text,
  ADD COLUMN floor integer,
  ADD COLUMN building_area_sqm numeric(12,2),
  ADD COLUMN land_area_sqm numeric(12,2),
  ADD COLUMN build_year integer,
  ADD COLUMN cancelled boolean NOT NULL DEFAULT false;

CREATE TABLE cattle_auction_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month text NOT NULL,
  breed_cd text NOT NULL,
  sex_cd text NOT NULL,
  grade_cd text NOT NULL,
  price_per_kg numeric(12,2),
  head_count integer,
  avg_price_per_kg numeric(12,2),
  sample_size integer,
  partial boolean NOT NULL DEFAULT false,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cattle_auction_prices_natural_key UNIQUE (month, breed_cd, sex_cd, grade_cd)
);
CREATE INDEX cattle_auction_prices_month_idx ON cattle_auction_prices (month);

CREATE TABLE pig_auction_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month text NOT NULL,
  skin_type text NOT NULL,
  sex text NOT NULL,
  grade text NOT NULL,
  region text NOT NULL,
  head_count integer,
  price_won_per_kg numeric(12,2),
  amount_won bigint,
  weight_kg bigint,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pig_auction_prices_natural_key UNIQUE (month, skin_type, sex, grade, region)
);
CREATE INDEX pig_auction_prices_month_idx ON pig_auction_prices (month);

CREATE TABLE offering_filing_facts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_slug text NOT NULL,
  rcp_no text NOT NULL,
  submitted_on text NOT NULL,
  fact_id text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  section text NOT NULL,
  short text,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offering_filing_facts_natural_key UNIQUE (offer_slug, rcp_no, fact_id)
);
CREATE INDEX offering_filing_facts_offer_slug_idx ON offering_filing_facts (offer_slug);

CREATE TABLE verification_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_key text NOT NULL CONSTRAINT verification_runs_run_key_unique UNIQUE,
  offer_slug text NOT NULL,
  rcp_no text,
  trigger text NOT NULL,
  mode text NOT NULL,
  extraction_mode text,
  generated_at timestamptz NOT NULL,
  status text NOT NULL,
  verdict_counts jsonb NOT NULL DEFAULT '{}',
  source_ids text[] NOT NULL DEFAULT '{}',
  artifact_name text,
  artifact_sha256 text,
  ledger_calls integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_runs_trigger_check CHECK (trigger IN ('cli','cron','api')),
  CONSTRAINT verification_runs_mode_check CHECK (mode IN ('fake','live','snapshot')),
  CONSTRAINT verification_runs_status_check CHECK (status IN ('ok','failed','degraded'))
);
CREATE INDEX verification_runs_offer_generated_idx ON verification_runs (offer_slug, generated_at);
CREATE INDEX verification_runs_trigger_created_idx ON verification_runs (trigger, created_at);

CREATE TABLE monitor_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at timestamptz NOT NULL CONSTRAINT monitor_runs_checked_at_unique UNIQUE,
  source text NOT NULL,
  event_counts jsonb NOT NULL DEFAULT '{}',
  blob_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE monitor_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  monitor_run_id bigint NOT NULL CONSTRAINT monitor_events_monitor_run_id_monitor_runs_id_fk REFERENCES monitor_runs(id) ON DELETE CASCADE,
  offer_slug text NOT NULL,
  kind text NOT NULL,
  base_rcp_no text,
  checked_through text,
  amendment_rcp_nos text[] NOT NULL DEFAULT '{}',
  CONSTRAINT monitor_events_kind_check CHECK (kind IN ('no_amendment','amendment_detected','detection_failed'))
);
CREATE INDEX monitor_events_offer_kind_idx ON monitor_events (offer_slug, kind);

CREATE TABLE ledger_observations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id text NOT NULL,
  subject_key text NOT NULL,
  source_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  subject_exists boolean,
  fields jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT ledger_observations_category_check CHECK (category_id IN ('cattle','pig','art','real-estate')),
  CONSTRAINT ledger_observations_natural_key UNIQUE (subject_key, source_id, observed_at)
);
CREATE INDEX ledger_observations_subject_observed_idx ON ledger_observations (subject_key, observed_at);
