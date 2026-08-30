-- R-STO-10 (외래키 인덱스 필수) 보정: monitor_events.monitor_run_id FK 인덱스 누락 교정.
-- append-only — 0001 무수정. schema.ts와 동형(drizzle-kit generate 무-diff 유지).

CREATE INDEX monitor_events_monitor_run_id_idx ON monitor_events (monitor_run_id);
