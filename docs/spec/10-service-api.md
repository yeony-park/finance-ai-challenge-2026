# 서비스 API 명세

> **상태: 구현 기준 갱신** · 2026-09-05 · 구현 기준: `src/app/api/`
> 상위 규범은 [`08-api-contract.md`](./08-api-contract.md), 집행 규칙은 [`../../contracts/api.md`](../../contracts/api.md)를 따른다. 본 문서는 현재 구현된 엔드포인트의 요청·응답을 상세히 기술한다.
> 이 문서는 현재 배포된 서비스의 HTTP 계약을 설명한다. 구현과 충돌하면 구현·테스트를 우선하고 이 문서를 정정한다.
> E2E 구성 요소와 요청 흐름은 [`../design/design.md`](../design/design.md)에서 설명한다.

## 1. 범위와 공통 규칙

서비스 API는 아홉 개다(2026-09-05 기준). `health`·라이브 재검증·상품 조회·AI 상품 문답은 공개 표면이며, 정정 감시는 Vercel Cron만 호출하는 운영용 표면이다.

| 구분 | 메서드 · 경로 | 용도 | 공개 여부 |
|---|---|---|---|
| 상태 확인 | `GET /api/health` | 서비스 기동 상태 확인 | 공개 |
| 라이브 재검증 | `POST /api/verify/{id}` | 공개 공모를 최신 공시·공공 원장으로 다시 대조 | 공개 |
| 정정 감시 | `GET /api/cron/monitor` | 대상 공모의 기재정정 여부 확인 및 이벤트 저장 | 운영 전용 |
| 상품 목록 | `GET /api/products` | 수동 검증 미술품 5건 공개 문맥 (08 예외 4분류) | 공개 |
| 상품 단건 | `GET /api/products/{id}` | 위와 동일, `art-{양의정수}` id | 공개 |
| AI 상품 문답 | `POST /api/ai/ask-product` | 미술 상품 문맥 한정 Q&A — 한시 표면, 일몰 조항은 08 예외 5분류 | 공개 |
| 홈 검색 | `POST /api/search` | 상품 검색·일반 지식·근거 안내 | 검색 공개, 생성은 승인 게이트 적용 |
| 상품 근거 질문 | `POST /api/evidence/query` | 선택한 상품·자료 범위 안의 질문 | 근거 조회 공개, 생성은 승인 게이트 적용 |
| 가축 질병 지도 | `GET /api/livestock-disease-map` | 공개 시·군 기준 질병 지도 데이터 | 공개 |

- Base URL은 배포 환경의 origin이다. 예: `https://jeom-jeom.vercel.app`.
- 이 문서에 명시한 응답은 JSON이다. Live Verify와 Cron Monitor는 응답 헤더 `Cache-Control: no-store`를 명시한다. Health는 현재 헤더를 직접 설정하지 않으며, 캐시 헤더 계약 통일은 E2E 검증 항목으로 남아 있다. 예기치 않은 런타임·플랫폼 오류의 `5xx` 본문 형식은 계약에 포함하지 않는다.
- 시간은 ISO 8601 UTC 문자열이다. 날짜만 필요한 값은 `YYYY-MM-DD` 또는 `YYYYMMDD` 형식을 사용한다.
- 공개 응답은 마스킹된 리포트에서 생성한다. 평문 이력번호, 농장주 실명, 상세 주소, 농장번호는 응답에 포함하지 않는다.
- API는 투자 판단·추천·등급을 제공하지 않는다. `match`, `mismatch`, `unverifiable`은 공시 주장과 원장 자료의 대조 결과일 뿐이다.

### 공통 오류 형식

`/api/verify/{id}`의 비정상 응답은 아래 형식을 사용한다.

```json
{
  "error": "not_found",
  "message": "공개된 대조 리포트가 없는 공모입니다."
}
```

`error` 값은 엔드포인트별로 다르며, 사람에게 표시할 수 있는 설명은 항상 `message`에 담긴다.

---

## 2. `GET /api/health`

서비스 프로세스가 응답 가능한지 확인한다. 외부 공공 API나 데이터베이스 연결 상태를 검사하는 헬스체크는 아니다.

