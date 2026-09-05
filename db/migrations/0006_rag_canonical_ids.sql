-- RAG 조회 결과가 내부 bigint PK가 아닌 corpus의 정식 문서/청크 ID를 반환하도록 보존한다.
-- 기존 행을 먼저 허용한 뒤 seed/ingest로 백필하므로 온라인 적용 시 테이블 재작성은 없다.

ALTER TABLE rag_documents
  ADD COLUMN canonical_document_id text;

ALTER TABLE rag_chunks
  ADD COLUMN canonical_chunk_id text;

ALTER TABLE rag_documents
  ADD CONSTRAINT rag_documents_canonical_document_id_check
    CHECK (
      canonical_document_id IS NULL OR
      canonical_document_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'
    ) NOT VALID;

ALTER TABLE rag_chunks
  ADD CONSTRAINT rag_chunks_canonical_chunk_id_check
    CHECK (
      canonical_chunk_id IS NULL OR
      canonical_chunk_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$'
    ) NOT VALID;

ALTER TABLE rag_documents
  VALIDATE CONSTRAINT rag_documents_canonical_document_id_check;

ALTER TABLE rag_chunks
  VALIDATE CONSTRAINT rag_chunks_canonical_chunk_id_check;

CREATE UNIQUE INDEX rag_documents_product_canonical_id_key
  ON rag_documents (canonical_document_id)
  WHERE scope_kind = 'product' AND canonical_document_id IS NOT NULL;

CREATE UNIQUE INDEX rag_chunks_product_canonical_id_key
  ON rag_chunks (canonical_chunk_id)
  WHERE scope_kind = 'product' AND canonical_chunk_id IS NOT NULL;
