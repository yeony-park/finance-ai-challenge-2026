# API 계약 (API Contract)

> **상태: v1-draft (팀 리뷰 요청)** · 2026-08-23 · 타입 단일 진실: `src/lib/verify/live/response.ts`(현행) — 문서와 타입이 다르면 타입을 따르고 문서를 정정한다.
> 근거: `00-overview.md` 결정 8(캐시 경계), `06-ai-guardrails.md`(대화 라우트 게이트), api-design 스킬 규약.

## 0. 제1원칙 — API는 예외 경로다

이 서비스의 기본 데이터 경로는 **API가 아니라 파일 캐시**다:

- **화면 내부 소비는 API를 만들지 않는다.** 목록·리포트·카테고리 착지 화면은 서버 컴포넌트가
  `data/public/{offerId}/report-*.json` 등 사전 생성 산출물을 직접 읽는다. "프론트가 백엔드 API를
  호출한다"는 통상 구조를 여기서는 채택하지 않는다 — 내부 화면용 REST CRUD를 제안하는 PR은 계약 위반이다.
- API 라우트는 다음 3가지 예외에만 존재한다:
  1. **라이브 예외** — 사용자가 명시적으로 요청한 실시간 재대조 (`POST /api/verify/{id}`)
  2. **운영 자동화** — cron·헬스체크 (`/api/cron/*`, `/api/health`)
  3. **AI 표면** — 대화형 검색 등 스파인 경유 표면 (M2+, §4)

새 엔드포인트가 이 3분류에 들어가지 않으면 만들지 않는다. 필요해 보이면 계약의 결함으로 보고 이 문서를 먼저 고친다.

## 1. 공통 규약 (전 엔드포인트 의무)

### 1.1 URL·메서드

- 경로는 `kebab-case` 명사, 동작은 HTTP 메서드로 표현. 예외적으로 파이프라인 동작(verify 등)은 POST + 동사 허용.
- **버저닝 없음(현행 유지)** — 심사용 단일 배포이므로 `/api/v1` 프리픽스를 도입하지 않는다.
  대회 이후 외부 공개 시점에 `/api/v1`로 승격하며, 그 전까지 breaking change는 배포 단위로 일괄 반영한다.

### 1.2 응답 형태

- **성공은 도메인 바디 그대로**(봉투 없음), **에러는 고정 형태** — 현행 구현(`LiveVerifyError`) 계승:

```jsonc
// 에러 (4xx/5xx 공통)
{ "error": "<코드>", "message": "<사용자 문장>" }
```

- 성공/실패 구분은 HTTP 상태코드가 담당한다. `{ success: true }` 류 이중 표기 금지.
- `message`는 사용자 대면 한국어 문장이며 `04-expression-rules.md`를 따른다 (내부 스택·키 이름 노출 금지).
- 열화 모드 정직 표기: 라이브 실패로 스냅샷을 반환할 때는 200 + `mode: "snapshot"` + `note`로 명시한다.
  조용한 폴백 금지 (`06-ai-guardrails.md` §4).

### 1.3 에러 코드 레지스트리

| 코드 | 상태 | 의미 |
|---|---|---|
| `validation_error` | 400 | 요청 형식·파라미터 불량 (Zod 경계 실패) |
| `unauthorized` | 401 | cron 인증 실패 등 |
| `not_found` | 404 | 미공개·미존재 offerId 등 |
| `rate_limited` | 429 | 레이트리밋 — `Retry-After` 헤더 필수 |
| `upstream_failed` | 502 | 외부 원장(DART·공공 API) 호출 실패, 스냅샷도 없음 |
| `not_configured` | 503 | 실키 미설정으로 실행 불가 (정직 표기 — 500으로 뭉개지 않는다) |

새 코드는 이 표에 추가 후 사용한다. 코드는 `snake_case` 고정.

### 1.4 헤더·캐싱

- 동적 응답은 `Cache-Control: no-store` (현행 계승).
- 429에는 `Retry-After: <초>` 필수.
- 레이트리밋 정보 헤더(`X-RateLimit-*`)는 대화 라우트 신설 시 함께 도입한다.

### 1.5 경계 검증·판정 어휘

- 모든 요청 입력(바디·쿼리·동적 세그먼트)은 핸들러 진입 즉시 Zod로 검증한다. 외부 응답도 동일 (`01` §1).
- API 표면의 판정 값은 엔진 3값(`match | mismatch | unverifiable`)을 **그대로** 내보낸다.
  화면 5상태 프로젝션(`02-vocabulary.md`)은 클라이언트 렌더 층의 책임이다 — API가 미리 번역하지 않는다.
- 비율·게이지·집계 점수 필드 신설 금지 — 건수(`summary.subjects/items`)만 허용 (`04` 계승).

## 2. 현행 엔드포인트 (implemented)

### GET `/api/health`

인증 없음. 배포 무중단 감시용.

```jsonc
// 200
{ "ok": true, "uptimeSeconds": 123, "checks": { "corpusDocs": 7 } }
```