### 요청

인증·쿼리·요청 본문이 없다.

```bash
curl -sS https://jeom-jeom.vercel.app/api/health
```

### 성공 응답 — `200 OK`

```json
{
  "ok": true,
  "uptimeSeconds": 42,
  "checks": {
    "corpusDocs": 8
  }
}
```

| 필드 | 형식 | 설명 |
|---|---|---|
| `ok` | boolean | 라우트가 정상 응답했음을 나타낸다. 현재 항상 `true`다. |
| `uptimeSeconds` | integer | 현재 서버 인스턴스가 기동된 뒤 경과한 초다. 배포 전체의 가동 시간은 아니다. |
| `checks.corpusDocs` | integer | 신뢰 스파인 샘플 코퍼스 문서 수다. |

---

## 3. `POST /api/verify/{id}`

공개된 공모 리포트를 최신 원문·공공 원장으로 재대조한다. 공공 API 키가 없거나 조회에 실패했을 때 저장된 공개 리포트가 있다면 실패 대신 `mode: "snapshot"`을 반환한다.

### 요청

| 항목 | 위치 | 필수 | 설명 |
|---|---|---:|---|
| `id` | path | 예 | 공개 공모 ID |
| `x-forwarded-for` | header | 아니오 | 서버가 호출자별 버스트 제한에 사용한다. 배포 프록시가 주입하는 값을 기준으로 하며, 클라이언트가 신원 식별 수단으로 의존하면 안 된다. |

요청 본문과 쿼리 파라미터는 사용하지 않는다.

공개 공모 목록에 포함되고 온보딩 카탈로그에서 공개 검증이 승인된 ID만 허용한다. 목록에 등록됐더라도 검증 범위가 승인되지 않으면 재검증할 수 없다. 상세 화면에서 시나리오를 열 수 있다는 사실은 라이브 재검증 허용을 뜻하지 않는다.

```bash
curl -sS -X POST \
  https://jeom-jeom.vercel.app/api/verify/livestock-9
```

### 성공 응답 — `200 OK`

```json
{
  "offerId": "livestock-9",
  "mode": "live",
  "verifiedAt": "2026-08-27T01:23:45.678Z",
  "document": {
    "rcpNo": "20260806000159",
    "submittedOn": "2026-08-06"
  },
  "sources": ["축산물이력제 개체정보"],
  "summary": {
    "subjects": {
      "total": 37,
      "match": 36,
      "mismatch": 1,
      "unverifiable": 0
    },
    "items": {
      "total": 111,
      "match": 110,
      "mismatch": 1,
      "unverifiable": 0,
      "unjudged": 0
    }
  },
  "subjects": [
    {
      "subject": "개체 1호",
      "verdict": "match",
      "judgementCount": 3,
      "unjudgedCount": 0,
      "findings": []
    }
  ],
  "notes": ["추출 모드: rules-only"]
}
```

| 필드 | 형식 | 설명 |
|---|---|---|
| `offerId` | string | 요청한 공개 공모 ID |
| `mode` | `live` \| `snapshot` | `live`는 이번 요청에서 재대조한 결과, `snapshot`은 마지막 공개 리포트의 결과다. |
| `verifiedAt` | ISO 8601 string | `live`이면 이번 재대조 시각, `snapshot`이면 해당 저장 리포트의 생성 시각 |
| `document` | object | 대조 기준 공시의 접수번호와 제출일 |
| `sources` | string[] | 결과에 사용한 원장·공시 출처 이름 |
| `summary.subjects` | object | 대상(예: 개체) 단위 집계 |
| `summary.items` | object | 주장 항목 단위 집계. `unjudged`는 원장 조회·판정을 끝내지 못한 항목 수다. |
| `subjects` | array | 대상별 판정과 불일치·대조 불가 발견사항 |
| `notes` | string[] | 결과 해석에 필요한 보충 설명 |
| `note` | string, optional | `snapshot` 폴백 사유. `live`에서는 생략된다. |

`summary.subjects`와 `summary.items`에는 각각 `total`, `match`, `mismatch`, `unverifiable`가 있다. `summary.items`에만 `unjudged`가 추가된다.

