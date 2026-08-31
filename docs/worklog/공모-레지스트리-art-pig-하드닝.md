# 공모 레지스트리 단일화 PR-3 — art/pig 노출은 기충족, 방어 하드닝

## 결정과 근거

- 착수 전 실측에서 **art/pig는 이미 `/offers` 목록에 노출돼 있음**을 확인했다. `src/app/offers/page.tsx`가 `catalog={REPORT_CATALOG_CARDS}`(art-1~5 + pig-1~3)를 `OfferTabs`에 넘기고, `OfferTabs`가 phase 탭에 병합해 `ReportCatalogCard`로 렌더한다. 이 카드(`ReportCatalogCardView`)는 `assetKind`·`OfferSchedule`·리포트 유래 verdict가 없는 별도 경량 타입이라 `buildOfferCard`/`AssetKind`/무가드 `loadLatestReport`를 건드리지 않는다.
- 그 결과 브리프 PR-3의 목표(art/pig 노출·`/offers/art-N` 404 유지·synthetic(ex-) 제외·REPORT_COVERAGE는 PUBLISHED 기준)는 **이미 트렁크에 충족**돼 있다. `/offers/art-N`은 `generateStaticParams`가 `PUBLISHED_OFFER_IDS`만 쓰고 `dynamicParams=false`라 이미 404. synthetic은 카드가 content 모듈 기반이라 애초에 미노출. coverage는 이미 "한우 9·한돈 3·미술품 5·부동산 1·총 18".
- 브리프 PR-3와 리마인드 ④⑤(art/pig를 OFFERS/buildOfferCard로 넣기 + AssetKind 확장 + 4종 테스트 재정의)는 "art/pig가 목록에 없다"는 **stale 전제**로 작성됐음을 표면화했고, 오너가 **옵션 (A)**(기충족 확인 + 하드닝)로 결정했다. content/ 문안이 verdict/summary의 단일 진실인 것은 위반이 아니라 원칙이므로 인덱스 이관은 하지 않는다(수치·좌표만 후보 — 대회 후 백로그).
- 따라서 본 PR은 **하드닝만** 담는다: (1) 무가드 `loadLatestReport` 방어, (2) 이월된 `opensAt/closesAt` ISO 형식 검증.

## 트레이드오프

- **방어 가드 방식**: `loadLatestReportOrNull`을 신설해 `ReportNotFoundError`만 삼키고(널 반환 + 시끄러운 로그) `ReportCorruptError`는 다시 던진다. "리포트 아직 없음"과 "리포트 손상"을 구분 — 손상은 조용히 넘기면 안 되는 데이터 무결성 사고다. 리포트 없는 게시 공모는 카드에서 생략된다(조용한 소멸이 아니라 로그로 드러남).
- 대안(리포트 없는 카드 렌더)은 `buildOfferCard`가 verdict/tally/lastVerifiedAt를 요구해 카드 타입 변경이 필요 — (A) 하드닝 범위를 넘어 채택하지 않았다. 현재 게시 10건은 전부 리포트가 있어 화면 출력은 불변(가드는 미래 풋건 차단용).
- `opensAt/closesAt`는 `detail` jsonb로 들어가 `offeringRowSchema`(`isoDateSchema`)의 검증을 받지 않던 유일한 일정 필드였다. 인제스트 경계(`rawOfferSchema.offer`)에 오프셋 포함 ISO 정규식을 추가해 조인다. 현행 커밋 값(예: `2026-02-28T10:00:00+09:00`)은 전부 통과.

## 검증 영향

- 신규 `load-guard.test.ts` 3건: `ReportNotFoundError`→null+로그, 통과, `ReportCorruptError`→재던짐. 주입형 loader로 fs 없이 단위 검증.
- `loadLatestReportOrNull`은 실패 시 재던짐 경로가 있어 R-INV-05(키·DB 없이 완주)를 해치지 않는다 — 게시 10건 리포트는 커밋돼 있어 목록은 현행과 동일.
- ISO 정규식은 기존 `loadFileModeOfferings`(24건) 테스트가 그대로 통과함으로써 현행 데이터 무회귀를 보증한다.
- OFFERS=10·AssetKind 무변경·기존 카운트/코호트 테스트 전량 무수정 그린.

## 알려진 한계

- art/pig catalog 카드의 문안·수치가 여전히 content 모듈(`ART_PRODUCT_FACTS`/`PIG_DISCLOSURE_PRODUCTS`) 유래다. 문안은 단일 진실이 content/이므로 원칙에 부합하지만, 금액·일정 같은 수치·좌표를 인덱스로 이관하는 부분 단일화는 **대회(9/7) 후 백로그**로 남긴다.
- 리포트 없는 게시 공모는 현재 카드에서 생략된다. 실제로 게시되면서 리포트가 없는 공모를 노출할 정책이 생기면 리포트 없는 카드 타입이 별도 필요(범위 밖).
