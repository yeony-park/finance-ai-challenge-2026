# 서비스 API 명세 — 초안

> **상태: draft** · 2026-08-27 · 구현 기준: `src/app/api/`
> 이 문서는 현재 배포된 서비스의 HTTP 계약을 설명한다. 구현과 충돌하면 구현·테스트를 우선하고 이 문서를 정정한다.
> E2E 구성 요소와 요청 흐름은 [`../design/design.md`](../design/design.md)에서 설명한다.

## 1. 범위와 공통 규칙

서비스 API는 세 개다. `health`와 라이브 재검증은 서비스 화면에서 사용할 수 있는 공개 표면이며, 정정 감시는 Vercel Cron만 호출하는 운영용 표면이다.

| 구분 | 메서드 · 경로 | 용도 | 공개 여부 |
|---|---|---|---|
| 상태 확인 | `GET /api/health` | 서비스 기동 상태 확인 | 공개 |
| 라이브 재검증 | `POST /api/verify/{id}` | 공개 공모를 최신 공시·공공 원장으로 다시 대조 | 공개 |
| 정정 감시 | `GET /api/cron/monitor` | 대상 공모의 기재정정 여부 확인 및 이벤트 저장 | 운영 전용 |

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

현재 허용되는 공모 ID는 `livestock-1`부터 `livestock-9`, `real-estate-a`다. 허용목록은 서비스의 공개 공모 목록과 함께 바뀔 수 있다.

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

## 6. 구현 근거

- 라우트: `src/app/api/health/route.ts`, `src/app/api/verify/[id]/route.ts`, `src/app/api/cron/monitor/route.ts`
- 라이브 재검증 계약·폴백: `src/lib/verify/live/revalidate.ts`, `src/lib/verify/live/response.ts`
- 정정 감시·인증·저장: `src/lib/verify/amend/monitor.ts`, `src/lib/verify/amend/cron-auth.ts`, `src/lib/verify/amend/event-store.ts`
- 배포 Cron: `vercel.json`