각 `subjects[]` 항목의 형식은 아래와 같다.

| 필드 | 형식 | 설명 |
|---|---|---|
| `subject` | string | 마스킹된 대상명. 예: `개체 1호` |
| `verdict` | `match` \| `mismatch` \| `unverifiable` | 대상 수준 판정 |
| `judgementCount` | integer | 판정 완료한 주장 수 |
| `unjudgedCount` | integer | 판정을 완료하지 못한 주장 수 |
| `findings` | array | `match`가 아닌 판정의 상세. `field`, `verdict`, `claimed`, `observed`, `rationale`를 가진다. |

### 스냅샷 폴백 예시 — `200 OK`

```json
{
  "offerId": "livestock-9",
  "mode": "snapshot",
  "verifiedAt": "2026-08-14T15:41:05.021Z",
  "document": { "rcpNo": "20260806000159", "submittedOn": "2026-08-06" },
  "sources": ["축산물이력제 개체정보"],
  "summary": { "subjects": {}, "items": {} },
  "subjects": [],
  "notes": [],
  "note": "라이브 대조에 필요한 공공 API 키(DART_API_KEY, DATA_GO_KR_API_KEY)가 설정되지 않았습니다. 아래 판정은 마지막 대조 시각의 공개 리포트입니다."
}
```

위 예시는 구조 설명용으로 집계 객체와 배열을 축약했다. 실제 성공 응답에서는 `summary.subjects`, `summary.items`의 모든 집계 필드와 `subjects`가 포함된다.

### 오류 응답

| 상태 | `error` | 발생 조건 | 추가 헤더 |
|---:|---|---|---|
| `404` | `not_found` | `id`가 공개 공모 허용목록에 없음 | — |
| `429` | `rate_limited` | 호출자별 버스트 또는 프로세스 내 일일 한도 초과 | `Retry-After`(초) |
| `502` | `upstream_failed` | 공공 원장 조회 실패 및 폴백할 저장 리포트 없음 | — |
| `503` | `not_configured` | 필요한 키/공시 매핑이 없고 폴백할 저장 리포트 없음 | — |

현재 레이트리밋은 동일 호출자당 60초에 2회, 프로세스 내 일일 최대 135회다. 후자는 이력제 일일 쿼터 10,000건의 50%를, 재대조 1회당 최대 37건으로 계산한 값이다. 메모리 기반 구현이므로 서버리스 인스턴스 간 전역 제한을 보장하지 않는다.

---

## 4. `GET /api/cron/monitor`

대상 공모의 OpenDART 정정 공시 계보를 확인하고, 가능하면 최신 정정본을 다시 대조해 변경 사항을 반환한다. 외부 클라이언트나 브라우저에서 호출하는 API가 아니다.

Vercel Cron 설정은 `0 0 * * 1,4`이며, 실제 실행 시점은 배포 플랫폼의 Cron 해석을 따른다.

### 요청

`CRON_SECRET`과 일치하는 Bearer 토큰이 반드시 필요하다.

```bash
curl -sS \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://jeom-jeom.vercel.app/api/cron/monitor
```

| 헤더 | 필수 | 설명 |
|---|---:|---|
| `Authorization` | 예 | 정확히 `Bearer {CRON_SECRET}` 형식이어야 한다. |

### 성공 응답 — `200 OK`

```json
{
  "checkedAt": "2026-08-27T01:23:45.678Z",
  "source": "OpenDART 공시검색 (금융감독원 · opendart.fss.or.kr)",
  "storage": {
    "stored": false,
    "reason": "BLOB_READ_WRITE_TOKEN이 설정되지 않아 이벤트를 저장하지 않았습니다 — 아래 events가 이번 확인의 전체 결과입니다."
  },
  "events": [
    {
      "offerId": "livestock-9",
      "kind": "no_amendment",
      "checkedAt": "2026-08-27T01:23:45.678Z",
      "baseRcpNo": "20260806000159",
      "checkedThrough": "20260827",
      "amendments": [],
      "facts": ["이 공모의 정정신고서 접수는 확인 시각 기준 0건입니다."],
      "notes": []
    }
  ]
}
```

