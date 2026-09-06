# 한돈 경락가격 정규화 JSON

## 전달 파일과 범위

- `data/reference/pig-auction-price/normalized/2026-05.json`
- `data/reference/pig-auction-price/normalized/2026-06.json`
- `data/reference/pig-auction-price/normalized/2026-07.json`

원본은 `data/reference/pig-auction-price/pig_price_20260815021618.csv`이고, 출처·수집 시각·원본 SHA-256은 같은 이름의 `.meta.json`에 있다. 출처는 [축산물품질평가원 공식 파일 자료](https://www.data.go.kr/data/15148902/fileData.do)다.

기존 화면과 DB 파서의 지역 범위인 **전국(제주제외)**만 정규화한다. 원본의 다른 지역은 이 산출물에 포함하지 않는다. 돈피(전체·박피·탕박), 성별(전체·암·수·거세), 등급별 관측값을 포함하며, 화면에 쓰는 탕박·전체 성별·등외제외 평균과 1+·2등급도 포함한다.

원본에서 네 지표 중 하나라도 `-` 등 비수치 값인 조합은 기존 파서 정책에 따라 제외한다. 제외된 조합을 0건·0원으로 해석하지 않는다. 전체·성별·등급별 집계는 서로 중복되는 범위이므로 모든 행을 합산하지 않는다.

## JSON 구조와 DB 매핑

각 파일의 `entries`가 DB에 적재할 행 배열이다. 행은 기존 `pigAuctionRowSchema`와 동일하다. 상위 `month`는 원문 통계 기준월이며, 각 행에도 들어 있다. `dataNature: observed`는 관측 통계임을, `validationStatus: source_hash_and_schema_checked`는 원본 해시와 스키마 대조를 통과했음을 뜻한다. 실시간 최신성이나 개별 상품의 정산가격을 검증했다는 뜻은 아니다.

| JSON 필드 | `pig_auction_prices` 컬럼 | 의미·단위 |
| --- | --- | --- |
| `month` | `month` | 통계 기준월, YYYY-MM |
| `skinType` | `skin_type` | 돈피 구분 |
| `sex` | `sex` | 성별 구분 |
| `grade` | `grade` | 등급 구분 |
| `region` | `region` | 전국(제주제외) |
| `headCount` | `head_count` | 경락두수, 두 |
| `priceWonPerKg` | `price_won_per_kg` | 경락가격, 원/kg |
| `amountWon` | `amount_won` | 거래대금, 원 |
| `weightKg` | `weight_kg` | 거래중량, kg |
| `sourceMeta` | `source_meta` | 출처 URL·이용등급·수집 방법·수집 시각·원본 CSV SHA-256 |

중복 판별 키는 `(month, skinType, sex, grade, region)`다. JSON은 CSV의 가격 소수 자릿수를 유지한다. 기존 DB의 `price_won_per_kg`는 `numeric(12, 2)`이므로 적재하면 소수 둘째 자리로 반올림된다. 원본 정밀도 보존이 필요하면 DB 담당자가 컬럼 정밀도를 검토한다.

`sourceMeta.retrievedAt`은 원본 메타의 `2026-08-15 02:16:18 KST` 문자열을 유지한다. `sourceMeta.sha256`은 정규화 JSON이 아닌 원본 CSV의 해시다. JSON 자체의 해시는 `data/MANIFEST.md`에서 확인한다.

## 재생성·검증

```bash
npm run reference:pig-normalize
npm test -- src/lib/verify/__tests__/pig-auction-price.test.ts
```

명령은 최신 파일명 순의 CSV와 대응 메타를 선택하고, `data/MANIFEST.md`의 바이트 수·SHA-256 및 메타의 원본 해시를 검증한 뒤 월별 파일을 생성한다. 같은 원본으로 재실행하면 같은 JSON 바이트가 생성된다. 새 원본을 추가할 때는 원본·메타를 검토해 stage하고 `npm run data:manifest`를 먼저 실행한다. 생성된 JSON도 검토해 stage한 뒤 매니페스트를 다시 생성한다. 이번 산출물은 총 176행이다.

이번 변경은 전달용 JSON 생성까지다. 화면은 기존 정적 스냅샷을 사용하고, 기존 `db:ingest`는 계속 CSV를 읽는다. JSON을 통한 DB 적재와 화면 조회 전환은 후속 작업이다.
