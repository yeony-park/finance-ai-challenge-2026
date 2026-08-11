<!-- 이 파일은 `npm run data:manifest`로 생성됩니다. 직접 수정하지 마세요. -->

# data/ 매니페스트

생성 시각: 2026-08-11T17:10:27.897Z

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
| `data/reports/bankcow-9/report-2026-08-11T16-02-04-683Z.json` | 268,249 | `52058ab3d1e1deee2dd6ac1bbfaa2ae1984191404b74e83d16e89a9c4bd031bf` |
| `data/reports/bankcow-9/report-2026-08-11T16-04-40-307Z.json` | 260,995 | `5b3ae8b1c736c83bb685970c94366d800009c1f8e0d168b74dce56469c415ecb` |
| `data/reports/bankcow-9/report-2026-08-11T16-06-25-434Z.json` | 268,249 | `457a752e71785d77257674ed3dcc51c52db193c55d852ae79e282bc2605b1923` |
| `data/reports/bankcow-9/report-2026-08-11T17-10-16-301Z.json` | 268,249 | `64037a73965f3882fa2a77b050d346df9f477c5aded789d4d634b6d2d73b1101` |

## 커밋 대상 산출물

### 공개 리포트 (마스킹 완료 · 커밋 대상)

- **출처**: toPublicReport(내부 리포트) 산출
- **재확보**: `npm run verify -- --rcpNo <rcpNo>`
- **비고**: 화면·배포가 읽는 유일한 데이터. 이력번호·개체명·지역·자유텍스트 마스킹 적용.

| 경로 | 바이트 | sha256 |
|---|---:|---|
| `data/public/bankcow-9/report-2026-08-11T16-02-04-683Z.json` | 268,829 | `4b287e9942238e2dca2dc9bc7085ad3f322c1e5080c34155b4d732105a001331` |
| `data/public/bankcow-9/report-2026-08-11T16-04-40-307Z.json` | 261,575 | `47c8ee04f895d509de2565d1df1bed49e17a488a8dc7bed6b1fe4126eb7b31ca` |
| `data/public/bankcow-9/report-2026-08-11T16-06-25-434Z.json` | 268,829 | `7c3b1b007bb7a2e84a928036df7c22581a2426f4705bf0f8ffd8b59a7423d697` |
| `data/public/bankcow-9/report-2026-08-11T17-10-16-301Z.json` | 268,829 | `e71d19b7d65646505bbc68331b7aaa02803731ecc38291f9273f6bbf3a392c6e` |