| 필드 | 형식 | 설명 |
|---|---|---|
| `checkedAt` | ISO 8601 string | 이번 감시 실행 시각 |
| `source` | string | 정정 계보를 조회한 출처 |
| `storage` | object | 이벤트의 Vercel Blob 저장 결과. `stored` 외에 성공 시 `pathname`, `url`, 실패 시 `reason`을 포함한다. |
| `events` | array | 감시 대상 공모별 결과 |

각 `events[]` 항목은 `offerId`, `kind`, `checkedAt`, `amendments`, `facts`, `notes`를 항상 가진다. 접수번호가 매핑되어 조회에 성공한 항목은 `baseRcpNo`, `checkedThrough`도 가진다.

| `kind` | 의미 |
|---|---|
| `no_amendment` | 확인 시각 기준 정정 신고가 없음 |
| `amendment_detected` | 정정 신고를 발견함. 재대조가 가능하면 `diff`가 포함됨. |
| `detection_failed` | 접수번호 매핑 또는 OpenDART 조회 실패로 정정 여부를 판단하지 못함 |

`amendments[]`의 항목은 `rcpNo`, `receivedOn`(`YYYYMMDD`), `reportName`을 가진다. 선택 필드 `diff`는 `from`, `to`, `changedClaims`, `verdictChanges`, `summary`, `notes`로 구성되며, 공시 주장 값의 변경과 판정 유지·변동을 나타낸다.

### 오류 응답

| 상태 | `error` | 발생 조건 |
|---:|---|---|
| `401` | `unauthorized` | Authorization 헤더가 없거나 `CRON_SECRET`과 일치하지 않음 |
| `503` | `not_configured` | `CRON_SECRET` 또는 정정 조회용 `DART_API_KEY`가 설정되지 않음 |
| `500` | — | 예기치 않은 OpenDART 조회·실행 오류. 오류 본문은 정규화된 계약이 아니다. |

`CRON_SECRET`이 없을 때는 `message`가 감시 미실행 사유를, `DART_API_KEY`가 없을 때는 `message`가 공시 조회 키 미설정 사유를 설명한다.

---

## 5. 운영 및 변경 규칙

1. 공개 API의 새 경로, 요청 필드, 응답 필드, 상태 코드 변경은 이 문서를 먼저 또는 같은 변경에서 갱신한다.
2. 필수 응답 필드의 삭제·의미 변경은 호환성 파괴 변경으로 취급한다. 새 선택 필드는 호환성을 깨지 않는다.
3. 공개 응답에 식별 가능한 이력번호·실명·상세 주소·농장번호를 추가해서는 안 된다. 응답 변경 전 마스킹 테스트를 통과해야 한다.
4. `/api/cron/monitor`의 인증 비밀값과 외부 API 키는 문서 예시·응답·로그에 기록하지 않는다.

## 5.1 상품 조회 · AI 상품 문답 (요약 — 상세 계약은 08 §"공개 상품 문맥"과 예외 5분류)

- `GET /api/products`: 인증 없음 · `Cache-Control: no-store`. 쿼리 `category=art|q|page|pageSize`(Zod strict, pageSize 최대 100). 응답 `{items, total, pagination}`. 원천은 커밋된 파일 리포지토리 — DB·외부 원장 미접촉(R-STO-01 단서).
- `GET /api/products/{id}`: id 형식 오류 400 `validation_error` · 미공개 404 `not_found`.
- `POST /api/ai/ask-product`: 본문 `{productId, question(≤1,000자)}` · 8KB 바운드 파싱 · 출처(origin) 검증 · 입력 스크리닝 · IP 레이트리밋(초과 429 + `Retry-After`) · 응답은 출력 필터 통과분만. 한시 표면 — `/api/search` 개통 시 통합·폐지(08 예외 5분류의 일몰 조항).

## 6. 구현 근거

