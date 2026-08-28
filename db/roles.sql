-- R-STO-16 런타임 읽기 전용 역할 (운영 스크립트 — 마이그레이션 아님. db:migrate는 이 파일을 실행하지 않는다).
-- 적용 시점은 오너 결정. 순서: db:migrate로 0000_init.sql 적용(테이블 생성) → 본 스크립트 → DATABASE_URL을 이 역할 자격증명으로 재발급.
-- 목적: 런타임(/api/search, M2+)이 rag_documents·rag_chunks만 SELECT하도록 격리 — 공개 검색 경로 취약점이 원장 쓰기로 확대되는 것을 차단(09 §2.1).
-- 원장(offerings·art_auction_records·re_trades)·모든 쓰기·마이그레이션 권한은 이 역할에 부여하지 않는다. 그 권한은 CLI 전용 DATABASE_URL_DIRECT 자격증명에만 남긴다.
--
-- 실행(비밀번호는 커밋 금지 — 실행 시 주입):
--   psql "$DATABASE_URL_DIRECT" -v ro_password="'<강한-무작위-비밀번호>'" -f db/roles.sql
-- Supabase 대시보드 SQL 편집기에서 실행할 경우 아래 :ro_password 를 따옴표 포함 리터럴로 대체한다.
-- 재실행 안전: 역할이 이미 있으면 CREATE ROLE 에러 대신 GRANT만 다시 적용하려면 첫 문장을 건너뛴다.

CREATE ROLE jeomjeom_rag_ro LOGIN PASSWORD :ro_password;

GRANT USAGE ON SCHEMA public TO jeomjeom_rag_ro;
GRANT SELECT ON rag_documents, rag_chunks TO jeomjeom_rag_ro;

-- 하이브리드 검색(벡터, M2+) 도입 시 vector 연산자 스키마 사용 권한이 필요할 수 있다:
--   GRANT USAGE ON SCHEMA extensions TO jeomjeom_rag_ro;
-- 신규 rag 테이블 추가 시 본 스크립트에 SELECT 를 명시적으로 추가한다(기본은 무권한).
