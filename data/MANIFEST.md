<!-- 이 파일은 `npm run data:manifest`로 생성됩니다. 직접 수정하지 마세요. -->

# data/ 매니페스트

생성 시각: 2026-08-13T14:58:43.859Z

## 저장 정책

개인정보(농장주 실명·상세주소·농장번호)가 담긴 원천 데이터는 git에 올리지 않는다.
커밋되는 것은 **이 매니페스트**와 **마스킹이 끝난 공개 산출물(`data/public/`)** 뿐이다.

| 구분 | 경로 | git |
|---|---|---|
| 원문 | `data/raw/{rcpNo}/` | 제외(.gitignore) |
| 실측 스냅샷 | `data/snapshots/` | 제외(.gitignore) |
| 내부 리포트 | `data/reports/{offerId}/` | 제외(.gitignore) |
| 공개 리포트 | `data/public/{offerId}/` | **커밋** |
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
