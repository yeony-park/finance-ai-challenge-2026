<!-- 이 파일은 `npm run data:manifest`로 생성됩니다. 직접 수정하지 마세요. -->

# data/ 매니페스트

생성 시각: 2026-08-14T04:55:34.289Z

## 저장 정책

개인정보(농장주 실명·상세주소·농장번호)가 담긴 원천 데이터는 git에 올리지 않는다.
커밋되는 것은 **이 매니페스트**와 **마스킹이 끝난 공개 산출물(`data/public/`)** 뿐이다.

| 구분 | 경로 | git |
|---|---|---|
| 원문 | `data/raw/{rcpNo}/` | 제외(.gitignore) |
| 실측 스냅샷 | `data/snapshots/` | 제외(.gitignore) |
| 내부 리포트 | `data/reports/{offerId}/` | 제외(.gitignore) |
| 공개 리포트 | `data/public/{offerId}/` | **커밋** |
| 경락가 월 집계 | `data/reference/auction-price/` | **커밋**(시장 통계 — 개인정보 없음) |
| 실거래 월 신고 | `data/reference/rtms/` | **커밋**(시장 통계 — 개인정보 없음) |
| 공모 기초자료 | `data/offers/{offerId}.json` | **커밋**(공개 자료 정리 — 개인정보 없음) |
| 매니페스트 | `data/MANIFEST.md` | **커밋** |

신규 클론에서 로컬 전용 파일이 없어도 `npm test`·`npm run build`는 통과한다
(로컬 데이터에 의존하는 테스트는 파일 부재 시 명시적으로 스킵된다).

## 로컬 전용 파일 (커밋 금지)

### 1. 원문 (DART 증권신고서)

- **출처**: OpenDART document.xml API (crtfc_key 필요)
- **재확보**: `npm run verify:collect -- <rcpNo>`
- **비고**: ZIP 해제본 그대로. 농장 상세주소·개체 식별자 포함.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/raw/20260806000159/20260806000159.xml` | 2,271,672 | `34b0a80b80b17b92675a6eba29c0ef623d9e6455607756bbfd8dc33235855972` |

### 2. 실측 스냅샷 (축산물이력제 API 응답)

- **출처**: 축산물품질평가원 축산물이력정보 (data.go.kr 15058923)
- **재확보**: 팀 내부 채널에서 수령하거나, `DATA_GO_KR_API_KEY`로 `npm run verify:live -- --rcpNo <rcpNo>` 재수집
- **비고**: 농장주 실명(farmerNm)·상세주소(farmAddr) 포함 — 절대 커밋 금지.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/snapshots/2026-08-10-bankcow9-37head-trace.json` | 144,844 | `7b5597b48c491d286bec9db2644bb74abbae300656c38fd6ab5aac97c1562985` |

### 3. 내부 판정 리포트

