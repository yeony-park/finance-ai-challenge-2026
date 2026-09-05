-- Su PDF knowledge를 exact product scope로 저장하기 위한 append-only migration artifact.
-- legacy generic corpus는 scope_kind='generic' + NULL product scope로 보존한다.
-- 실제 적용 전 shared/staging 환경의 행 수·락 허용 시간을 확인해야 한다.
-- rollback 순서: chunk 신규 FK/index/constraints/columns -> document 신규 index/constraint/columns.

ALTER TABLE rag_documents
  ADD COLUMN scope_kind text,
  ADD COLUMN ingest_owner text,
  ADD COLUMN category_id text,
  ADD COLUMN product_id text,
  ADD COLUMN scenario_id text,
  ADD COLUMN data_nature text,
  ADD COLUMN source_kind text,
  ADD COLUMN source_url text,
  ADD COLUMN as_of date,
  ADD COLUMN source_hash text,
  ADD COLUMN approved_for_public boolean,
  ADD COLUMN approved_for_external_ai boolean DEFAULT false,
  ADD COLUMN pii_review_status text DEFAULT 'not-reviewed',
  ADD COLUMN status text,
  ADD COLUMN limitations text[];

ALTER TABLE rag_chunks
  ADD COLUMN scope_kind text,
  ADD COLUMN ingest_owner text,
  ADD COLUMN category_id text,
  ADD COLUMN product_id text,
  ADD COLUMN scenario_id text,
  ADD COLUMN data_nature text,
  ADD COLUMN source_kind text,
  ADD COLUMN source_url text,
  ADD COLUMN as_of date,
  ADD COLUMN source_hash text,
  ADD COLUMN approved_for_public boolean,
  ADD COLUMN approved_for_external_ai boolean DEFAULT false,
  ADD COLUMN pii_review_status text DEFAULT 'not-reviewed',
  ADD COLUMN status text,
  ADD COLUMN limitations text[],
  ADD COLUMN page integer,
  ADD COLUMN chunk_hash text,
  ADD COLUMN canonical_text text;

-- 기존 행에는 근거 없이 상품 provenance를 합성하지 않고 generic 구분값만 백필한다.
UPDATE rag_documents SET scope_kind = 'generic' WHERE scope_kind IS NULL;
UPDATE rag_chunks SET scope_kind = 'generic' WHERE scope_kind IS NULL;

ALTER TABLE rag_documents
  ALTER COLUMN scope_kind SET DEFAULT 'generic',
  ALTER COLUMN scope_kind SET NOT NULL,
  ADD COLUMN scope_key text GENERATED ALWAYS AS (
    scope_kind || ':' || coalesce(ingest_owner, '') || ':' || coalesce(category_id, '') || ':' || coalesce(product_id, '') || ':' ||
    coalesce(scenario_id, '') || ':' || coalesce(data_nature, '') || ':' || coalesce(source_kind, '')
  ) STORED;

ALTER TABLE rag_chunks
  ALTER COLUMN scope_kind SET DEFAULT 'generic',
  ALTER COLUMN scope_kind SET NOT NULL,
  ADD COLUMN scope_key text GENERATED ALWAYS AS (
    scope_kind || ':' || coalesce(ingest_owner, '') || ':' || coalesce(category_id, '') || ':' || coalesce(product_id, '') || ':' ||
    coalesce(scenario_id, '') || ':' || coalesce(data_nature, '') || ':' || coalesce(source_kind, '')
  ) STORED;

