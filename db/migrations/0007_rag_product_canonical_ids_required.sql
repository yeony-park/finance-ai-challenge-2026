-- 0006 적용 후 seed/ingest로 백필된 product corpus의 정식 ID를 필수로 고정한다.

ALTER TABLE rag_documents
  ADD CONSTRAINT rag_documents_product_canonical_id_required_check
    CHECK (scope_kind <> 'product' OR canonical_document_id IS NOT NULL) NOT VALID;

ALTER TABLE rag_chunks
  ADD CONSTRAINT rag_chunks_product_canonical_id_required_check
    CHECK (scope_kind <> 'product' OR canonical_chunk_id IS NOT NULL) NOT VALID;

ALTER TABLE rag_documents
  VALIDATE CONSTRAINT rag_documents_product_canonical_id_required_check;

ALTER TABLE rag_chunks
  VALIDATE CONSTRAINT rag_chunks_product_canonical_id_required_check;
