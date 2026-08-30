-- R-STO-08 멱등 방어(리뷰 반영): re_trades 자연키에 NULLS NOT DISTINCT.
-- dong이 NULL이어도 동일 키 중복 삽입을 막아 재-ingest 멱등을 constraint 층에서 보장(PG15+).
-- append-only — 0000의 제약을 새 마이그레이션에서 재정의(0000 무수정).

ALTER TABLE re_trades DROP CONSTRAINT re_trades_natural_key;
ALTER TABLE re_trades
  ADD CONSTRAINT re_trades_natural_key
  UNIQUE NULLS NOT DISTINCT (lawd_cd, deal_ym, dong, deal_on, amount_won);