- 라우트: `src/app/api/health/route.ts`, `src/app/api/verify/[id]/route.ts`, `src/app/api/cron/monitor/route.ts`, `src/app/api/products/route.ts`, `src/app/api/products/[id]/route.ts`, `src/app/api/ai/ask-product/route.ts`
- 상품 조회·코파일럿: `src/lib/art/product-repository.ts`, `src/lib/art/copilot/`(http·request-guard·service)
- 라이브 재검증 계약·폴백: `src/lib/verify/live/revalidate.ts`, `src/lib/verify/live/response.ts`
- 정정 감시·인증·저장: `src/lib/verify/amend/monitor.ts`, `src/lib/verify/amend/cron-auth.ts`, `src/lib/verify/amend/event-store.ts`
- 배포 Cron: `vercel.json`


## 8. 홈 검색 — `POST /api/search`

구현: `src/app/api/search/route.ts`, 요청 스키마: `src/lib/knowledge/schema.ts`.
`Content-Type: application/json`, 본문 최대 32,768바이트. `q` 또는 `query`는 공백을 제거한
1~200자이며 둘 다 보내면 값이 같아야 한다. 알 수 없는 필드는 허용하지 않는다.

```json
{ "q": "부동산", "categoryId": "real-estate", "limit": 10 }
```

선택 필드: `categoryId`(`cattle|pig|art|real-estate`), `assetKind`(`livestock|art|real-estate`),
`phase`(`upcoming|subscription-open|closed|listed-trading|settled|evidence-only`), `limit`(1~20, 기본 10).

응답은 `mode: matches|review-guidance`, `results`, `retrieval`을 포함한다. 결과에는
`id`, `productId`, `categoryId`, `title`, `phase`, `href`, `matchedFields`, `isScenario`,
`dataNature`, `namespace`가 들어간다. `generatedAnswer`, `generatedGeneralAnswer`,
`genericEvidence`, `guidance`는 해당 결과가 있을 때만 포함한다. `retrieval`에는
검색 저장소, 전략(`keyword|semantic|hybrid`), 강등 여부와 사유를 표시한다.
생성 기능을 사용할 수 없어도 검색 결과는 반환할 수 있다. 검색 실패와 결과 없음은 구분한다.

프론트는 반환된 `href`로 이동하며 API ID로 URL을 임의 조립하지 않는다.

| 상품 | API ID 예 | 화면 경로 예 |
|---|---|---|
| 한우 | `livestock-9` | `/cattle/products/livestock-9` |
| 한돈 | `pig-1` | `/pig/products/round-1` |
| 부동산 시나리오 | `re-offer-01` | `/real-estate/products/re-offer-01` |
| 합성 미술품 | `synthetic-offering-01` | `/art/products/synthetic-offering-01` |
| 공통 지식 상품 | 카테고리별 ID | `/offers/common/{categoryId}/{productId}` |

공통 지식 상품은 동일 ID가 다른 자료 범위에 있을 수 있어 기존 별도 경로를 유지한다.
이전 `/offers/{id}` 링크는 카테고리 상세로 308 이동하며, 실제 존재·공개 여부는 상세에서 검사한다.

카테고리 목록 `/cattle`, `/pig`, `/real-estate`, `/art`는 페이지당 9개를 표시한다.
`page` 쿼리로 페이지를 지정하며 생략하면 1페이지다. 한우·한돈·부동산은 검색·상태 필터를
적용한 뒤 페이지를 나누고, 범위를 넘는 페이지는 마지막 페이지로, 유효하지 않은 값은
1페이지로 보정한다. 페이지 이동 시 검색 조건을 유지하고 검색어·상태 변경 시 1페이지로
돌아간다. 목록 제목과 상태 탭의 건수는 페이지 안의 개수가 아닌 필터 대상 전체 개수다.

## 9. 상품 근거 질문 — `POST /api/evidence/query`

프론트는 네 카테고리 상세에서 공통 `components/ai-assistant/EvidenceQuery.tsx`를 사용한다.
AI 요약은 요약 탭 아래, 질문 UI는 오른쪽 아래 버튼으로 여는 Copilot 패널에 표시한다. 질문 범위와 HTTP 계약은 기존대로 유지한다.
RAG 담당자의 어댑터 연결, 로딩·오류·빈 상태는 [AI UI 연결 문서](../design/ai-ui-integration.md)를 참조한다.

본문 크기·질의 길이·오류 형식은 홈 검색과 같다. `limit`은 1~20, 기본 5다.

