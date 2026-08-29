<!-- 이 파일은 `npm run data:manifest`로 생성됩니다. 직접 수정하지 마세요. -->

# data/ 매니페스트

생성 시각: 2026-08-29T04:17:58.913Z

## 저장 정책

개인정보(농장주 실명·상세주소·농장번호)가 담긴 원천 데이터는 git에 올리지 않는다.
커밋되는 것은 **이 매니페스트**와 **마스킹이 끝난 공개 산출물(`data/public/`)** 뿐이다.

| 구분 | 경로 | git |
|---|---|---|
| 원문 | `data/raw/{rcpNo}/` | 제외(.gitignore) |
| 실측 스냅샷 | `data/snapshots/` | 제외(.gitignore) |
| 내부 리포트 | `data/reports/{offerId}/` | 제외(.gitignore) |
| 공개 리포트 | `data/public/{offerId}/` | **커밋** |
| 발행사 트랙레코드 | `data/public/track-record/{issuerKey}.json` | **커밋**(공시 집계 — 발행사명·corp_code 미포함) |
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
| `data/raw/20260814003572/20260814003572.xml` | 2,455,175 | `cc815be9d95de6cbe4a6a16f632cfe65c3f56589ce77caa9c7890fefce8b99e2` |

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
| `data/reports/livestock-9/report-2026-08-15T15-52-44-480Z.json` | 430,308 | `eae1cd4fd24efd09bc84ba7d6d7647ff915f5fed9e656e4859f9b379afe6e5ca` |
| `data/reports/real-estate-a/report-2026-08-21T16-58-05-870Z.json` | 51,295 | `a6a92d2e1de63f3293a312a02943ad373cf611d9f9edf92f31241e99187b21f5` |

## 커밋 대상 산출물

### 공개 리포트 (마스킹 완료 · 커밋 대상)

