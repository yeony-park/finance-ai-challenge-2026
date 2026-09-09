-- 정정 감시 화면이 cron 기록(monitor_runs/events)을 읽도록 런타임 역할에 column-level SELECT를 연다.
-- 09 §5 집행 규칙 3·4 개정(2026-09-09): 화면은 파일 기록을 기준으로 두되 더 최근 cron 기록이 있으면 앞세운다.
-- 읽는 열은 src/lib/db/ledger/monitor-read.ts가 명시 select하는 열과 같다. event_counts·blob_key는 열지 않는다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'jeomjeom_rag_ro') THEN
    GRANT SELECT (id, checked_at, source) ON monitor_runs TO jeomjeom_rag_ro;
    GRANT SELECT (monitor_run_id, offer_slug, kind, base_rcp_no, checked_through, amendment_rcp_nos)
    ON monitor_events TO jeomjeom_rag_ro;
  END IF;
END
$$;