```json
{ "scenarioId": "요청 대상의 scenarioId", "offerId": "re-offer-01", "q": "최소투자금은 얼마인가요?" }
```

위 부동산 시나리오 형식 외에 공통 범위를 명시하는 형식을 지원한다.

```json
{ "categoryId": "pig", "productId": "pig-1", "dataNature": "observed", "namespace": "published-offer", "q": "공모가격" }
```

- `dataNature`: `observed|scenario`. 시나리오는 `scenarioId`도 지정한다.
- `namespace`: `common|legacy-scenario|published-offer`. 같은 ID가 여러 범위에 있으면 생략하지 않는다.
- 합성 미술품: `categoryId=art`, `dataNature=scenario`, `namespace=common`, `scenarioId=synthetic-art-catalog`.
- 질의 범위: 일반 개념·제도는 generic corpus, 현재 상품·발행사·운영사는 exact product corpus, 일반 기준을 현재 상품과 비교·적용하는 질문은 두 범위를 함께 검색한다.
- 한우·한돈의 경락가격·가격 추세 질문은 구조화 가격 테이블을 조건 조회하고, 질병 발생 현황·건수·이력 질문은 구조화 질병 테이블을 조회한다. 조회 결과는 기존 상품 RAG 근거와 함께 답변 모델에 전달하지만, 생성 답변은 구조화 공개데이터를 한 건 이상 인용해야 한다.
- 가격은 공개 경락 집계로서 해당 상품의 정산가격·수익을 뜻하지 않는다. 질병은 공개 시도·시군구 발생 이력이며 해당 상품 개별 가축의 감염·손실을 뜻하지 않는다. 농장명·농장주·상세주소는 질병 corpus와 응답에 포함하지 않는다.
- 응답: `outcome`(`answer|evidence_only|abstain`), `answer`, `evidence`, `limitations`, `cached`,
  `answerSource`(`structured|approved_cache|live_llm|general_llm|mixed_llm|hybrid_llm|none`),
  `knowledgeScope`(`product|general|mixed`). 출처·인용·확인 항목·충돌 정보는 해당할 때 추가한다.
- 가격·질병 조회 시 `retrieval.structured`에 `kind`(`price|disease`), 저장소(`db|file`), 조회 행 수를 표시한다. 조건과 일치하는 행이 없으면 관련 없는 상품 문단으로 답하지 않고 `abstain`한다.
- `mixed`는 범위별 최소 1건의 근거를 보존하므로 `limit=1`에서도 최대 2건의 근거를 반환할 수 있다.
- 원문 승인·개인정보 검토·실행 게이트가 충족되지 않으면 외부 AI 생성을 하지 않는다.
  근거만 반환하거나 답변을 보류하는 동작을 유지한다.
- 잘못된 요청은 400 `INVALID_REQUEST`, 내부 처리 오류는 500 `INTERNAL_ERROR`다.
  결과가 없거나 근거가 부족한 것은 요청 오류가 아니므로 정상 응답 안에서 표현한다.

`/api/ai/ask-product`는 수동 검증 미술품의 기존 화면용으로 유지한다.
홈 검색과 상품별 근거 질문은 범위·응답 계약이 다르므로 이번 통합에서 이 API를 임의 폐지하지 않았다.

## 10. `GET /api/livestock-disease-map`

`species=cattle` 또는 `species=pig`를 정확히 한 번 전달한다. 다른 쿼리 키, 누락, 중복 값은 `400 validation_error`다.

성공 응답은 `{ species, asOf, events }`다. 각 이벤트는 `disease`(`ASF`, `FMD`, `LSD`), `diseaseLabel`, `occurredAt`, `province`, `region`, `latitude`, `longitude`를 포함한다. 좌표는 공개 시·군 기준이며 농장 위치를 뜻하지 않는다. 한우에는 구제역·럼피스킨, 한돈에는 아프리카돼지열병·구제역 자료가 들어간다.

성공 응답의 캐시 정책은 `public, max-age=300, s-maxage=300, stale-while-revalidate=3600`이며 축종·기준일·이벤트 수로 만든 `ETag`를 보낸다. 오류 응답은 `no-store`다.
