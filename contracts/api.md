---
scope: src/app/api/** 및 응답 형태에 닿는 모든 변경
read-when: API 라우트 신설·수정, 에러 응답 작성, 검색(/api/search) 구현
source-of-truth: src/app/api/** + src/lib/knowledge/http.ts + src/lib/knowledge/schema.ts
rationale: docs/spec/08-api-contract.md
---

# API 계약 (API)

## 신설 가부

- **R-API-01 (MUST)** API는 예외 경로다. 신설은 3분류만 허용: ①라이브 재대조 ②cron·헬스체크 ③스파인 경유 AI 표면. 화면 내부 소비용 REST(목록·리포트 GET 등)는 **만들지 않는다** — 화면은 캐시 직독(R-INV-01).
- **R-API-02 (MUST)** 3분류에 안 들어가는 엔드포인트가 필요해 보이면 구현하지 말고 계약 결함으로 보고한다.

## 응답 형태

- **R-API-03 (MUST)** 성공 = 도메인 바디 그대로(봉투 없음). 기존 verify/cron 에러는 `{ "error": "<snake_case 코드>", "message": "<한국어 사용자 문장>" }`를 유지하고 knowledge MVP 두 경로는 R-API-16의 중첩 오류를 유지한다. `{success: true}` 류 이중 표기 금지.

```jsonc
// 위반                                        // 정정
{ "status": 200, "success": false,            HTTP 404
  "error": "Not found" }                      { "error": "not_found", "message": "공개된 공모가 아닙니다." }
```

- **R-API-04 (MUST)** verify/cron 에러 코드는 아래 레지스트리만 사용한다. knowledge MVP의 `INVALID_REQUEST|INTERNAL_ERROR`는 R-API-16을 따른다.

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

- **R-API-07 (MUST)** 요청 입력(바디·쿼리·동적 세그먼트) 핸들러 진입 즉시 Zod 검증. 실패 → `validation_error`. 신설·수정 엔드포인트 의무 — 현행 3종은 allowlist·인증 비교뿐이라 소급 미적용(후속 과제).
- **R-API-08 (MUST)** 판정 값은 엔진 3값(`match|mismatch|unverifiable`) 원형 송출. 화면 5상태 번역·비율·점수 필드 신설 금지 — 건수(`summary`)만.
- **R-API-09 (MUST)** 리포트 내용물은 `toPublicView`(브랜드 타입 `PublicReport`) 경유 후에만 직렬화. 원본 스냅샷 직렬화 금지.
- **R-API-10 (MUST)** 라우트 파일은 배선만 — 로직은 `src/lib/`에 두고 lib 단위 테스트로 검증(`live-revalidate.test.ts` 미러).

## 현행·예약 엔드포인트

| 경로 | 상태 | 요점 |
|---|---|---|
| `GET /api/health` | implemented | 무인증, `{ok, uptimeSeconds, checks}` |
| `POST /api/verify/{offerId}` | implemented | IP 레이트리밋, `LiveVerifyBody`, 200/404/429/502/503 |
| `GET /api/cron/monitor` | implemented | `authorizeCronRequest` 필수, 화면·문서에 URL 비노출 |
| `POST /api/search` | implemented (통합 RAG 아키텍처 MVP) | 상품 검색 + 일반 개념 keyword 근거, R-API-11 참조 |
| `POST /api/evidence/query` | implemented (통합 RAG 아키텍처 MVP) | legacy/common/published exact scope 근거질의, R-API-14 참조 |

- **R-API-11 (MUST)** `/api/search` 요청은 `q` 또는 `query` 중 하나를 받으며 둘 다 있으면 같은 문자열이어야 한다(1~200자). `assetKind?`, `categoryId?`, `phase?`, `limit?`(최대 20)를 함께 받을 수 있다. 성공 응답은 `mode: "matches" | "review-guidance"`, `results[]`, 선택적 `guidance`·`genericEvidence`·`generatedAnswer:{answer,citedProductIds}`, `retrieval:{storage:{offerings,rag},degraded,semantic,strategy,reason?,planner?}`이다. 명백한 keyword 상품 결과는 planner·embedding 없이 우선 반환하되 금액 비교 문구는 strict plan의 최소투자금 상·하한을 서버가 적용한다. 홈 답변 모델은 최대 5개 결과 중 `citedProductIds`만 선택하고, `answer` 문장은 서버가 canonical 제목으로 조립한다. 임의 문장·숫자·URL·상품명은 모델 출력 스키마에 존재하지 않는다. 추천·안전·최고·적정가 요청은 상품 순위를 만들지 않고 `review-guidance`로 전환한다. `namespace + dataNature`가 다른 동일 id 결과를 임의 병합하지 않는다.
- **R-API-12 (MUST)** 카테고리 확장 시 `POST /api/verify/{id}`는 동일 엔드포인트·동일 바디 유지. 라우트에 카테고리 분기 금지 — 어댑터는 디스크립터에서 해석. 라이브 불가 카테고리는 404가 아니라 200 + `mode:"snapshot"`.
- **R-API-13 (기본값)** 버저닝 없음(`/api/v1` 미도입). 외부 공개 시점에 일괄 승격.
- **R-API-14 (MUST)** `/api/evidence/query`는 legacy `{scenarioId,offerId,q|query,limit?}`와 공통 `{categoryId,productId,dataNature,scenarioId?,namespace?,q|query,limit?}`를 지원한다. 공통 `dataNature`는 필수이고 scenario에는 `scenarioId`가 필수다. `namespace`는 `common | legacy-scenario | published-offer`; 생략 시 후보가 둘 이상이면 400으로 닫는다. 응답은 `outcome: answer|evidence_only|abstain`, `answerSource: structured|approved_cache|live_llm|none`, `evidence`, `limitations`, `retrieval:{degraded,semantic,strategy,reason?,planner:{used:false}}`를 기본으로 한다. published-offer는 `storage:{offerings,productKnowledge}`도 덧붙인다. exact-scope keyword hit는 query embedding보다 우선하며 semantic 무관·저점수 결과는 `score-below-threshold` 사유로 keyword/보류 경로에 강등한다.
- **R-API-15 (MUST)** published offering은 repository의 허용된 구조화 항목을 먼저 답하고 같은 `categoryId+productId+dataNature`의 공개 승인 ready PDF만 결합한다. 구조화값과 PDF 값이 다르면 `conflicts`와 한계로 보존하며 다른 상품 PDF나 generic corpus로 보충하지 않는다. common/legacy도 exact scope만 검색하고 observed/scenario를 한 문장으로 합성하지 않는다.
- **R-API-16 (MUST)** 두 knowledge API는 `application/json`, 최대 32KB body, `q/query` 동일성 검증을 공통 적용한다. 이 MVP의 오류는 `{error:{code:"INVALID_REQUEST"|"INTERNAL_ERROR",message}}` 형태이며 내부 경로·키·질문 원문을 노출하지 않는다.
- **R-API-17 (현재 한계)** semantic은 승인된 canonical chunk의 로컬 SQLite overlay가 있고 exact scope·hash 재검증을 통과할 때만 사용하며, 부재·불일치·provider 실패 시 keyword로 강등한다. `KNOWLEDGE_RUNTIME_AI_ENABLED`와 개별 feature flag(`KNOWLEDGE_SEMANTIC_ENABLED` 또는 `LIVE_EVIDENCE_ENABLED`)는 모두 기본 false다. 공개 route는 프로세스 단위 client burst/global daily gate를 적용하지만 다중 인스턴스 분산 제한을 보장하지 않는다. 따라서 외부 전송 고지·동의, 배포 인프라의 분산 rate limit과 전역 일일 비용상한이 선행되기 전에는 운영 opt-in을 true로 설정하지 않는다. 선택한 모든 문서 근거가 외부 AI 승인 + PII 검토 통과일 때만 답변 provider를 호출한다. 실제 외부 provider·실 DB·embedding apply는 이 MVP 검증에서 수행하지 않았다.

## PR 체크 (신규·수정 엔드포인트 — 본문에 6항목 명기)

① 3분류 해당 근거 ② 에러 레지스트리 준수 ③ Zod 경계 ④ 마스킹 경유 ⑤ 키 없는 환경 응답 정의 ⑥ 레이트리밋
