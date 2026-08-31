-- R-STO-23(제안) 명명 정합: 카테고리 토큰 축약 금지 + 단가 컬럼 통화 접미사 의무.
-- re_trades만 category_id('real-estate') 전체 표기 규칙을 어겨 rename. 제약·인덱스·시퀀스 이름도 동형 유지.
-- cattle 단가 2컬럼은 pig(price_won_per_kg·amount_won)와 통화 표기 통일.
-- append-only — 0000~0003 무수정, rename은 본 마이그레이션이 전담.

ALTER TABLE re_trades RENAME TO real_estate_trades;
ALTER TABLE real_estate_trades RENAME CONSTRAINT re_trades_provenance_check TO real_estate_trades_provenance_check;
ALTER TABLE real_estate_trades RENAME CONSTRAINT re_trades_lawd_cd_check TO real_estate_trades_lawd_cd_check;
ALTER TABLE real_estate_trades RENAME CONSTRAINT re_trades_deal_ym_check TO real_estate_trades_deal_ym_check;
ALTER TABLE real_estate_trades RENAME CONSTRAINT re_trades_natural_key TO real_estate_trades_natural_key;
ALTER INDEX re_trades_lawd_deal_ym_idx RENAME TO real_estate_trades_lawd_deal_ym_idx;
ALTER INDEX re_trades_pkey RENAME TO real_estate_trades_pkey;
ALTER SEQUENCE re_trades_id_seq RENAME TO real_estate_trades_id_seq;

ALTER TABLE cattle_auction_prices RENAME COLUMN price_per_kg TO price_won_per_kg;
ALTER TABLE cattle_auction_prices RENAME COLUMN avg_price_per_kg TO avg_price_won_per_kg;
