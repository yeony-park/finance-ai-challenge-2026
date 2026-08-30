# 프론트 연동 백엔드 파이프라인 (worklog)

> 규약: `docs/worklog/README.md` 4섹션(결정과 근거/트레이드오프/eval 영향/알려진 한계).
> 위임: 통합 세션(jeomjeom-ca) 2차 — 팀원 프론트 명세 연동. HEAD d8caeaa 위, 미푸시.
> 소비 계약 원전: `origin/feat/integration-user-flow`(한돈 프론트 최신 8/28). 데이터 원전: `origin/feat/integration-pig-review`(회차·rceptNo·폴백만, 프론트 코드 미반입). 원격 브랜치는 `git show`로만 읽음(체크아웃 금지).
> 제약: file 모드 완주 유지 · 푸시/배포 금지 · [팀 결정 대기] 임의 확정 금지 · 실 DB 상태 변경 시 오너 회신 · db/migrations append-only.

## 작업 2 — pig 카테고리 디스크립터 (2026-08-29)

**결정과 근거** — `src/lib/verify/contract/pig.ts` 신설(cattle.ts·real-estate.ts 미러). 층 선언 정직화: 실재성 `unsupported`(돼지 개체 이력번호 미제공 → 축산물이력제 대조 경로 없음), 가격 `partial`(경락가 월 통계 대비 공시 기준가 시장 참고 — 기준월 상이로 적정성 판정 아님), 이행 `partial`(DART 정정 계보·발행실적). 경락가 출처(`kape-pig-auction-price`)는 코퍼스 미등록이라 `proposedSources`로 선언만(R-INV-13 — 등록은 오너 일괄). 어댑터 바인딩은 출처 등록 전까지 `[]`. 이행 출처(dart-viewer·opendart-filings)는 등록분. `allowedPublicNames: []` + 발행사 법정명 [팀 결정 대기] 마커.

**트레이드오프** — 가격 층이 미등록(proposed) 출처를 인용 → cattle/real-estate가 쓰는 per-layer `isRegisteredSource` 강제 어서션을 pig엔 적용 못 함(대신 `unknownSourceIds===[]` proposed-aware로 검증). 어댑터 코드(작업 3)는 존재하나 디스크립터 바인딩은 출처 등록 후로 미룸 — 눈속임 "implemented" 회피. claimKinds는 기존 ClaimKind 합집합(offer_amount·acquisition_date·acquisition_price)만 — 신규 종류 발명 금지(proposedClaimKinds 오너 등록).

**eval 영향** — contract.test.ts에 pig 8종 추가(3층 선언·unsupported 정직·proposed 출처·어댑터 공란·claimKinds 무결). 35종 그린.

**알려진 한계** — 실재성 대조 경로는 발행사 개체 이력번호 서면 제공 전까지 열리지 않음. 가격 어댑터 바인딩은 오너 출처 등록 대기.

## 작업 4 — filing-facts/pig 큐레이션 (2026-08-29)

**결정과 근거** — `data/offers/filing-facts/pig-1~3.json` 신설(livestock-9.json 구조 미러). offerId `pig-N`, rcpNo=회차 최초 신고서 접수번호(공시 좌표라 익명화 대상 아님 — 오너 확인), 회차별 facts 4종(공모 개요·공모가격 산정·농장/자돈 공급·정산 상태). 값은 이미 중립화된 `content/pig.ts` PIG_DISCLOSURE_PRODUCTS에서 파생 — 발행사·농장·시군 실명은 농장 A/B·C·전북 ○○ 라벨로, corp_code 미반입.

**트레이드오프** — 데이터 원전은 연정 브랜치(데이터젠·무주농장·옥산1·2농장·무주팜·전북 무주군/군산시 원문 실명 보유)지만 프론트 코드 미반입·실명 미반입, 이미 중립화된 user-flow 계보 값만 이식. rcpNo는 보존(공시 좌표) — 익명화 대상 아님을 오너가 확인.

**eval 영향** — `pig-filing-facts.test.ts` 신설(9종): 스키마 로드·rcpNo 14자리 보존·원문 실명 0건(FORBIDDEN_NAME_PATTERN 스캔). 익명화 게이트 편입.