ALTER TABLE rag_documents
  ADD CONSTRAINT rag_documents_scope_kind_check
    CHECK (scope_kind IN ('generic','product')) NOT VALID,
  ADD CONSTRAINT rag_documents_category_check
    CHECK (category_id IS NULL OR category_id IN ('cattle','pig','art','real-estate')) NOT VALID,
  ADD CONSTRAINT rag_documents_ingest_owner_check
    CHECK (ingest_owner IS NULL OR ingest_owner ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$') NOT VALID,
  ADD CONSTRAINT rag_documents_data_nature_check
    CHECK (data_nature IS NULL OR data_nature IN ('observed','scenario')) NOT VALID,
  ADD CONSTRAINT rag_documents_product_id_check
    CHECK (product_id IS NULL OR product_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$') NOT VALID,
  ADD CONSTRAINT rag_documents_scenario_id_check
    CHECK (scenario_id IS NULL OR scenario_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$') NOT VALID,
  ADD CONSTRAINT rag_documents_source_kind_check
    CHECK (source_kind IS NULL OR source_kind IN ('issuer-claim','platform-claim','official-document','external-observation','scenario-input')) NOT VALID,
  ADD CONSTRAINT rag_documents_nature_source_check
    CHECK (
      data_nature IS NULL OR source_kind IS NULL OR
      (data_nature = 'scenario' AND source_kind = 'scenario-input') OR
      (data_nature = 'observed' AND source_kind <> 'scenario-input')
    ) NOT VALID,
  ADD CONSTRAINT rag_documents_observed_scenario_check
    CHECK (data_nature IS NULL OR data_nature <> 'observed' OR scenario_id IS NULL) NOT VALID,
  ADD CONSTRAINT rag_documents_scenario_scope_check
    CHECK (scope_kind <> 'product' OR data_nature <> 'scenario' OR scenario_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT rag_documents_status_check
    CHECK (status IS NULL OR status IN ('ready','partial','ocr_required','damaged','encrypted','failed','revoked')) NOT VALID,
  ADD CONSTRAINT rag_documents_source_hash_check
    CHECK (source_hash IS NULL OR source_hash ~ '^[a-f0-9]{64}$') NOT VALID,
  ADD CONSTRAINT rag_documents_pii_review_status_check
    CHECK (pii_review_status IS NULL OR pii_review_status IN ('passed','not-reviewed')) NOT VALID,
  ADD CONSTRAINT rag_documents_external_ai_gate_check
    CHECK (approved_for_external_ai IS DISTINCT FROM true OR pii_review_status IS NOT DISTINCT FROM 'passed') NOT VALID,
  ADD CONSTRAINT rag_documents_limitations_check
    CHECK (limitations IS NULL OR (cardinality(limitations) <= 100 AND array_position(limitations, NULL) IS NULL)) NOT VALID,
  ADD CONSTRAINT rag_documents_product_scope_check
    CHECK (
      (scope_kind = 'generic' AND ingest_owner IS NULL AND product_id IS NULL AND scenario_id IS NULL) OR
      (
        scope_kind = 'product' AND ingest_owner IS NOT NULL AND category_id IS NOT NULL AND
        product_id IS NOT NULL AND length(product_id) > 0 AND
        data_nature IS NOT NULL AND source_kind IS NOT NULL AND
        source_url IS NOT NULL AND length(source_url) > 0 AND
        as_of IS NOT NULL AND source_hash IS NOT NULL AND
        approved_for_public IS NOT NULL AND approved_for_external_ai IS NOT NULL AND
        pii_review_status IS NOT NULL AND status IS NOT NULL AND limitations IS NOT NULL
      )
    ) NOT VALID;

ALTER TABLE rag_chunks
  ADD CONSTRAINT rag_chunks_scope_kind_check
    CHECK (scope_kind IN ('generic','product')) NOT VALID,
  ADD CONSTRAINT rag_chunks_category_check
    CHECK (category_id IS NULL OR category_id IN ('cattle','pig','art','real-estate')) NOT VALID,
  ADD CONSTRAINT rag_chunks_ingest_owner_check
    CHECK (ingest_owner IS NULL OR ingest_owner ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$') NOT VALID,
  ADD CONSTRAINT rag_chunks_data_nature_check
    CHECK (data_nature IS NULL OR data_nature IN ('observed','scenario')) NOT VALID,
  ADD CONSTRAINT rag_chunks_product_id_check
    CHECK (product_id IS NULL OR product_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$') NOT VALID,
  ADD CONSTRAINT rag_chunks_scenario_id_check
    CHECK (scenario_id IS NULL OR scenario_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$') NOT VALID,
  ADD CONSTRAINT rag_chunks_source_kind_check
    CHECK (source_kind IS NULL OR source_kind IN ('issuer-claim','platform-claim','official-document','external-observation','scenario-input')) NOT VALID,
  ADD CONSTRAINT rag_chunks_nature_source_check
    CHECK (
      data_nature IS NULL OR source_kind IS NULL OR
      (data_nature = 'scenario' AND source_kind = 'scenario-input') OR
      (data_nature = 'observed' AND source_kind <> 'scenario-input')
    ) NOT VALID,
  ADD CONSTRAINT rag_chunks_observed_scenario_check
    CHECK (data_nature IS NULL OR data_nature <> 'observed' OR scenario_id IS NULL) NOT VALID,
  ADD CONSTRAINT rag_chunks_scenario_scope_check
    CHECK (scope_kind <> 'product' OR data_nature <> 'scenario' OR scenario_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT rag_chunks_status_check
    CHECK (status IS NULL OR status IN ('ready','ocr_required','revoked')) NOT VALID,
  ADD CONSTRAINT rag_chunks_source_hash_check
    CHECK (source_hash IS NULL OR source_hash ~ '^[a-f0-9]{64}$') NOT VALID,
  ADD CONSTRAINT rag_chunks_pii_review_status_check
    CHECK (pii_review_status IS NULL OR pii_review_status IN ('passed','not-reviewed')) NOT VALID,
  ADD CONSTRAINT rag_chunks_external_ai_gate_check
    CHECK (approved_for_external_ai IS DISTINCT FROM true OR pii_review_status IS NOT DISTINCT FROM 'passed') NOT VALID,
  ADD CONSTRAINT rag_chunks_chunk_hash_check
    CHECK (chunk_hash IS NULL OR chunk_hash ~ '^[a-f0-9]{64}$') NOT VALID,
  ADD CONSTRAINT rag_chunks_limitations_check
    CHECK (limitations IS NULL OR (cardinality(limitations) <= 100 AND array_position(limitations, NULL) IS NULL)) NOT VALID,
  ADD CONSTRAINT rag_chunks_product_scope_check
    CHECK (
      (scope_kind = 'generic' AND ingest_owner IS NULL AND product_id IS NULL AND scenario_id IS NULL) OR
      (
        scope_kind = 'product' AND ingest_owner IS NOT NULL AND category_id IS NOT NULL AND
        product_id IS NOT NULL AND length(product_id) > 0 AND
        data_nature IS NOT NULL AND source_kind IS NOT NULL AND
        source_url IS NOT NULL AND length(source_url) > 0 AND
        as_of IS NOT NULL AND source_hash IS NOT NULL AND
        approved_for_public IS NOT NULL AND approved_for_external_ai IS NOT NULL AND
        pii_review_status IS NOT NULL AND status IS NOT NULL AND limitations IS NOT NULL AND
        page IS NOT NULL AND page > 0 AND chunk_hash IS NOT NULL AND
        canonical_text IS NOT NULL AND length(canonical_text) > 0
      )
    ) NOT VALID;

ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_scope_kind_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_category_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_ingest_owner_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_data_nature_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_product_id_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_scenario_id_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_source_kind_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_nature_source_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_observed_scenario_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_scenario_scope_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_status_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_source_hash_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_pii_review_status_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_external_ai_gate_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_limitations_check;
ALTER TABLE rag_documents VALIDATE CONSTRAINT rag_documents_product_scope_check;

ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_scope_kind_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_category_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_ingest_owner_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_data_nature_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_product_id_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_scenario_id_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_source_kind_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_nature_source_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_observed_scenario_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_scenario_scope_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_status_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_source_hash_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_pii_review_status_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_external_ai_gate_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_chunk_hash_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_limitations_check;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_product_scope_check;

ALTER TABLE rag_documents
  ADD CONSTRAINT rag_documents_id_scope_key UNIQUE (id, scope_key);

ALTER TABLE rag_chunks
  ADD CONSTRAINT rag_chunks_document_scope_rag_documents_fk
  FOREIGN KEY (document_id, scope_key)
  REFERENCES rag_documents (id, scope_key)
  ON DELETE CASCADE
  NOT VALID;
ALTER TABLE rag_chunks VALIDATE CONSTRAINT rag_chunks_document_scope_rag_documents_fk;

CREATE INDEX rag_documents_product_scope_idx
  ON rag_documents (
    scope_kind, category_id, product_id, data_nature, scenario_id,
    approved_for_public, status
  )
  WHERE scope_kind = 'product';

CREATE INDEX rag_documents_ingest_owner_idx
  ON rag_documents (scope_kind, ingest_owner, source_id)
  WHERE scope_kind = 'product' AND ingest_owner IS NOT NULL;

CREATE INDEX rag_chunks_product_scope_idx
  ON rag_chunks (scope_kind, category_id, product_id, data_nature, scenario_id, document_id)
  WHERE scope_kind = 'product' AND approved_for_public = true AND status = 'ready';

CREATE INDEX rag_chunks_ingest_owner_idx
  ON rag_chunks (scope_kind, ingest_owner, document_id)
  WHERE scope_kind = 'product' AND ingest_owner IS NOT NULL;
