-- 런타임 읽기 경계: 상품 JSON 화이트리스트 뷰 + product RAG 공개 승인 RLS.
-- DB 소유자/DATABASE_URL_DIRECT는 ingest와 운영 점검을 위해 RLS를 우회한다.

CREATE VIEW runtime_public_offerings
WITH (security_barrier = true)
AS
SELECT
  offer_slug,
  category_id,
  provenance,
  title_public,
  amount_won,
  opens_on,
  closes_on,
  jsonb_strip_nulls(jsonb_build_object(
    'opensAt', detail -> 'opensAt',
    'closesAt', detail -> 'closesAt',
    'unitCount', detail -> 'unitCount',
    'unitPriceWon', detail -> 'unitPriceWon',
    'art', CASE WHEN category_id = 'art' THEN detail -> 'art' END,
    'sources', CASE WHEN category_id = 'art' THEN detail -> 'sources' END
  )) AS detail,
  jsonb_strip_nulls(jsonb_build_object(
    'sourceUrl', source_meta -> 'sourceUrl',
    'license', source_meta -> 'license',
    'method', source_meta -> 'method',
    'retrievedAt', source_meta -> 'retrievedAt',
    'sha256', source_meta -> 'sha256'
  )) AS source_meta
FROM offerings
WHERE provenance <> 'synthetic';

ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY rag_documents_runtime_public_read
ON rag_documents
FOR SELECT
TO PUBLIC
USING (
  approved_for_public IS TRUE
  AND pii_review_status = 'passed'
  AND status IN ('ready', 'partial')
  AND (scope_kind <> 'generic' OR approved_for_external_ai IS TRUE)
);

CREATE POLICY rag_chunks_runtime_public_read
ON rag_chunks
FOR SELECT
TO PUBLIC
USING (
  approved_for_public IS TRUE
  AND pii_review_status = 'passed'
  AND status = 'ready'
  AND (scope_kind <> 'generic' OR approved_for_external_ai IS TRUE)
  AND EXISTS (
    SELECT 1
    FROM rag_documents document
    WHERE document.id = rag_chunks.document_id
      AND document.scope_kind = rag_chunks.scope_kind
      AND document.approved_for_public IS TRUE
      AND document.pii_review_status = 'passed'
      AND document.status IN ('ready', 'partial')
      AND (
        document.scope_kind <> 'generic'
        OR document.approved_for_external_ai IS TRUE
      )
  )
);