### POST `/api/verify/{offerId}` — 라이브 재대조

- 인증 없음 · IP 단위 레이트리밋(`createLiveVerifyGate`) · `Cache-Control: no-store`.
- 성공 바디: `LiveVerifyBody` (`src/lib/verify/live/response.ts` — offerId, `mode: "live" | "snapshot"`,
  verifiedAt, document{rcpNo, submittedOn}, sources[], summary{subjects, items 건수}, subjects[], notes[]).
- 상태: 200(live 또는 snapshot 폴백) · 404 `not_found` · 429 `rate_limited`(+Retry-After) ·
  502 `upstream_failed` · 503 `not_configured`.
- 응답의 리포트 내용물은 반드시 `toPublicView`(마스킹 브랜드 타입 `PublicReport`)를 거친다 — 원본 스냅샷 직렬화 금지.

### GET `/api/cron/monitor` — 정정 감시 (vercel.json cron 주 2회)

- `authorizeCronRequest` 인증 필수 — 실패 시 401.
- 키 미설정 시 실행 생략을 정직 표기(§1.3 `not_configured` 문형)로 응답한다.
- 수동 호출은 운영자 디버깅 한정 — 화면·외부 문서에서 이 URL을 안내하지 않는다.

## 3. 확장 예약 — 카테고리 라이브 재대조 (M2+, planned)

`POST /api/verify/{offerId}`는 카테고리 공통 계약이다. 신규 카테고리(pig·art·real-estate) 공모가
공개 목록에 오르면 **같은 엔드포인트·같은 바디 형태**로 동작해야 한다:

- 어댑터 주입은 카테고리 디스크립터(`01` §1)의 `implemented` 어댑터에서 해석한다 — 라우트에 카테고리 분기 금지.
- 해당 층이 `unsupported`인 카테고리는 그 층 판정을 생략하고 `notes`에 불가 사유를 싣는다 (unsupported도 1급 답).
- 라이브 불가 카테고리(예: 원장 API 없음)는 404가 아니라 200 + `mode: "snapshot"`이 정답이다.

## 4. 확장 예약 — AI 대화형 검색 `POST /api/search` (M2+, planned)

메인 화면 AI 검색(결정 6)의 단일 진입점. **`06-ai-guardrails.md`의 4게이트(레드팀·전역 한도·킬스위치·강등
리허설) 전부 통과 전에는 공개하지 않는다.** 여기는 형태 계약만 정의한다.

```jsonc
// 요청
{ "query": "한우 공모는 뭘 확인해야 해?", "categoryId": "cattle" /* 선택 */ }

// 응답 (스파인 응답 유니언 그대로)
{
  "kind": "answer" | "abstain" | "blocked" | "pending_action" | "rate_limited",
  "responseType": "education" | "routing" | "verified_fact" | "out_of_scope",  // 06 §2의 4유형
  "message": "...",                       // 출력 필터 통과 문장
  "citations": [ { "sourceId": "...", "label": "...", "asOf": "2026-08-01" } ],
  "degraded": false                       // 열화 모드 여부 정직 표기
}
```

- `citations[].sourceId`는 코퍼스 레지스트리(`spine/rag/corpus.ts`) 또는 RAG 문서 저장소(`09` §4)
  등록분만 허용 — 미등록 인용은 스파인이 abstain으로 강등한다.
- 검증 사실 인용(③유형)의 근거는 **사전 생성 리포트 캐시만** — 대화 중 라이브 원장 호출 금지 (`06` §3).
- 다건 대화 이력은 서버에 저장하지 않는 것을 기본값으로 한다. 입력 로그 보존은 `05` §4(30일) 준수.
- 세션·대화 이력이 없으므로 페이지네이션·커서 없음. 목록형 API가 향후 생기면 커서 방식을 기본으로 한다.

## 5. 검증

- 라우트 핸들러는 로직을 `src/lib/`로 위임하고(현행 verify 라우트 미러) 라우트 파일은 배선만 담당한다 —
  로직은 라우트 단위 테스트가 아니라 lib 단위 테스트(`live-revalidate.test.ts` 미러)로 검증한다.
- 새 엔드포인트 PR 체크: ① 3분류(§0) 해당 여부 ② 에러 코드 레지스트리 준수 ③ Zod 경계 ④ 마스킹 경유
  ⑤ 키 없는 환경(fake)에서의 응답 정의 ⑥ 레이트리밋. 여섯 항목 전부 PR 본문에 명기한다.

## 팀 결정 대기 (기본값 병기)

| 항목 | 기본값 | 근거 |
|---|---|---|
| `/api/search` 명칭 | `search` 단일 (chat 별도 신설 안 함) | 이중 대화 UI 방지 결정 계승 |
| 외부 공개 API 여부 | 대회 기간 비공개(문서화만) | 심사 URL 무중단 우선 |
| 레이트리밋 저장소 | 전역 KV 1개 (06 게이트 2와 공용) | 서버리스 인스턴스별 근사 한계 |
