# 공통 evidence 최소 구조

> **상태: v1-draft (팀 리뷰 요청)** · 계승 원본: main 계보 `docs/product-scope.md`의 9필드 표 · 엔진 대응: `src/lib/verify/types.ts`의 `Claim`·`Evidence`

## 원칙

자산별 데이터 모델이 달라져도 아래 필드는 유지한다 (원 서약 계승). 카테고리 커스텀 필드는 추가할 수 있으나 아래를 제거·의미 변경할 수 없다.

## 9필드 계승·개정표

| 필드 | 의미 | 엔진 대응 (`types.ts`) | 개정 사항 |
|---|---|---|---|
| `claim` | 검토할 공시·상품 주장 | `Claim.value` (+`kind`·`field`·`location`) | 유지. 원문 좌표(`ClaimLocation`: section·table·row) 필수화 — 모든 주장은 원문 위치로 복귀 가능해야 한다 |
| `value` / `unit` | 원문 사실값과 단위 | `Claim.value`·`numericValue`·`unit` | 유지 |
| `source_url` | 원문 또는 공식 출처 | `Evidence.url` (+`sourceId`·`sourceName`) | 유지. `sourceId`는 스파인 코퍼스 등록 id와 일치 의무 |
| `as_of` | 사실의 원문 기준일 | 문서: `DocumentRef.submittedOn` / 근거: 출처별 기준일 | 유지. 화면 병기 의무 |
| `fetched_at` | 시스템 수집 시각 | `Evidence.observedAt` | 유지. 화면 병기 의무 |
| `subject_id` | 상품·건물·개체·작품 식별자 | `Claim.subject` | 유지. **공개 표면에서는 마스킹 규칙 적용 후에만** (`05-data-policy.md`) |
| `status` | 확인 상태 | (구 4값) | **대체** — 구 4값(확인/대조 필요/미확인/현재성 만료) → `EvidenceStatus` 5상태 프로젝션 (`02-vocabulary.md`). 저장은 원천값(판정·검증가능성·기준일), 표시는 프로젝션 |
| `method` | 취득 방식 | `Claim.extractedBy` (rules/llm/both) + 수집 CLI 기록 | 유지. 교차검증 상태(`both`만 완전 신뢰) 노출 규칙 계승 |
| `limitations` | 이 근거로 판단할 수 없는 범위 | `Evidence.note` + 층별 지원 선언 | 유지·강화. 근거 행 단위 `limitation` + 카테고리 단위 층별 선언의 2층 |

## 추가 의무 (신설)

- **`stance`**: 근거가 주장을 지지/반박/맥락 제공하는지 (`Evidence.stance`: supports/contradicts/context) — 근거를 "있다"가 아니라 "어느 방향인가"로 기록한다.
- **출처 메타데이터**: 수집 자산 파일 단위로 `sourceUrl`·`license`(신호등 등급)·`method`·`retrievedAt`·`sha256`을 기록한다 (미러: 경락가 CSV 파서의 해시·수집시각 기록, `data/MANIFEST.md` 체계). 라이선스 게이트(`05-data-policy.md`)의 입력이 된다.

## 금지

- 근거 없는 `status` 상향 (근거 0건 → 판정 없음, 예외 없음)
- 발행사 자체 주장만으로 `verified` 처리 — 자체 주장은 `claim`이지 `evidence`가 아니다. 근거는 독립 출처여야 하며, 발행사 문서는 `stance: context`로만 결합한다
- `limitations` 공란 — 한계가 없다는 판단 자체를 적는다 ("표본 충분·기준일 일치 확인" 등)