- **출처**: 검증 파이프라인 산출 (재생성 가능)
- **재확보**: `npm run verify -- --rcpNo <rcpNo>`
- **비고**: 농장번호·상세주소 포함. 화면·배포는 이 파일을 읽지 않는다(data/public 사용).

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/reports/livestock-9/report-2026-08-11T16-02-04-683Z.json` | 268,697 | `25f6e34939b356595fde6c3d04254877e9cf2da294d95b6f324725ffdb0fbcf9` |
| `data/reports/livestock-9/report-2026-08-11T16-04-40-307Z.json` | 261,443 | `d244d8e53faef706a2da24aa0f6405de73b8510ec7c7d32417b12f7e6407c343` |
| `data/reports/livestock-9/report-2026-08-11T16-06-25-434Z.json` | 268,697 | `fc747f78938bcd2792c03afea57521ce4ab97b7ac117a5e48c59dd8b843859cb` |
| `data/reports/livestock-9/report-2026-08-11T17-10-16-301Z.json` | 268,697 | `13c1a4e6369ce59f98bc1a981232a9e2db66915dfa89d2dfc8e2249c115f7851` |
| `data/reports/livestock-9/report-2026-08-13T05-53-43-225Z.json` | 338,391 | `5fbd0b2819e6b12b6f701854d227a49f438e17fdefab61f544dba06a96e45252` |
| `data/reports/livestock-9/report-2026-08-13T14-58-05-788Z.json` | 331,137 | `f20e9f0b2879327b2f426b0d0e5000842483049acd624634ce41d303b6471a06` |
| `data/reports/livestock-9/report-2026-08-13T15-40-35-762Z.json` | 331,137 | `1d57daba0199187622f0fce9f257fd70fab3654ebdfbdbb153c7e477ac68ddd8` |
| `data/reports/livestock-9/report-2026-08-13T15-41-56-032Z.json` | 331,336 | `ec3439d812ab575ca17ce03e605392166217d4d3a3629d7b78f3aef4187bc08e` |
| `data/reports/livestock-9/report-2026-08-13T16-13-05-450Z.json` | 410,061 | `ca9745be510438f49ac98a15d4901f5269e347079d8ce9b3d2dc31d6c332d105` |
| `data/reports/livestock-9/report-2026-08-13T16-16-27-934Z.json` | 417,293 | `0709b94f0ff2d9f25472391ab13319e170d7ca3eca5829a32d70c896faf9ef9d` |
| `data/reports/livestock-9/report-2026-08-13T16-18-07-955Z.json` | 417,293 | `6af0476329d63c82b3e8cf21b5dfbec6ac2444e3417d453bf7b6c9ca2c6ec720` |
| `data/reports/livestock-9/report-2026-08-13T16-52-15-452Z.json` | 417,294 | `dae154d8681f4f5493dbb4cbbf3a848f95bc40c5290712c44942b5edff2e46a6` |
| `data/reports/livestock-9/report-2026-08-13T18-00-33-047Z.json` | 417,352 | `51c93bfe9281811eed749cad0e53ce43b2174337591e358c27025a5353cd2a57` |
| `data/reports/livestock-9/report-2026-08-13T18-07-15-350Z.json` | 417,352 | `c2b738d747084290f593561d83ddaf3b6cedb3d8ce5cd4f8465679d57da8bf62` |
| `data/reports/livestock-9/report-2026-08-14T04-55-13-053Z.json` | 410,120 | `ea6990887a1ead56de86c29ecb2614527adabc97fc7be3b832d2ed82f76446c6` |
| `data/reports/real-estate-a/report-2026-08-13T17-53-03-085Z.json` | 15,338 | `3e56f7ba7748e0b27777c3be1b673046db9456a69dd8e0359888e732ab0914f5` |
| `data/reports/real-estate-a/report-2026-08-14T04-34-57-566Z.json` | 51,130 | `5b3728ffb6b9c5a6ed8111d3014a9dbb5b8056093cbc1531914102e6805fb331` |
| `data/reports/real-estate-a/report-2026-08-14T04-53-03-242Z.json` | 51,130 | `a53672da11e84ed49418ee912a58116f2f5465e677b8790a5ff8ca393d1957f1` |
| `data/reports/real-estate-a/report-2026-08-14T04-54-06-189Z.json` | 51,407 | `0d92aac2ae11e475ea1a08087eb4345edc4a8c4c7d503e36ba1ebdea100d0b10` |

## 커밋 대상 산출물

### 공개 리포트 (마스킹 완료 · 커밋 대상)

- **출처**: toPublicReport(내부 리포트) 산출
- **재확보**: `npm run verify -- --rcpNo <rcpNo>`
- **비고**: 화면·배포가 읽는 유일한 데이터. 이력번호·개체명·지역·자유텍스트 마스킹 적용.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/public/livestock-9/report-2026-08-11T16-02-04-683Z.json` | 269,277 | `fdb1945dafffa6fd6b6775f35c3d8c5206eecd49de7b55cb3fe687f89224e1bc` |
| `data/public/livestock-9/report-2026-08-11T16-04-40-307Z.json` | 262,023 | `5bde24e29d2437cd21f8cc92c427e0c4879c5d6ad26f240214c931a05917a847` |
| `data/public/livestock-9/report-2026-08-11T16-06-25-434Z.json` | 269,277 | `f34264dd31b48b2fcebf40d08e8b55739c8997b8bb7072b1ca9a6803eda59e79` |
| `data/public/livestock-9/report-2026-08-11T17-10-16-301Z.json` | 269,277 | `fdb8981636fb7b7fe362d1365fbee8490f0ff0e562f946175cc491857d57a31b` |
| `data/public/livestock-9/report-2026-08-13T05-53-43-225Z.json` | 338,971 | `6146bd06312007b04372fa49716484fb087d96ac076d2e50b22a65f690dfcfe8` |
| `data/public/livestock-9/report-2026-08-13T14-58-05-788Z.json` | 331,717 | `8d88c77d0848c350cc366573596801c5657596132f4d1c7f7043fe80e2a64164` |
| `data/public/livestock-9/report-2026-08-13T15-40-35-762Z.json` | 331,717 | `147fab97867b85bd7b8556d11ef9cd2189ca6c27194a24e60e86c3bb07d8aa11` |
| `data/public/livestock-9/report-2026-08-13T15-41-56-032Z.json` | 331,916 | `5654c64d9281a7b9c61a2a8b182621a8738688ff6f0c39ec19f813c186c87f0d` |
| `data/public/livestock-9/report-2026-08-13T16-13-05-450Z.json` | 410,641 | `9fc26e962726540c1cbf5a42f2003467b8f2063ba563554f38097f55de2dea8d` |
| `data/public/livestock-9/report-2026-08-13T16-16-27-934Z.json` | 417,873 | `bf81e802251e6f26a9664107a2450beaf4aefb1d0f7fcbea6ec6f695851174bb` |
| `data/public/livestock-9/report-2026-08-13T16-18-07-955Z.json` | 417,873 | `bf73b9466399cec5e515dd510bb10340c213dca2beccf0479e320d99bb7bb747` |
| `data/public/livestock-9/report-2026-08-13T16-52-15-452Z.json` | 417,874 | `ed67011a93c0ddda7ff62274f80900504fd0b99e883cd5230d9e34e5b6c533fb` |
| `data/public/livestock-9/report-2026-08-13T18-00-33-047Z.json` | 417,932 | `37ea41e6027b843363b280df57be190dbfdf530ee22227147bb1adc8608fbfaf` |
| `data/public/livestock-9/report-2026-08-13T18-07-15-350Z.json` | 417,932 | `ff280bb47108fa4eb0799de61f11278399ce0d889c30272ef3a637249391c2cf` |
| `data/public/livestock-9/report-2026-08-14T04-55-13-053Z.json` | 410,700 | `4b5279d95b593ec826665f718e9516cc0bf28275aa796eab71fd6f83122d44e4` |
| `data/public/real-estate-a/report-2026-08-13T17-53-03-085Z.json` | 15,168 | `931ed4b78f166004a50fc90e7b0b9cf9689170baf76f7091e4cb6f6b629e7387` |
| `data/public/real-estate-a/report-2026-08-14T04-34-57-566Z.json` | 50,960 | `659b739f067591b35ece1f3da4b16e80794c85591b600f01f6e2cb1e301db753` |
| `data/public/real-estate-a/report-2026-08-14T04-53-03-242Z.json` | 50,960 | `902e90ecea4e77d53e309e350767f985ac8e1d646df1ddf743900e7e0106c25b` |
| `data/public/real-estate-a/report-2026-08-14T04-54-06-189Z.json` | 51,237 | `fe2b4434b20657a1cb2872bae4622085043c189bf96af2dc01d705a7e338513e` |
| `data/public/replay/livestock-9/diff-2026-08-13T17-46-58-162Z.json` | 3,453 | `2d47535b23c709247f30905bb5c97c56fdbf04f87c59d921a749d686aea991e2` |
| `data/public/watch/livestock-9/watch-2026-08-13T17-45-24-412Z.json` | 306 | `736ddcedeb167093837493f8cbb9c7b3c48a847cc58a3fb4a245be50f68eaace` |

