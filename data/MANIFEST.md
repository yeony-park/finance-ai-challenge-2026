<!-- 이 파일은 `npm run data:manifest`로 생성됩니다. 직접 수정하지 마세요. -->

# data/ 매니페스트

생성 시각: 2026-08-14T18:35:46.117Z

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
| `data/raw/20240220002223/20240220002223.xml` | 2,006,599 | `59e68d9fb20b9c3284f2c837d76b4a386537f481a959f561eee73489c95576c7` |
| `data/raw/20240503000803/20240503000803.xml` | 3,405,612 | `22c16a35aaa48b2cb6c534ea82c7d0f3e4d0e19935089466c7bcf00465670391` |
| `data/raw/20240528000156/20240528000156.xml` | 2,932,383 | `cc71dabb51dfc78c76568440445009eedc1c8620dfff969efb74f1751ace7cff` |
| `data/raw/20240618000419/20240618000419.xml` | 2,759,451 | `68ef0ac0fab4bb08deea6ca1e3e23a681c9d1e187bd40249fce7c4a8c884e986` |
| `data/raw/20240619000091/20240619000091.xml` | 2,710,421 | `cacef1a10e71481e99dc04a3e99b17f8d0fe804799a04912cc01ded00ce3fa1a` |
| `data/raw/20240705000021/20240705000021.xml` | 56,524 | `69f69ceb5efc37c02c3711097d5c79afe70108ad3a4639f01b1332a86caa34d3` |
| `data/raw/20240722000088/20240722000088.xml` | 308,321 | `989b56e386aa5ab38bea4bac1e68d32d6c89fcb532f3115ab25766b4dba9740a` |
| `data/raw/20240821000374/20240821000374.xml` | 2,507,784 | `48e13cc7a42fe969f756cf4a719f3b9e86d96a66699806b94c618b78cf3c4fc7` |
| `data/raw/20240911000124/20240911000124.xml` | 3,026,151 | `6e8c9e01c73ffb2afeef3cbcf6de5f8c5c93da4ee3d00fe695dcc133afccd2b1` |
| `data/raw/20241025000121/20241025000121.xml` | 58,276 | `9741911fd4e03f476b021dad6760a03768cae7b7d31fc06c395b3cc653475037` |
| `data/raw/20241107000042/20241107000042.xml` | 277,811 | `092f00dc3f9117a55f571757bedfca0e3afdd791803468f7a3012857e3473591` |
| `data/raw/20241122000010/20241122000010.xml` | 465,470 | `affcf713e9d2f70218a4bce72ac340dc13c7b5a9a94dfc768c4bc4bcdcd4d57d` |
| `data/raw/20241202000302/20241202000302.xml` | 2,480,387 | `88651e11da1f123857e192456fe30f50cf14017d1a37380980446858e45e6eee` |
| `data/raw/20241220000182/20241220000182.xml` | 2,568,645 | `80ba34032343786b06702a4b9ec8dd5d6e3269121b744256b79bc8e9d5c72056` |
| `data/raw/20250203000066/20250203000066.xml` | 54,121 | `3986f8309d60c5c2ebda64354a2f8980d1e2c1d62d2b649c69e01d1caa46956e` |
| `data/raw/20250219001270/20250219001270.xml` | 109,558 | `7b92646791896e1f7679060ce4e8278d813c3ef1bdacac21a504d2d3365d28eb` |
| `data/raw/20250310000915/20250310000915.xml` | 3,647,580 | `079a0827378010c0ce26721842db8a77f4987d00a3b00ebe225038c11db993c6` |
| `data/raw/20250331004328/20250331004328.xml` | 3,323,449 | `5a4d30387bfa5442a8d04348e043c59bbc027beac774ffdb41424dab47c5cddd` |
| `data/raw/20250421000094/20250421000094.xml` | 2,729,594 | `cf6abbcfa09b0dfce5a7661e5a3264875a7784602fc666f6ee56aa5c8c71dcb3` |
| `data/raw/20250507000443/20250507000443.xml` | 48,669 | `7e2f6a0a65d75e3c5ea2ac8108b060d09fd77d0c35b698edbfe434b694373189` |
| `data/raw/20250508000518/20250508000518.xml` | 2,994,715 | `c0eed5c085ceb1e6a27c29f9f81dfbe8f4280f8117af0101a780693a874dd1e4` |
| `data/raw/20250515001113/20250515001113.xml` | 106,849 | `dbc8f733cbdf77f5fba8c0d3d5f81845df98e60cab21dccbc0c035cc62f6a2d9` |
| `data/raw/20250526000153/20250526000153.xml` | 3,649,308 | `193d6904b1ca388ddc622cce412c8b5b00c5dc716d30f1fbf48b0de934989f21` |
| `data/raw/20250617000216/20250617000216.xml` | 3,370,736 | `f3fe3b6d9ba68d1890a628453ae6d69f651693063476b75da58ae8c5ed5d95e6` |
| `data/raw/20250703000286/20250703000286.xml` | 47,014 | `66d6593499bd27412e2fa48c33a446d3350da89a61d5a31e37acd87bc82ae195` |
| `data/raw/20250718000392/20250718000392.xml` | 92,953 | `df1c0887849fc1be08de781354748639f4714fa561c67af79371061822c6d405` |
| `data/raw/20250731000259/20250731000259.xml` | 146,479 | `dde30a83ce3c07fad6daa1ec084bb44c9e5be97f97462742a8f41a01de6a476e` |
| `data/raw/20250814001208/20250814001208.xml` | 191,688 | `ab7eb5d0759e6dabb132e0a88b8979ba59b1c026ac5def178adc5d3df125e941` |
| `data/raw/20251010000109/20251010000109.xml` | 2,566,796 | `6cd2143b27e523bf7574cd99f41e22ca8931b4a54ef9e330689dc39f8a1c0943` |
| `data/raw/20251031000477/20251031000477.xml` | 3,108,569 | `84009275f5de140dd03fb870332f58d80999668d3d6566da43d86b3761f5b501` |
| `data/raw/20251210000027/20251210000027.xml` | 66,795 | `3cf004fd18dbd2685e7c8011aec8dedadf245b0ca71078aea80303954bd6f841` |
| `data/raw/20260102000083/20260102000083.xml` | 156,031 | `4d79f5d43cebf1e62365951ea604c63233f7c37fdbab69032a8e8e5b344c06de` |
| `data/raw/20260107000209/20260107000209.xml` | 2,550,068 | `787b29409d421237447f38616cc3727794adfa5ef4228f72376f2e8f4e7bb9f6` |
| `data/raw/20260108000122/20260108000122.xml` | 1,954,569 | `4316bc0739a77d9295389082641d2650d2f80c4d736e777223390c26e6d48e40` |
| `data/raw/20260203000427/20260203000427.xml` | 2,528,345 | `04be5f4dcdb9704adcff3b45191a927fa0a140d9c4f0daa477637e012dace21f` |
| `data/raw/20260210000785/20260210000785.xml` | 2,616,902 | `50af1fda779f314e239001c146801e8bd312c0c9eb5ec6fa8f74b5e044fb9c48` |
| `data/raw/20260225002022/20260225002022.xml` | 2,617,705 | `ef2f2b978ba8d60fe8c45b7cd5efe29266466cadb98fd64e2442dede46f7b054` |
| `data/raw/20260318001460/20260318001460.xml` | 63,350 | `43e9a44f7920b605e2c1ec1816036f81236a1240828498321f76ac244797d1f9` |
| `data/raw/20260326001272/20260326001272.xml` | 2,949,510 | `f64cd09824179e1a49355711ff52cbd57072475b60153facd4449a41ca3555ac` |
| `data/raw/20260327001646/20260327001646.xml` | 2,967,256 | `338ef14d12d19778d2e9040053c74ae4187fa18378873c86ba0906684057c38b` |
| `data/raw/20260331004796/20260331004796.xml` | 138,280 | `4fcbfc22d0d9f60f66c92797a00a98e7907963a79716a11d527adab548350c1f` |
| `data/raw/20260414002068/20260414002068.xml` | 3,007,078 | `6415f8f8a16ebf90983ca9fe7e526af792e18376bbcdbea05851da830cd42d88` |
| `data/raw/20260420000157/20260420000157.xml` | 2,450,167 | `d47c868369c30b435851411669c899208eada23a1fdf2882664d1b3b52453dd2` |
| `data/raw/20260508000364/20260508000364.xml` | 62,470 | `719d130de19cdb0f6ed68c49c83953840f4d97bf1ff979dae09e32c7adcbf11e` |
| `data/raw/20260605000175/20260605000175.xml` | 2,477,125 | `4c1d0f7358bfea53003e893fd246d9f27582a68436bfd313e28744b0c1ecfd53` |
| `data/raw/20260611000015/20260611000015.xml` | 122,489 | `bab3e9f6776ff0099462fcec18ad9838845a08966f586099beb198a4c40c80b6` |
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
| `data/reports/livestock-1/report-2026-08-14T17-37-47-180Z.json` | 341,606 | `d643fad4379e1a3d2f8b31e46938b0ecab6834b0c659c02f9f4416d7feaa4479` |
| `data/reports/livestock-1/report-2026-08-14T17-49-02-486Z.json` | 459,542 | `4a6fcfae83cf3e01615255fcf581c7c34dc1151ab2835bc883898706cf4fee38` |
| `data/reports/livestock-1/report-2026-08-14T18-00-27-489Z.json` | 597,629 | `00420f9fe1f598f92cf3ebb6eb553d564ef03a5cd6175e98cb2da1cc2b3d7b56` |
| `data/reports/livestock-1/report-2026-08-14T18-14-36-550Z.json` | 597,601 | `bac6d6b61bc48b3f9966fdece6be85464797af60064786402d9dbbefcfa57301` |
| `data/reports/livestock-2/report-2026-08-14T17-39-07-433Z.json` | 301,927 | `38063ac65b2e9f7edb0690eb40314113528c00666b4a65143d07916e5fed388d` |
| `data/reports/livestock-2/report-2026-08-14T17-50-23-750Z.json` | 405,263 | `a9edf5270ffb0e2c6433dbe65aeb1bc1f2edd660651557fcf98e1f82ce8cec23` |
| `data/reports/livestock-2/report-2026-08-14T18-02-03-615Z.json` | 524,006 | `0c169f05423dcd8d64384297bf5d227a9d77e4acfb9de06544152c12a4b844db` |
| `data/reports/livestock-2/report-2026-08-14T18-17-47-890Z.json` | 523,978 | `df0574c0a8bbfbed84f31ed58d866dcff101e34923fc348e529000b517bd470e` |
| `data/reports/livestock-3/report-2026-08-14T17-40-27-385Z.json` | 302,206 | `fedee81475f24c4a7ad0eb6efdc3849168ca3975e7c3541f4d0537bb4961d218` |
| `data/reports/livestock-3/report-2026-08-14T17-51-54-445Z.json` | 440,945 | `37c5bd1c5a22449169ce08569a6dc9a8a7d9333deeefeeb8a59bdfd741ef9b5e` |
| `data/reports/livestock-3/report-2026-08-14T18-03-29-214Z.json` | 573,539 | `27ff6c38d004bd8c8a60c03872d4c8cca0b3cd153ea141c37cee10ac78ab1e05` |
| `data/reports/livestock-3/report-2026-08-14T18-21-45-354Z.json` | 573,511 | `21d9789e0f25c8fcd57ee58c42e3ace709b535397500cdb45a324c21e2dc3de7` |
| `data/reports/livestock-4/report-2026-08-14T17-42-11-001Z.json` | 316,205 | `968753d515480b12f6b9f8055c12dd1a37acf5b30ec93dc67b39042457a405ec` |
| `data/reports/livestock-4/report-2026-08-14T17-53-24-537Z.json` | 447,999 | `1dedcc05b75fc498df1bf10eb4d4d20ba2af82db74adbfe1ddb2c867a05290c3` |
| `data/reports/livestock-4/report-2026-08-14T18-05-28-256Z.json` | 576,472 | `4806b27e6c31783aec1561bf99503d7b33336bf1c252d116de2e09e07a722071` |
| `data/reports/livestock-4/report-2026-08-14T18-27-09-373Z.json` | 576,444 | `722ce64cf77aef8757022948ad4f4808c78ae1d869fc62cff60b8b24e2a38207` |
| `data/reports/livestock-5/report-2026-08-14T17-43-25-627Z.json` | 241,367 | `aed7b1dbb4d9df70f64f83e063c5b270c9af0129d995ed89b1662a03be22cb9d` |
| `data/reports/livestock-5/report-2026-08-14T17-54-36-652Z.json` | 341,211 | `5b2046709769c778a05e0a64313d92e349b08431faf70ab9606b9540d03ea0b4` |
| `data/reports/livestock-5/report-2026-08-14T18-06-53-703Z.json` | 441,774 | `bb58471a88b9653b639960e26a2d4739ee7f3f55f6940a7e19daec540bc72458` |
| `data/reports/livestock-5/report-2026-08-14T18-29-57-467Z.json` | 441,746 | `bcc9ba87a95a7b84ad595ad42ef4b499cd336d9900495b7e0e652e08296bc413` |
| `data/reports/livestock-6/report-2026-08-14T17-44-54-480Z.json` | 416,190 | `beab7d9da85ed6756ca4a9047d7768293067468bd1e0ccbc359ecd28f44a2f7d` |
| `data/reports/livestock-6/report-2026-08-14T18-08-34-097Z.json` | 537,817 | `934aa8ce8156a80b846152432e69705f46b551a193b04ad3c052531c378f3b57` |
| `data/reports/livestock-6/report-2026-08-14T18-33-15-584Z.json` | 537,789 | `74b6ae29da9f68777a0c40c2c8e2d0953635a5d969e8de115299ed26ddb73b4e` |
| `data/reports/livestock-7/report-2026-08-14T06-19-19-348Z.json` | 460,282 | `ada055ff4619b52ce431ca2a1d4c8812898076293cf09d1a662c338fc8c952c0` |
| `data/reports/livestock-7/report-2026-08-14T15-26-28-272Z.json` | 464,149 | `9090cfeb6ca5db1c0ee2df3f6f1f526408bec7f1b2e56e9a201d4b7be58ec230` |
| `data/reports/livestock-7/report-2026-08-14T15-35-45-701Z.json` | 464,121 | `22ecb96f6c5e9b2a520dcf96696cbec66807820e6572220870486b8e7783e6b3` |
| `data/reports/livestock-7/report-2026-08-14T17-06-34-000Z.json` | 464,121 | `9c6fb54e47cdc5f850f5139b6b017f16788ee235f8d657e9dc3109e4ce44e825` |
| `data/reports/livestock-7/report-2026-08-14T17-16-17-542Z.json` | 464,121 | `91ba1f584b19f8d9280bf23327a015c956c335c9e748eec3955feb2f0262e40a` |
| `data/reports/livestock-7/report-2026-08-14T17-25-29-254Z.json` | 464,121 | `c382da62b094535b6fe96b9d88b871442e3dc78d334c7d50e9abdb7488049ea2` |
| `data/reports/livestock-8/report-2026-08-14T06-37-40-268Z.json` | 754,531 | `4e1c398c0e1c97057b4f00f7d93a3b07d0a6769b2309280c6146b25dc35b6edb` |
| `data/reports/livestock-8/report-2026-08-14T15-29-10-613Z.json` | 758,621 | `18889f9750bab582382a59c4367c3ffade072ffc9f6b2a8c37fbdbf3effa94ba` |
| `data/reports/livestock-8/report-2026-08-14T15-41-05-021Z.json` | 758,424 | `b53d59272402ba720bf5c8202a4f4b1c67bfd4a6f52df176df4ee8fb2dc399fa` |
| `data/reports/livestock-8/report-2026-08-14T17-12-30-598Z.json` | 758,424 | `ea4a02aba3456afd58d4cacc53a6e8ec83178f7ba970cbb6c1946a11a8d4b619` |
| `data/reports/livestock-8/report-2026-08-14T17-20-43-676Z.json` | 758,424 | `75ab639d07333605346375e71cd550faf297c915efa2f28551f9269b2ec90066` |
| `data/reports/livestock-8/report-2026-08-14T17-30-09-105Z.json` | 758,424 | `2c814373e01a15a471e404dff289544cb518447343a779d90b6956256c2b1a09` |
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
| `data/reports/livestock-9/report-2026-08-14T05-36-57-401Z.json` | 417,352 | `bd46727e85663ab65c169a2e9521fb2375e89e282ebb7b2276d84eaa018f9319` |
| `data/reports/livestock-9/report-2026-08-14T05-52-59-028Z.json` | 410,120 | `755134d0368495f657fa73c8660fd1d811b02c496a74ee3b24712685f7cc601b` |
| `data/reports/livestock-9/report-2026-08-14T15-30-30-662Z.json` | 412,280 | `9ee0dfa4b5709251a7db9f6efc9eaa0c9942bc67a68eabbd99bbd3ecda6d1054` |
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
| `data/public/real-estate-a/narrative-latest.json` | 4,203 | `ba5978b954e4e0c8bcc17ae28cf5a18925f77f8ae9afafdda574c5925af8122f` |
| `data/public/real-estate-a/report-2026-08-13T17-53-03-085Z.json` | 15,168 | `931ed4b78f166004a50fc90e7b0b9cf9689170baf76f7091e4cb6f6b629e7387` |
| `data/public/real-estate-a/report-2026-08-14T04-34-57-566Z.json` | 50,960 | `659b739f067591b35ece1f3da4b16e80794c85591b600f01f6e2cb1e301db753` |
| `data/public/real-estate-a/report-2026-08-14T04-53-03-242Z.json` | 50,960 | `902e90ecea4e77d53e309e350767f985ac8e1d646df1ddf743900e7e0106c25b` |
| `data/public/real-estate-a/report-2026-08-14T04-54-06-189Z.json` | 51,237 | `fe2b4434b20657a1cb2872bae4622085043c189bf96af2dc01d705a7e338513e` |
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
| `data/public/replay/livestock-9/diff-2026-08-13T17-46-58-162Z.json` | 3,453 | `2d47535b23c709247f30905bb5c97c56fdbf04f87c59d921a749d686aea991e2` |
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
