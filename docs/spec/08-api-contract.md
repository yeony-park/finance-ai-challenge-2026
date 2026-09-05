# API 계약 (API Contract)

> **상태: v1-draft (팀 리뷰 요청)** · 2026-08-23 초안 · 2026-08-29 3관점 리뷰 반영 · 타입 단일 진실: `src/lib/verify/live/response.ts`(`LiveVerifyBody`) + `src/lib/verify/live/revalidate.ts`(`LiveVerifyError`·`LiveVerifyErrorCode`) — 문서와 타입이 다르면 타입을 따르고 문서를 정정한다.
> 근거: `00-overview.md` 결정 8(캐시 경계), `06-ai-guardrails.md`(대화 라우트 게이트), api-design 스킬 규약.

## 0. 제1원칙 — API는 예외 경로다

이 서비스의 기본 데이터 경로는 **API가 아니라 파일 캐시**다:

- **화면 내부 소비는 API를 만들지 않는다.** 목록·리포트·카테고리 착지 화면은 서버 컴포넌트가
  `data/public/{offerId}/report-*.json` 등 사전 생성 산출물을 직접 읽는다. "프론트가 백엔드 API를
  호출한다"는 통상 구조를 여기서는 채택하지 않는다 — 내부 화면용 REST CRUD를 제안하는 PR은 계약 위반이다.
- API 라우트는 다음 범위에 한정한다:
  1. **라이브 예외** — 사용자가 명시적으로 요청한 실시간 재대조 (`POST /api/verify/{id}`)
  2. **운영 자동화** — cron·헬스체크 (`/api/cron/*`, `/api/health`)
  3. **AI 표면** — 홈 검색과 상품 범위 근거 질문 (§4)
  4. **사용자 승인 공개 조회** — Evidence Copilot에 전달할 공개 상품 문맥 (`GET /api/products`,
     `GET /api/products/{id}`). 현재는 수동 검증한 미술품 5건만 허용하며 화면 내부의 일반 데이터 경로로
     확장하지 않는다. 데이터 원천은 **파일 리포지토리 전용**(R-STO-01 단서) — 런타임 DB 읽기 경로로
     확장하지 않는다.
  5. **AI 상품 문답 (한시 표면·일몰 조항)** — `POST /api/ai/ask-product`. 미술 상품 문맥 한정
     Q&A(라이브 LLM)로, "대화 표면은 `/api/search` 단일" 결정(하단 팀 결정 표)의 **기존 호환 표면**이다.
     존속 요건: ①내구(KV) 레이트리미터 ②출력 필터·요청 가드·입력 스크리닝 경유 ③상품 문맥 밖
     자유 대화로 확장 금지. 기존 수동 검증 미술품 계약을 쓰는 호출처가 남아 있으므로, 동일 기능 이관과 호출처 검증 후 폐지한다.

공개 지도(`GET /api/livestock-disease-map`)는 공개 시·군 기준 자료만 전달하는 조회 표면이다.
새 엔드포인트가 위 범위에 들어가지 않으면 만들지 않는다. 필요해 보이면 계약의 결함으로 보고 이 문서를 먼저 고친다.

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
| `internal_error` | 500 | 요청 처리 중 예기치 않은 내부 오류 (세부 정보 비공개) |
| `upstream_failed` | 502 | 외부 원장(DART·공공 API) 호출 실패, 스냅샷도 없음 |
| `not_configured` | 503 | 실키 미설정으로 실행 불가 (정직 표기 — 500으로 뭉개지 않는다) |

새 코드는 이 표에 추가 후 사용한다. 코드는 `snake_case` 고정.

### 1.4 헤더·캐싱

- 동적 응답은 `Cache-Control: no-store`. 현행 실측: verify·cron은 설정, `/api/health`는 미설정(uptimeSeconds가 동적이므로 후속 정비 대상 — 신설 라우트는 예외 없음).
- 429에는 `Retry-After: <초>` 필수.
- 레이트리밋 정보 헤더(`X-RateLimit-*`)는 대화 라우트 신설 시 함께 도입한다.

### 1.5 경계 검증·판정 어휘

- 모든 요청 입력(바디·쿼리·동적 세그먼트)은 핸들러 진입 즉시 Zod로 검증한다. 외부 응답도 동일 (`01` §1).
  **적용 범위 주의 (2026-08-29 정정)**: 이 의무는 **신설·수정 엔드포인트**에 적용된다. 현행 3종은 입력이
  allowlist 대조(`isPublished`)·인증 헤더 비교뿐이라 Zod 미경유 상태로 소급 미적용(후속 과제) —
  레지스트리의 `validation_error`(400)도 현행 코드에서는 도달하지 않는 예약 코드다.
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

### GET `/api/products` · GET `/api/products/{id}` — 공개 상품 문맥