### 참조 시장 데이터 (시장 통계 · 커밋 대상)

- **출처**: 축산물품질평가원 축산물등급판정정보 (data.go.kr 15058822) — 소도체 등급별 경락가격 / 국토교통부 상업업무용 부동산 매매 신고 자료 (실거래가 오픈API)
- **재확보**: `npm run reference:collect -- --from <YYYY-MM> --to <YYYY-MM>` · `npm run reference:rtms -- --from <YYYY-MM> --to <YYYY-MM> --lawdCd <시군구코드>`
- **비고**: 개인정보 없음(집계·신고 통계). 쿼터 방어를 위해 사전 수집하며, 판정·화면은 이 캐시만 읽는다(런타임 API 호출 없음). 수집이 거부된 달은 status=failed로 남고 비교군에 들어가지 않는다.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/reference/auction-price/024001-2026-05.json` | 2,910 | `bd2d6a623fe5d27da5ef5548e8b2d832960ada2aadd116768a64360f1c1966f4` |
| `data/reference/auction-price/024001-2026-06.json` | 2,910 | `38895fdcd3b41353b8f6fe524156e992b6853c8df29a101de639ca3fe315a126` |
| `data/reference/auction-price/024001-2026-07.json` | 2,910 | `1cf72fbee49bbc0c077683f56c4ecdeaf5a84d1b498636692f74ee7dbf282707` |
| `data/reference/auction-price/024001-2026-08.json` | 2,902 | `048efb1156ca18cc9ec4582ca0d82bb7f043143fe3723e847486e26b6e1aea5a` |
| `data/reference/rtms/11650-2021-05.json` | 16,087 | `266a5beda1d2ec27ee2195d278d74676f47117e50ea6308c28ec2d06b2a9c9bd` |
| `data/reference/rtms/11650-2021-06.json` | 100,163 | `ea9eec5486547bc2ba855a5670fae82e59f44e8d92618fc6cab5dc299293c7b5` |
| `data/reference/rtms/11650-2021-07.json` | 24,563 | `bf683644dd07ee08389d979f573205e27d72e1f02cea60f46dd413d1eb290ebc` |
| `data/reference/rtms/11650-2026-01.json` | 13,589 | `312cf02d8a58959d2c4040f48235e8150138323498b3dee9f7c331cc19d8d00c` |
| `data/reference/rtms/11650-2026-02.json` | 9,221 | `636ba6121ba621a061fc2c64b080926aafe57a6605f01260d624e5c222e17241` |
| `data/reference/rtms/11650-2026-03.json` | 12,111 | `7b59e4c2884a0754bfa5011d6cc9994572392a2972f7e6ce0d4b256fa21f793b` |
| `data/reference/rtms/11650-2026-04.json` | 13,918 | `81529bea3730bfb2d70ee9a9d8ea5cd03930f1fd2083e431522550dfa949918d` |
| `data/reference/rtms/11650-2026-05.json` | 12,715 | `5f45ff767a77ef9f30fc45306edf742ed9a86a61f4efbce555ee9ae3a95854a0` |

### 공모 기초자료 (공개 자료 정리 · 커밋 대상)

- **출처**: 발행사 공모 공고·매각 공시와 언론 보도 등 공개 자료 (파일 안의 sources 필드에 출처·확인일 병기)
- **재확보**: 수기 정리 — 새 공모 추가 시 `data/offers/{offerId}.json`을 만든다
- **비고**: 개인정보 없음(상업용 건물의 공개 실거래 단위 정보). 화면에는 익명화(발행사·건물명 중립 표기, 지번 마스킹) 후 노출된다.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/offers/real-estate-a.json` | 2,291 | `3e4aa9d9a7cecca7c894ae2fb55aa8dd56ec21df5e43dd95a2c0706510ba7ee8` |