**알려진 한계** — filing-facts는 아직 리포트 파이프라인에 배선되지 않음(pig 검증 어댑터 부재 — 실재성 대조 불가). 데이터 자산으로 커밋, 향후 배선.

## 작업 1 — offerings 공개 인덱스 v2 (2026-08-29)

**결정과 근거** — `src/lib/db/export/public-offering.ts`를 schemaVersion 2로 확장. 카드 공통 필드(assetLabel·subscription{opensOn,closesOn,precision}·minimumInvestment·isExample) + 카테고리별 detail 화이트리스트(art=artistName·platformName·hasImage·note, real-estate=buildingUse·note). 청약 phase는 굽지 않고 subscription 필드로 클라이언트 파생(내보내기 시각 고정 방지). 판정 3값 계열만 — 집계 점수(similarityScore)·4단계 verdict(worth_considering 류, 현석 카탈로그 보유분) 반입 금지. Zod strict + 09 §3.4 문서화. 카테고리 detail은 offerings.detail jsonb → **schema.ts(DB 컬럼) 불변 · 신규 마이그레이션 불필요** → drizzle-kit generate 무-diff 대조 대상 아님(스키마 미변경).

**트레이드오프** — 실 소비자(user-flow OfferEntry/OfferCardView)는 미술품 카드에 offerings 인덱스를 아직 안 쓰고 pig는 content/pig.ts 직독이라, v2는 미술품/부동산 카드 + 향후 확장 대비 필드 집합. 합성 생성기 detail 확장(platformName·hasImage·minimumInvestment 추가)은 db:seed 재실행으로 DB 반영 후 db:export로 산출물 반영 필요 — 본 세션은 실 DB 미실행이라 **committed index.json(v1)은 오너 재-seed+재-export 시 v2로 갱신**(db:export만이 화면 데이터 생성 — R-STO-03 준수, 손 재생성 안 함).

**eval 영향** — export.test.ts v2 재작성(6종): 공통 필드·detail 화이트리스트·금지 필드 부재·마스킹·schemaVersion 2 매니페스트. db 계약 45종 그린.

**알려진 한계** — committed index.json은 오너 재-export 전까지 v1. 미술품 카드가 인덱스를 소비하도록 프론트 배선하는 것은 프론트 담당(user-flow) 몫. similarityScore·comparables 등 art 상세는 v2 미포함(집계 점수 검토 필요분).

## 작업 3 — pig-auction-price 어댑터 + fake twin (2026-08-29)

**결정과 근거** — `adapters/pig-auction-price.ts`(+`-fake.ts`) 신설(auction-price.ts 규약 미러 — sourceId·캐시 서브디렉터리·adapter 인터페이스). 원천 ① 커밋 CSV(`data/reference/pig-auction-price/`, Green·메타) 기본: `parsePigAuctionCsv`가 다중 헤더(월/지역/지표) CSV에서 메타 필터(탕박/전체/등외제외/전국제주제외) 행을 찾아 월 집계 추출. fake 트윈은 커밋 CSV 직독으로 완주. ekapepia HTML 스크레이핑 코드 **일절 미반입**(Red).

**트레이드오프** — CSV 파싱 결과가 content/pig.ts PIG_MARKET(메타 sha256로 원본 대조 가능한 커밋 스냅샷)과 정확히 일치함을 테스트로 못박아 원전 정합 보장. KAPE 공식 daily API(HTTP 평문) 라이브 수집 CLI는 이번 미구현 — 실키·네트워크·비가역이고 참조 구현의 HTML 스크레이핑 반입 금지라, 커밋 CSV(공식 파일 다운로드본, HTTPS)를 기본 원천으로 확정하고 라이브 수집은 후속. 도입 시 **런타임 게이트 금지·CLI 명시 `--allow-insecure-http` 플래그·HTML 스크레이핑 금지** 제약 명기.

**eval 영향** — `pig-auction-price.test.ts`(3종): 커밋 CSV 추출 = PIG_MARKET 일치·필터 행 부재 시 명확 실패(눈대중 폴백 금지)·수집 파일 없을 때 빈 집계 완주.

**알려진 한계** — 라이브 daily 경락가 수집 CLI 미구현(후속·CLI 전용·명시 플래그). 어댑터 디스크립터 바인딩은 출처 코퍼스 등록(오너) 후.