- 사용자가 승인한 Evidence Copilot 상품 문맥 조회 예외다. 인증 없음 · `Cache-Control: no-store`.
- 목록 쿼리는 `category=art`, `q`, `page`, `pageSize`만 허용하고 Zod 경계에서 검증한다. `pageSize`는
  최대 100이다. 목록 바디는 `{ items, total, pagination: { page, pageSize, totalPages } }`다.
- 상세 id는 `art-{양의 정수}` 형식과 길이를 검증한다. 형식 오류는 400 `validation_error`, 공개 목록에
  없는 id는 404 `not_found`다.
- 공개 대상은 `data/offers/art-1..5.json`의 `manual_verified` 5건뿐이다. synthetic·과거 338건·legacy
  저장본은 결합하지 않으며 외부 원장을 실시간 호출하지 않는다.
- 공개 DTO는 일반명, 금액, 공시 상태·판정 문구와 검증된 HTTPS DART 링크를 포함한다. `media`는
  사용자 승인 임시 예외에 포함된 4상품의 `official_remote` 이미지·상품 원문 URL 또는 이미지가 없는
  상품 5의 `missing`·`null` 값만 허용한다([ADR-0001](../decisions/ADR-0001-temporary-art-image-exception.md)). 내부
  `sourceMeta`, 해시, 원본 payload와 실명 식별자는 직렬화하지 않는다. 상품별 접수번호 allowlist를
  통과하지 않은 관련 상품의 문서는 공개 근거에서 제외한다.

### POST `/api/verify/{offerId}` — 라이브 재대조

- 인증 없음 · 레이트리밋 2단(`createLiveVerifyGate`): 클라이언트 버스트(분당 2회) + **전역 일일 쿼터**(공공 API 쿼터 예산 기반 — 도달 시 전 사용자 429, `src/lib/verify/live/policy.ts`) · `Cache-Control: no-store`.
- 성공 바디: `LiveVerifyBody` (`src/lib/verify/live/response.ts` — offerId, `mode: "live" | "snapshot"`,
  verifiedAt, document{rcpNo, submittedOn}, sources[], summary{subjects, items 건수}, subjects[], notes[]).
- 상태: 200(live 또는 snapshot 폴백) · 404 `not_found` · 429 `rate_limited`(+Retry-After) ·
  502 `upstream_failed` · 503 `not_configured`.
- 응답의 리포트 내용물은 반드시 `toPublicView`(마스킹 브랜드 타입 `PublicReport`)를 거친다 — 원본 스냅샷 직렬화 금지.

### GET `/api/cron/monitor` — 정정 감시 (vercel.json cron 주 2회)

- `authorizeCronRequest` 인증 필수 — 실패 시 401. 인증 실패 응답은 서버 로그에 남긴다(저비용 관측 — 반복 실패는 시크릿 오설정 또는 탐색 시도의 신호).
- 키 미설정 시 실행 생략을 정직 표기(§1.3 `not_configured` 문형)로 응답한다.
- 수동 호출은 운영자 디버깅 한정 — 화면·외부 문서에서 이 URL을 안내하지 않는다.

## 3. 확장 예약 — 카테고리 라이브 재대조 (M2+, planned)

`POST /api/verify/{offerId}`는 카테고리 공통 계약이다. 신규 카테고리(pig·art·real-estate) 공모가
공개 목록에 오르면 **같은 엔드포인트·같은 바디 형태**로 동작해야 한다:

- 어댑터 주입은 카테고리 디스크립터(`01` §1)의 `implemented` 어댑터에서 해석한다 — 라우트에 카테고리 분기 금지.
- 해당 층이 `unsupported`인 카테고리는 그 층 판정을 생략하고 `notes`에 불가 사유를 싣는다 (unsupported도 1급 답).
- 라이브 불가 카테고리(예: 원장 API 없음)는 404가 아니라 200 + `mode: "snapshot"`이 정답이다.

## 4. 홈 검색과 상품 근거 질문 (2026-09-05 구현 기준)

`POST /api/search`는 홈의 상품·일반 지식 검색, `POST /api/evidence/query`는 선택한
상품 안의 근거 질문을 담당한다. 현재 요청·응답은 [서비스 API 명세 §8~9](./10-service-api.md)에 정리한다.
이전 계획의 `kind/message` 응답은 현행 검색 응답과 다르므로 연동에 사용하지 않는다.

원문 승인과 개인정보 검토, 런타임 생성 게이트는 유지한다. 검색 결과·정적 근거가 있다는 사실은
외부 AI 전송 승인을 뜻하지 않는다. 생성할 수 없으면 검색·근거 조회로 강등하거나 답변을 보류한다.
개별 상품 근거는 `categoryId`, `productId`, `dataNature`, `namespace`, `scenarioId`로 구분한다.

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
