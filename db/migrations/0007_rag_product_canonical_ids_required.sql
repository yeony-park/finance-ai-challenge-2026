-- 신규/갱신 product 행에는 즉시 적용하고, 기존 행 검증은 full ingest 후 수행한다.
-- 이전 snapshot에서 철회된 행은 검색되지 않으므로 canonical ID가 없어도 보존한다.

ALTER TABLE rag_documents
  ADD CONSTRAINT rag_documents_product_canonical_id_required_check
    CHECK (
      scope_kind <> 'product' OR status = 'revoked' OR
      canonical_document_id IS NOT NULL
    ) NOT VALID;

ALTER TABLE rag_chunks
  ADD CONSTRAINT rag_chunks_product_canonical_id_required_check
    CHECK (
      scope_kind <> 'product' OR status = 'revoked' OR
      canonical_chunk_id IS NOT NULL
    ) NOT VALID;
