---
scope: src/app/api/** 및 응답 형태에 닿는 모든 변경
read-when: API 라우트 신설·수정, 에러 응답 작성, 검색(/api/search) 구현
source-of-truth: src/lib/verify/live/response.ts (LiveVerifyBody·LiveVerifyError)
rationale: docs/spec/08-api-contract.md
---

# API 계약 (API)

## 신설 가부

- **R-API-01 (MUST)** API는 예외 경로다. 신설은 3분류만 허용: ①라이브 재대조 ②cron·헬스체크 ③스파인 경유 AI 표면. 화면 내부 소비용 REST(목록·리포트 GET 등)는 **만들지 않는다** — 화면은 캐시 직독(R-INV-01).
- **R-API-02 (MUST)** 3분류에 안 들어가는 엔드포인트가 필요해 보이면 구현하지 말고 계약 결함으로 보고한다.

## 응답 형태

- **R-API-03 (MUST)** 성공 = 도메인 바디 그대로(봉투 없음). 에러 = `{ "error": "<snake_case 코드>", "message": "<한국어 사용자 문장>" }` 고정. `{success: true}` 류 이중 표기 금지.

```jsonc
// 위반                                        // 정정
{ "status": 200, "success": false,            HTTP 404
  "error": "Not found" }                      { "error": "not_found", "message": "공개된 공모가 아닙니다." }
```

- **R-API-04 (MUST)** 에러 코드는 아래 레지스트리만. 신규 코드는 이 표에 추가 후 사용.

| 코드 | HTTP | 의미 |
|---|---|---|
| `validation_error` | 400 | 요청 형식·파라미터 불량 (Zod 실패) |
| `unauthorized` | 401 | cron 인증 실패 등 |
| `not_found` | 404 | 미공개·미존재 offerId |
| `rate_limited` | 429 | 레이트리밋 — `Retry-After` 헤더 필수 |
| `upstream_failed` | 502 | 외부 원장 실패 + 스냅샷 없음 |
| `not_configured` | 503 | 실키 미설정 — 500으로 뭉개지 않는다 |

- **R-API-05 (MUST)** 열화는 정직 표기: 라이브 실패 + 스냅샷 보유 → `200` + `mode: "snapshot"` + `note`. 조용한 폴백 금지.
- **R-API-06 (MUST)** 동적 응답에 `Cache-Control: no-store`. `message`에 스택·키 이름·내부 경로 노출 금지, 문안은 R-INV-08 준수.

## 경계·어휘

- **R-API-07 (MUST)** 요청 입력(바디·쿼리·동적 세그먼트) 핸들러 진입 즉시 Zod 검증. 실패 → `validation_error`.
- **R-API-08 (MUST)** 판정 값은 엔진 3값(`match|mismatch|unverifiable`) 원형 송출. 화면 5상태 번역·비율·점수 필드 신설 금지 — 건수(`summary`)만.
- **R-API-09 (MUST)** 리포트 내용물은 `toPublicView`(브랜드 타입 `PublicReport`) 경유 후에만 직렬화. 원본 스냅샷 직렬화 금지.
- **R-API-10 (MUST)** 라우트 파일은 배선만 — 로직은 `src/lib/`에 두고 lib 단위 테스트로 검증(`live-revalidate.test.ts` 미러).

## 현행·예약 엔드포인트

| 경로 | 상태 | 요점 |
|---|---|---|
| `GET /api/health` | implemented | 무인증, `{ok, uptimeSeconds, checks}` |
| `POST /api/verify/{offerId}` | implemented | IP 레이트리밋, `LiveVerifyBody`, 200/404/429/502/503 |
| `GET /api/cron/monitor` | implemented | `authorizeCronRequest` 필수, 화면·문서에 URL 비노출 |
| `POST /api/search` | planned (M2+) | R-API-11 참조 |

- **R-API-11 (MUST)** `/api/search`는 `docs/spec/06` 4게이트(다턴 레드팀·전역 한도·킬스위치·강등 리허설) 전부 통과 전 공개 금지. 응답은 스파인 유니언 `answer|abstain|blocked|pending_action|rate_limited` + `citations[].sourceId`(코퍼스·RAG 등록분만) + `degraded` 정직 표기. 검증 사실 인용의 근거는 리포트 캐시만 — 대화 중 라이브 원장 호출 금지.
- **R-API-12 (MUST)** 카테고리 확장 시 `POST /api/verify/{id}`는 동일 엔드포인트·동일 바디 유지. 라우트에 카테고리 분기 금지 — 어댑터는 디스크립터에서 해석. 라이브 불가 카테고리는 404가 아니라 200 + `mode:"snapshot"`.
- **R-API-13 (기본값)** 버저닝 없음(`/api/v1` 미도입). 외부 공개 시점에 일괄 승격.

## PR 체크 (신규·수정 엔드포인트 — 본문에 6항목 명기)

① 3분류 해당 근거 ② 에러 레지스트리 준수 ③ Zod 경계 ④ 마스킹 경유 ⑤ 키 없는 환경 응답 정의 ⑥ 레이트리밋
