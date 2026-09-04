-- R-STO-16 런타임 최소권한 역할 (운영 스크립트 — 마이그레이션 아님. db:migrate는 이 파일을 실행하지 않는다).
-- 적용 시점은 오너 결정. 순서: db:migrate로 전체 스키마 적용 → 본 스크립트 → DATABASE_URL을 이 역할 자격증명으로 재발급.
-- 목적: 런타임 조회는 공개 승인 RAG 행과 offerings 공개 투영 뷰로, 쓰기는 실행 이력 INSERT로만 격리한다(09 §2.1·§5).
-- offerings의 비공개 열·art_auction_records·real_estate_trades·원장 쓰기·마이그레이션 권한은 이 역할에 부여하지 않는다. 그 권한은 CLI 전용 DATABASE_URL_DIRECT 자격증명에만 남긴다.
--
-- 실행(비밀번호는 커밋 금지 — 실행 시 주입):
--   psql "$DATABASE_URL_DIRECT" -v ro_password="'<강한-무작위-비밀번호>'" -f db/roles.sql
-- SQL 편집기에서 직접 실행할 경우 아래 :ro_password 를 따옴표 포함 리터럴로 대체한다.
-- 재실행 안전: 역할이 없을 때만 생성하고, 매 실행에서 전달한 비밀번호와 최소권한을 다시 적용한다.

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jeomjeom_rag_ro') THEN
    CREATE ROLE jeomjeom_rag_ro LOGIN;
  END IF;
END
$role$;

ALTER ROLE jeomjeom_rag_ro LOGIN PASSWORD :ro_password;

GRANT USAGE ON SCHEMA public TO jeomjeom_rag_ro;
GRANT SELECT ON rag_documents, rag_chunks TO jeomjeom_rag_ro;

-- 원본 detail/source_meta JSON은 런타임에 열지 않고 0005의 화이트리스트 뷰만 허용한다.
-- DATABASE_URL_DIRECT는 CLI ingest/migration 전용이며 런타임 repository에서 사용하지 않는다.
REVOKE ALL PRIVILEGES ON offerings FROM jeomjeom_rag_ro;
GRANT SELECT ON runtime_public_offerings TO jeomjeom_rag_ro;

-- R-STO-16 개정(09 §5): 런타임은 실행 이력 상세 열을 읽지 않고 INSERT만 수행한다.
-- 라이브 API(POST /api/verify)·cron(GET /api/cron/monitor)은 프로덕션에서 런타임 자격증명만
-- 갖는다(DATABASE_URL_DIRECT는 CLI 전용, 배포 안 함). 따라서 best-effort 기록은 런타임 역할로 한다.
REVOKE ALL PRIVILEGES ON verification_runs, monitor_runs, monitor_events FROM jeomjeom_rag_ro;
GRANT INSERT ON verification_runs, monitor_runs, monitor_events TO jeomjeom_rag_ro;

-- ON CONFLICT 타깃과 RETURNING 열만 SELECT한다. 실행 이력의 다른 열 조회는 허용하지 않는다.
GRANT SELECT (run_key) ON verification_runs TO jeomjeom_rag_ro;
GRANT SELECT (id, checked_at) ON monitor_runs TO jeomjeom_rag_ro;

-- GENERATED ALWAYS AS IDENTITY INSERT가 사용하는 세 sequence만 허용한다.
REVOKE ALL PRIVILEGES ON SEQUENCE
  verification_runs_id_seq,
  monitor_runs_id_seq,
  monitor_events_id_seq
FROM jeomjeom_rag_ro;
GRANT USAGE ON SEQUENCE
  verification_runs_id_seq,
  monitor_runs_id_seq,
  monitor_events_id_seq
TO jeomjeom_rag_ro;

-- 하이브리드 검색(벡터, M2+) 도입 시 vector 연산자 스키마 사용 권한이 필요할 수 있다:
--   GRANT USAGE ON SCHEMA extensions TO jeomjeom_rag_ro;
-- 신규 rag 테이블 추가 시 본 스크립트에 SELECT 를 명시적으로 추가한다(기본은 무권한).
