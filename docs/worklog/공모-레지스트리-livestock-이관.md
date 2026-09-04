# 공모 레지스트리 — livestock(한우) 9건 이관

## 결정과 근거

- offers.ts에 하드코딩돼 있던 한우 공모 9건(livestock-1~9)을 커밋 파일 캐시
  `data/offers/livestock-{1..9}.json`으로 이관해 `loadFileModeOfferings()`가
  cattle·`manual_verified`로 적재하도록 했다. 이관 후 파일 원장은 커밋 9건 + 신규
  9건 = 18건, synthetic 6건과 합쳐 총 24건이 된다(이관 전 15건).
- `assetKind`는 zod enum(`cattle|pig|art|real-estate`)에 맞춰 `"cattle"`로
  적었다. 스펙 표현상 "livestock"이지만 이는 enum 밖 문자열이라 `safeParse`가
  조용히 건너뛴다 — 슬러그(중립 id)만 livestock-N을 유지한다.
- livestock 7~9는 분 단위 청약 시각을 갖는다. schema.ts의 date 컬럼을 건드리지
  않는 A안을 택해 `offer.opensAt`·`offer.closesAt`(ISO 8601, KST offset)를
  `detail` jsonb로 통과시키고, export 시 그 존재로 `subscription.precision`을
  `minute`/`day`로 파생한다. 마이그레이션이 필요 없어 오너의 DB 상태 변경을
  최소화한다.
- 실측 상수(opensOn/closesOn/opensAt/closesAt/title)는 드리프트 테스트에
  인라인으로 고정해 파일과의 정합을 회귀로 잠갔다(RED→GREEN 확인).

## 트레이드오프

- **A안(detail 통과) vs B안(date 컬럼 → timestamptz 마이그레이션)**: A안은
  마이그레이션 0건·화면 계약 무변경이라는 이득을 얻는 대신, 분 단위 시각이
  정규 컬럼이 아닌 jsonb에 산다는 비용을 진다. 시각 기준 정렬·범위 쿼리를 DB에서
  하려면 후속 승격이 필요하다 — 지금은 렌더가 export 산출물만 읽으므로 미룬다.
- livestock 1~6은 amountWon을 넣지 않았다(null). offers.ts 하드코딩이 원천인데
  금액이 부재해, 화면 현행과 동일하게 미상으로 남겼다. 없는 값을 지어내지 않기
  위한 선택이며, 값이 확인되면 파일에 채우면 된다.
- `sources`·`asset` 없이 최소 형태로 적재해 마스킹 표면을 좁혔다. 대신 출처
  메타(sourceUrl/retrievedAt)가 비어 sourceMeta는 빈 문자열로 채워진다.

## 검증 영향

- `offer-ledger-drift.test.ts`에 livestock 9건 파일 정합(test.each) + 총 24건
  적재(cattle·manual_verified) 테스트를 추가했다. 파일이 상수에서 드리프트하면
  즉시 실패한다. FORBIDDEN(원문 실명) 스캔도 각 문서에 적용된다.
- `export.test.ts`에 cattle 분 단위 파생 테스트 2건을 추가했다: detail에
  opensAt/closesAt이 있으면 `precision=minute`이고 그 값이 산출 detail로
  통과되며, 없으면 `precision=day`이고 detail에 opensAt/closesAt 키가 없다.
- opensAt/closesAt은 구조화 ISO 타임스탬프이므로 maskFreeText를 적용하지
  않는다(자유 텍스트 아님). 익명화 게이트는 기존대로 유지된다.

## 알려진 한계

- **R-STO-22 드리프트**: offerings 적재는 계약상 `db:ingest` 소관인데 현재 구현은
  `db:seed`가 파일을 읽어 적재한다. 이 PR이 만든 문제가 아니며, ingest 이관은 이
  PR 범위 밖이다.
- `data/public/offerings/index.json` 재생성은 이 PR에 포함되지 않는다 — 코드·
  데이터·테스트만 담는다. 화면 반영은 오너가 `db:seed` + `db:export`를 실행해야
  이뤄진다.
- livestock 1~6은 offers.ts 하드코딩이 원천이라 amountWon이 미상(null)이며,
  화면 현행과 동일하다.