- **출처**: toPublicReport(내부 리포트) 산출
- **재확보**: `npm run verify -- --rcpNo <rcpNo>`
- **비고**: 화면·배포가 읽는 유일한 데이터. 이력번호·개체명·지역·자유텍스트 마스킹 적용.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/public/livestock-1/narrative-20240619000091.json` | 4,038 | `d317d0e7a71ae7f80bf1ece8e3370dd3eddfc5ec6a23cf4b77c8082fee196b55` |
| `data/public/livestock-1/report-2026-08-14T17-37-47-180Z.json` | 342,356 | `a42ac41d188442fd090d6f51a4cd112c91984c5de89ca4173ee4c9c3d8971368` |
| `data/public/livestock-1/report-2026-08-14T17-49-02-486Z.json` | 461,498 | `3147a46847793e88387899c9888ce66d5978b656b25876df709890dc70d11028` |
| `data/public/livestock-1/report-2026-08-14T18-00-27-489Z.json` | 599,585 | `0b3a93b3f9fdbab6c681c314a39f7fd235f4d1d4928c91cbbae2ee7e6b1a20f3` |
| `data/public/livestock-1/report-2026-08-14T18-14-36-550Z.json` | 599,557 | `187f22ff2642b8bc3a8cf6193f78d72fc86e325f373e2d47bafd229e38c41878` |
| `data/public/livestock-2/narrative-20240911000124.json` | 4,470 | `bf6313f4248be19a2f79d2c91825e153024ab984f90ede8831366ff203dfda50` |
| `data/public/livestock-2/report-2026-08-14T17-39-07-433Z.json` | 302,455 | `088a755b0c0d5e39efc43bc5af7ac49b082fad113da320795a36ecc4cbdca726` |
| `data/public/livestock-2/report-2026-08-14T17-50-23-750Z.json` | 406,266 | `dfe4d989d95f57104d2efad60aa328d5d9727be469237c87e89bbb2fa298edfb` |
| `data/public/livestock-2/report-2026-08-14T18-02-03-615Z.json` | 525,009 | `f953babc84dd0506f0443a192e1fc527c927b49ebc60005be525a772538688d2` |
| `data/public/livestock-2/report-2026-08-14T18-17-47-890Z.json` | 524,981 | `f071e206338a1d24fc596d4fd944819b0f5054095ebfa67cd5e77d44d866822c` |
| `data/public/livestock-3/narrative-20241220000182.json` | 4,001 | `60d610354f0d9611f3dd544f331333da3b2a31b0606398a0e9d3e7f6d84abc43` |
| `data/public/livestock-3/report-2026-08-14T17-40-27-385Z.json` | 302,974 | `72760368356cdedd0c0186b72db1eb7bc73cdb35fe111fd68bb3b547d510ae5a` |
| `data/public/livestock-3/report-2026-08-14T17-51-54-445Z.json` | 443,093 | `a420fff0e925518cbc2a8548b2abf00050f36e868cceacdf2d98dfd7436f37b0` |
| `data/public/livestock-3/report-2026-08-14T18-03-29-214Z.json` | 575,687 | `a3603a8080fa61753ad7621e87af545812faf21847bfd4564eff40f00c101bbe` |
| `data/public/livestock-3/report-2026-08-14T18-21-45-354Z.json` | 575,659 | `0af18765e6514dc126254b2181dba5ec23e80dbe0d1bbbccf38e7b0279fdb314` |
| `data/public/livestock-4/narrative-20250421000094.json` | 3,704 | `e4ee3a7fae44554a8e7c400002b41fb58ab6f579ac9e6c0e431166ae834362f9` |
| `data/public/livestock-4/report-2026-08-14T17-42-11-001Z.json` | 315,555 | `768d9dd196cdb0bf3a9db97a02bc3302ac9020b9d96f1c79769c6b185d708aed` |
| `data/public/livestock-4/report-2026-08-14T17-53-24-537Z.json` | 447,745 | `9e943657787e689ee3c13da14646eeb7fa15bf3721d44539681d4c9f186d3e29` |
| `data/public/livestock-4/report-2026-08-14T18-05-28-256Z.json` | 576,218 | `98a7d0163589f7a0586639dd6ceee0efab9e35fbb633ee2c21c782f324251319` |
| `data/public/livestock-4/report-2026-08-14T18-27-09-373Z.json` | 576,190 | `a7a8041e7f67b74031c3b259aa9fb19f74bd55557906648868baca5fdfaeaa9b` |
| `data/public/livestock-5/narrative-20250617000216.json` | 4,055 | `06bf222fe7223f4ca9134dea0eb0be22d3fe278b5b6d6dcdab6a336f87399c1e` |
| `data/public/livestock-5/report-2026-08-14T17-43-25-627Z.json` | 240,873 | `c5017e7fc106e63e8068400987651431b4a270d4c397e4fa8f5b2e2d08a889e0` |
| `data/public/livestock-5/report-2026-08-14T17-54-36-652Z.json` | 341,018 | `b3e5bd7ca6e378011647fd09835b52e9132cc67d78b522eebf78b7aa42e9830e` |
| `data/public/livestock-5/report-2026-08-14T18-06-53-703Z.json` | 441,581 | `849dc4e881103c3a5f67751398db146f2571b52edcc5606db634dbae302c9ede` |
| `data/public/livestock-5/report-2026-08-14T18-29-57-467Z.json` | 441,553 | `04328e6bc4bf55306d328b7429c7a50f09570ecfe8969c888f2c0d2f58ad470d` |
| `data/public/livestock-6/narrative-20251031000477.json` | 4,224 | `b47ad3c7428f79bf5d418c9c5449d198a35420e59dcd4e2fe947372fd4f4821a` |
| `data/public/livestock-6/report-2026-08-14T17-44-54-480Z.json` | 415,836 | `5c4e19cbe1e8373c309ef38f2642475b5a6d7369596828970ccf56cf81e9be12` |
| `data/public/livestock-6/report-2026-08-14T18-08-34-097Z.json` | 537,463 | `f264bb85b41b334cd921d2d48fe1c8aa7555ba303e984adc7661b960307d019d` |
| `data/public/livestock-6/report-2026-08-14T18-33-15-584Z.json` | 537,435 | `1f3944cb6fba20a22e3e70d1a169b4d72747cf0d294c82906ca5aaa2fc76371c` |
| `data/public/livestock-7/narrative-20260225002022.json` | 4,647 | `c5ca88ccab88694e4c2b5ef97a383141a0b4f2e1d77333160cab8c0b684812f1` |
| `data/public/livestock-7/report-2026-08-14T06-19-19-348Z.json` | 460,762 | `0b6ed200cf1f119716711d938741e925b550abf0ea7e1883bbba33cc64339306` |
| `data/public/livestock-7/report-2026-08-14T15-26-28-272Z.json` | 464,629 | `aa744a373cbc003334dfbc1183d6dedf4bd23f6965aac9a6a738ef2672d958e2` |
| `data/public/livestock-7/report-2026-08-14T15-35-45-701Z.json` | 464,601 | `04bf6c12ffa441cefed8b84ebdc176a1f5c63c1abfc24a0b38d0c2d8f781ae7f` |
| `data/public/livestock-7/report-2026-08-14T17-06-34-000Z.json` | 464,601 | `ea6c71e3dab93afaa8f8d143f45c5cb7a38d6b0fad3d4bb9ae3799670d3fb72e` |
| `data/public/livestock-7/report-2026-08-14T17-16-17-542Z.json` | 464,601 | `52ea8426381fe2e0ac5ee306025a63220d4cff2f816ad58f37bfd3e41d068aa7` |
| `data/public/livestock-7/report-2026-08-14T17-25-29-254Z.json` | 464,601 | `15591e82115100778e58a01201bfbd849a60eeabe9a0e98e14417a1782d07d1b` |
| `data/public/livestock-8/narrative-20260414002068.json` | 4,147 | `4973b5a2adb6767299455e43c7291ba5a87454be85a55b00160e9ff0c2415501` |
| `data/public/livestock-8/report-2026-08-14T06-37-40-268Z.json` | 755,587 | `1f8368bc644e028234c1df8cba6c5b1e49f6f9624a87de13875990c4549a7023` |
| `data/public/livestock-8/report-2026-08-14T15-29-10-613Z.json` | 759,677 | `67d2bf596532b7b8db7196e3f28bc5a2fde27c4431c0b8ae6d9beba4dae4189f` |
| `data/public/livestock-8/report-2026-08-14T15-41-05-021Z.json` | 759,480 | `b6fb51b3fcc85255d71f35b1265ad01312747018346162f8844ee1c9702fa525` |
| `data/public/livestock-8/report-2026-08-14T17-12-30-598Z.json` | 759,480 | `eedd808e2f33abeb80163c2a38e7ae5378ff1e872e6a7f778621e7da844d2925` |
| `data/public/livestock-8/report-2026-08-14T17-20-43-676Z.json` | 759,480 | `25a5db45f7089b421b39ba943d9ab4d1ab1fea5b3de2836d746131eeb1807037` |
| `data/public/livestock-8/report-2026-08-14T17-30-09-105Z.json` | 759,480 | `8eda6ba683b04e820ca6806890572ad376f63a69ba02b87d37c5b9c86f934e26` |
| `data/public/livestock-9/narrative-20260806000159.json` | 5,350 | `fc15500158c63cc4bef1c0b742de2ecbaf09772661f204586c18864d4cbb6296` |
| `data/public/livestock-9/narrative-20260814003572.json` | 3,549 | `77c3b909967aaf6237c1209fab2a1f6708bf5c5e239a69eb3919cb8648f77f17` |
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
| `data/public/livestock-9/report-2026-08-14T05-52-59-028Z.json` | 410,700 | `5391ed8bbf1455f3af56dfc9fb78c9dcc04b87ecf6bf9b98098ef019b812819d` |
| `data/public/livestock-9/report-2026-08-14T15-30-30-662Z.json` | 412,860 | `c80032207a70e8a3b7d060cc6938bad29de130e477ac220e683c99a6c61a79d1` |
| `data/public/livestock-9/report-2026-08-15T15-52-44-480Z.json` | 430,888 | `c989fb5dce8532b849ace669fed17f4b29ae7d5c52db028659a538c312807da3` |
| `data/public/offerings/index.json` | 3,939 | `e6e3d3269be63774617b28782929b6c2cf34810af2f5f43169c4e787d7cb2a08` |
| `data/public/real-estate-a/narrative-latest.json` | 4,203 | `ba5978b954e4e0c8bcc17ae28cf5a18925f77f8ae9afafdda574c5925af8122f` |
| `data/public/real-estate-a/report-2026-08-13T17-53-03-085Z.json` | 15,168 | `931ed4b78f166004a50fc90e7b0b9cf9689170baf76f7091e4cb6f6b629e7387` |
| `data/public/real-estate-a/report-2026-08-14T04-34-57-566Z.json` | 50,960 | `659b739f067591b35ece1f3da4b16e80794c85591b600f01f6e2cb1e301db753` |
| `data/public/real-estate-a/report-2026-08-14T04-53-03-242Z.json` | 50,960 | `902e90ecea4e77d53e309e350767f985ac8e1d646df1ddf743900e7e0106c25b` |
| `data/public/real-estate-a/report-2026-08-14T04-54-06-189Z.json` | 51,237 | `fe2b4434b20657a1cb2872bae4622085043c189bf96af2dc01d705a7e338513e` |
| `data/public/real-estate-a/report-2026-08-21T16-58-05-870Z.json` | 51,125 | `2a2814b666e9a2470f556c8b2a8428600c7614434cd9b39b51b7cf3b8b43d830` |
| `data/public/replay/livestock-1/diff-2026-08-14T18-14-36-550Z.json` | 154,949 | `9a10c64b363454d94c9a088f655a0e7757a4fbddd0dd2f4b66c1aaf9a7478e34` |
| `data/public/replay/livestock-2/diff-2026-08-14T18-17-47-890Z.json` | 51,111 | `7afb5e1a547445e539f32371cc005b7c15668e8e031ca30bc2f3ad8890621543` |
| `data/public/replay/livestock-3/diff-2026-08-14T18-21-45-354Z.json` | 22,678 | `c3799b15bb0ed0fe4c6b0b5ece1fc5dcb0dd5fa9a935686c2142ddbfbe9a974b` |
| `data/public/replay/livestock-4/diff-2026-08-14T18-27-09-373Z.json` | 129,165 | `e5f35721def8dc1d800a693d9ab4d6ec80e69ad14e6fae2c26ec8c18e5bdf968` |
| `data/public/replay/livestock-5/diff-2026-08-14T18-29-57-467Z.json` | 93,141 | `0fbd10c616d3b6a5dc34e062303efccc5c26556ba2dc14601ae670d492327085` |
| `data/public/replay/livestock-6/diff-2026-08-14T18-33-15-584Z.json` | 34,671 | `c7a2887bd44b147338fbe48f365d6863a5cac193b28aab7448b626ca669dbb1a` |
| `data/public/replay/livestock-7/diff-2026-08-14T06-19-19-348Z.json` | 4,440 | `3416ea1773980e87f3b5d9a9fe8ef2bf363b5b58221c65278c515915aa6ab22f` |
| `data/public/replay/livestock-7/diff-2026-08-14T15-35-45-701Z.json` | 4,440 | `a7a931f7851382e95301a2069e822a1941f3aee6eba94824d14fffd56426a82d` |
| `data/public/replay/livestock-7/diff-2026-08-14T17-25-29-254Z.json` | 23,344 | `497c29b4415c48ea52022a9ec0b22bbdecee66c102bd6bbd1f77d706aa6cef5b` |
| `data/public/replay/livestock-8/diff-2026-08-14T06-37-40-268Z.json` | 2,819 | `780f77f1ee878913553564035c029603891c6fc413771387dd8ea1848623fe12` |
| `data/public/replay/livestock-8/diff-2026-08-14T15-41-05-021Z.json` | 2,819 | `6ccf5186534f7c3c552458e516b3359a548484f5d3b66ecefa8d2c712e02bcb7` |
| `data/public/replay/livestock-8/diff-2026-08-14T17-12-30-598Z.json` | 8,355 | `b36cf70b60b1395a61ce3b7f7e3c2c566914e839dc62611af5ef282661211c56` |
| `data/public/replay/livestock-8/diff-2026-08-14T17-20-43-676Z.json` | 8,355 | `ba79ca0862b7214ff4e90a416330cda8666b6f2a579b1c27e57669d5b7c5666c` |
| `data/public/replay/livestock-8/diff-2026-08-14T17-30-09-105Z.json` | 8,355 | `3945d09effedd7fc960522da7b4d9d62378ce018f46bf027c8b6ae52eb5c8140` |
| `data/public/replay/livestock-9/diff-2026-08-15T15-52-44-480Z.json` | 16,210 | `cbb2989841c2b60c7353057f149dd3f893de8c77a08d65ecc736f581eee3c020` |
| `data/public/track-record/issuer-a.json` | 1,200 | `3a2e5953945903ba81a8baa8687dda87d468cc1ea4960fc12ed47fbacf89da0a` |
| `data/public/watch/livestock-1/watch-2026-08-14T18-35-42-968Z.json` | 1,171 | `4a3771bd31c62c04dc72a06008fba547293b3643d2f9e9cb41aaa63560c1f232` |
| `data/public/watch/livestock-2/watch-2026-08-14T18-35-42-968Z.json` | 721 | `81f0d97b95bbc09dc0dc6670b97fc4f556d18b8fd7fd6e4d38d26a5cb0e358a2` |
| `data/public/watch/livestock-3/watch-2026-08-14T18-35-42-968Z.json` | 871 | `cac2870b27cfdcc57fcf73431d43fdbd84830f813cd07b10597f65e8d0e058a7` |
| `data/public/watch/livestock-4/watch-2026-08-14T18-35-42-968Z.json` | 871 | `008fb59f6d02b640108738edf7e7b45cf605447182dcce6f346d84597b21e02c` |
| `data/public/watch/livestock-5/watch-2026-08-14T18-35-42-968Z.json` | 871 | `98244f386560890e1ecf0deb61d036e3c8020f0555fba584f01411da0dc4814b` |
| `data/public/watch/livestock-6/watch-2026-08-14T18-35-42-968Z.json` | 721 | `03eeacc03d1d026da5a39c18006bf01d7cf017a3dca4032bef5f4f64baaa0139` |
| `data/public/watch/livestock-7/watch-2026-08-14T06-13-49-913Z.json` | 871 | `c53178b0cb2d21a6ee6d224c482ddc349d387e2322cf564e73efe9bb07c9dcb0` |
| `data/public/watch/livestock-7/watch-2026-08-14T15-45-06-801Z.json` | 871 | `858c0d3864d0ea134bc6f754cd6f9d3557ecb6feddc7a9aad98c699a80af01d9` |
| `data/public/watch/livestock-7/watch-2026-08-14T18-35-42-968Z.json` | 871 | `46a24c8024338497a2be9eae1cfabc75e90fc2295cf2cf89a59ac63bf74802c2` |
| `data/public/watch/livestock-8/watch-2026-08-14T06-42-10-127Z.json` | 721 | `834eed88a3ce60f16975cd4c91d5c2a346d227eb1f1eccebc0029b0428012da7` |
| `data/public/watch/livestock-8/watch-2026-08-14T15-45-06-801Z.json` | 721 | `1cc81588f0f10c552a5723825a1cbe0856bf1fe0726d4f768ba7dd6a6566deba` |
| `data/public/watch/livestock-8/watch-2026-08-14T18-35-42-968Z.json` | 721 | `b5760ea6376a26890849572ecc7e6e4ce50694f72eca8128b1ccc6b74708cf5b` |
| `data/public/watch/livestock-9/watch-2026-08-13T17-45-24-412Z.json` | 306 | `736ddcedeb167093837493f8cbb9c7b3c48a847cc58a3fb4a245be50f68eaace` |
| `data/public/watch/livestock-9/watch-2026-08-14T15-45-06-801Z.json` | 586 | `d3b20117631a19394b2de153303630c2ba07fc9da4da557c9f8fa6877c4d7500` |
| `data/public/watch/livestock-9/watch-2026-08-14T18-35-42-968Z.json` | 586 | `8fbb543341acb54d8d944b772d032694423f3ef6c47948e553ce35058cc9df93` |
| `data/public/watch/real-estate-a/watch-2026-08-14T15-45-06-801Z.json` | 368 | `6a7a5b800aa85d36c3ff94aec9a39ff40d016da01ee309179e0c1540f54f2049` |
| `data/public/watch/real-estate-a/watch-2026-08-14T18-35-42-968Z.json` | 368 | `f3a56f90883a532ca7a789d3cd916b7f478dccf381559a4c7d3427a9ec5b9ce7` |

### 참조 시장 데이터 (시장 통계 · 커밋 대상)

- **출처**: 축산물품질평가원 축산물등급판정정보 (data.go.kr 15058822) — 소도체 등급별 경락가격 / 국토교통부 상업업무용 부동산 매매 신고 자료 (실거래가 오픈API)
- **재확보**: `npm run reference:collect -- --from <YYYY-MM> --to <YYYY-MM>` · `npm run reference:rtms -- --from <YYYY-MM> --to <YYYY-MM> --lawdCd <시군구코드>`
- **비고**: 개인정보 없음(집계·신고 통계). 쿼터 방어를 위해 사전 수집하며, 판정·화면은 이 캐시만 읽는다(런타임 API 호출 없음). 수집이 거부된 달은 status=failed로 남고 비교군에 들어가지 않는다.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/reference/auction-price/024001-2023-11.json` | 2,910 | `a5412676f28134728660e9937d02c5d63211958a9554cff2efadb2a0d86cdbd8` |
| `data/reference/auction-price/024001-2023-12.json` | 2,908 | `97920d079ec24cf9e387d056cbe5e3c4baaee6dd18903dd0d2c93aa78b442e91` |
| `data/reference/auction-price/024001-2024-01.json` | 3,041 | `c78157815aad5d07cf87d67875ae94c943f899903c5c467456924011f430c01a` |
| `data/reference/auction-price/024001-2024-02.json` | 2,773 | `22ad0af152eddc97032fe4442de867fde77efb4ce67a9bb33de709b07be97348` |
| `data/reference/auction-price/024001-2024-03.json` | 2,906 | `ee377328bda24b33fd50e6f040e424f530196a78b810247756c465bfc5b0d424` |
| `data/reference/auction-price/024001-2024-04.json` | 2,774 | `7bde8cfa7d3733097ffa0afadf90d2f91125877d7637887e8b5fbf13dbf81cea` |
| `data/reference/auction-price/024001-2024-05.json` | 2,906 | `c3f385027bce8004c8d90b12a1928e1ed0cd8cb02a5e8d41f9443d53014874bf` |
| `data/reference/auction-price/024001-2024-06.json` | 2,774 | `a846f6bb7b0e27598c501c57fd1d357ceb2c68a58b8e4bf0163fc857a03584bb` |
| `data/reference/auction-price/024001-2024-07.json` | 2,906 | `81f02a2409a93db6de161e8e8ad29f970f4e23a3ce18ab8fe61af4623f808519` |
| `data/reference/auction-price/024001-2024-08.json` | 2,908 | `367d9c45fecafdc92afb82d0158d1438d16faeb10707f8af758290607da16b41` |
| `data/reference/auction-price/024001-2024-09.json` | 3,039 | `548956ecb0b36acc121641721be6dc85070c1ca7335d41d23b5db28fa3b36fbb` |
| `data/reference/auction-price/024001-2024-10.json` | 2,909 | `22a4f9fc13f5e18db539b35c29d97c46fdb17df6faed8927832cc3bb4ac1898d` |
| `data/reference/auction-price/024001-2024-11.json` | 2,909 | `0b622fba8ee23280c48cf0f5c032442cc53d4a89509860f2a27c17911e9b9381` |
| `data/reference/auction-price/024001-2024-12.json` | 2,911 | `2de3bc5be375808df31f53f063b07f84e4a3720cbfc99e28ef06a12fcc4eeb18` |
| `data/reference/auction-price/024001-2025-01.json` | 2,912 | `aceb45b7ba653dcd928471d32e812220613016ad84fa376df0fd6e6fac6384d1` |
| `data/reference/auction-price/024001-2025-02.json` | 2,773 | `2c31fd4886bebb63ecef8b7f3d644c93b60e804c1d06ecc92e76513fa37e75cd` |
| `data/reference/auction-price/024001-2025-03.json` | 2,909 | `4a4a36541ef18038031d3bf69ec1642956d890b36d16f04474cae2d1747622e6` |
| `data/reference/auction-price/024001-2025-04.json` | 3,043 | `e384d83e083a766a9ca3ad8529a308168e8596f5c860a58b11169dccd655bdf5` |
| `data/reference/auction-price/024001-2025-05.json` | 2,911 | `279def1532a1efef79ab190e1086359537ba4455c13053aa398d7a0f54b45896` |
| `data/reference/auction-price/024001-2025-06.json` | 2,910 | `bdece9fb1a7214b0987a75e245cfd2cc0fc649e7778bfe1f1a660e77edd4b9d4` |
| `data/reference/auction-price/024001-2025-07.json` | 2,778 | `4acaa7f19ba7b0108b69044d8984d58051263b3c769190bc08f22313c6879dee` |
| `data/reference/auction-price/024001-2025-08.json` | 2,911 | `b4d8822097aeb26b7edecee4b5788424e385590b5338886afc987c295afb2943` |
| `data/reference/auction-price/024001-2025-09.json` | 2,912 | `b42619c07fcea22c1fab046054e16d97af7797825a84d04bbc7d69e0fa09e3ca` |
| `data/reference/auction-price/024001-2025-10.json` | 2,777 | `9ceba0899fcb19b32f8e33a83013f017d71273a54bf9df497e8a64b1424fca6b` |
| `data/reference/auction-price/024001-2025-11.json` | 2,646 | `03e187844fa97d71cbe9d80f2322c26367769d25b27b2256f784fc4d6b135286` |
| `data/reference/auction-price/024001-2025-12.json` | 2,911 | `4ce4656cc2b105f73c0ff9d181c7400adde74622b29a66b4be2dd76f386cd2fd` |
| `data/reference/auction-price/024001-2026-01.json` | 3,045 | `ad66a2594b1199e42ad9c07175d668228a8f92fc4f2671affa3e33514d03b08d` |
| `data/reference/auction-price/024001-2026-02.json` | 2,909 | `5d42ff89570494d1608a0942a9e7d679a79b43131ef9361bfef442fa41d94797` |
| `data/reference/auction-price/024001-2026-03.json` | 2,909 | `057191647cb520e41679dc40e4bed04322e74312eb9bb522301923e9374e3938` |
| `data/reference/auction-price/024001-2026-05.json` | 2,910 | `bd2d6a623fe5d27da5ef5548e8b2d832960ada2aadd116768a64360f1c1966f4` |
| `data/reference/auction-price/024001-2026-06.json` | 2,910 | `38895fdcd3b41353b8f6fe524156e992b6853c8df29a101de639ca3fe315a126` |
| `data/reference/auction-price/024001-2026-07.json` | 2,910 | `1cf72fbee49bbc0c077683f56c4ecdeaf5a84d1b498636692f74ee7dbf282707` |
| `data/reference/auction-price/024001-2026-08.json` | 2,902 | `048efb1156ca18cc9ec4582ca0d82bb7f043143fe3723e847486e26b6e1aea5a` |
| `data/reference/building-register/11650-10800-1678-0004.json` | 666 | `8e1aaf9a6caeed472ab872af079698529d14106b4448379810f26dfe4f7757ca` |
| `data/reference/pig-auction-price/pig_price_20260815021618.csv` | 40,445 | `673a3ca60df390f1df2c623306e7bf846784958736ded9c29aee175162dcd13d` |
| `data/reference/pig-auction-price/pig_price_20260815021618.meta.json` | 1,035 | `2d62daccfdbcc13ecb882df975b3275e1cc6f49daf6408882ff69a74fe87af83` |
| `data/reference/rag/onboarding.json` | 1,345 | `b032ef0f4ddb64b56c18f4cbc271ed08b7528bf8cac2ebc485c397e4d12f07b3` |
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
| `data/offers/filing-facts/livestock-9.json` | 2,637 | `922c7310902aef3bf925eab22c59bbedb4bf61420950ce50b4bc7dc522c4c8e5` |
| `data/offers/filing-facts/pig-1.json` | 2,005 | `4f15e93b1833ae19d654e0f523280069ff21c1cb9a191f018ef80a3bd2810826` |
| `data/offers/filing-facts/pig-2.json` | 1,932 | `61323e19a54b212b367dde5daa5d4f5995ad0d50d950288a2d8d8f56ef758fe8` |
| `data/offers/filing-facts/pig-3.json` | 1,916 | `e246f6fc8080627b48d70314510810c7099e2edbc8676f2db2ca146ebc31a199` |
| `data/offers/real-estate-a.json` | 2,399 | `ec380f2f23d763d365db2aca2022c221d9bf89ca3c4e18a4bc6f733580975c08` |
