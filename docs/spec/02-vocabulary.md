# 판정·근거 상태 어휘 (Vocabulary)

> **상태: v1-draft (팀 리뷰 요청)** · 타입 단일 진실: `src/lib/verify/contract/vocabulary.ts`

## 층위 구조 — 표면 2층 + 내부 1층

기존 계보에 어휘가 세 벌 있었다: 엔진 판정 3값(viowlet), 엔진 검증가능성 6값(viowlet), 화면 근거 상태 5상태(pig-research). 이들은 경쟁 관계가 아니라 **다른 층위**다. 표면에 노출되는 것은 판정·상태 2층이고, 내부 1층은 노출 금지다:

```
[판정 층]   Verdict 3값        — 사실 대조의 결과 (엔진 산출, 표면 어휘 고정)
[상태 층]   EvidenceStatus 5상태 — 화면 표시용. (검증가능성 × 판정 × 현재성)의 프로젝션
[내부 층]   Verifiability 6값   — 엔진 내부의 검증가능성 (화면 직접 노출 금지)
```

## 판정 층: Verdict 3값 (변경 금지)

| 코드 | 표면 어휘 | 의미 |
|---|---|---|
| `match` | **일치** | 공시 주장과 공공 원장이 일치 |
| `mismatch` | **원장 불일치** | 공시 주장과 공공 원장이 다름 |
| `unverifiable` | **대조 불가** | 대조할 근거가 없거나 구조적으로 불가 |

- "미확인"은 `unverifiable` 전용 보조 표현이다 (기존 규칙 계승).
- **근거 0건이면 판정을 산출하지 않는다** — 엔진이 타입 수준에서 강제한다(`createJudgement`는 근거 0건에서 throw, `Judgement`는 비공개 심벌로만 생성 가능). 표면에서는 "대조 불가"로 말하고, 내부적으로는 "판정 미산출(보류)"이다 — 두 표현은 같은 사건의 표면/엔진 층위다.
- 투자 등급 어휘(해볼 만함/조건부/주의/위험)는 **불채택**. 판정의 상품 단위 집계 점수·통과율·배지도 금지(`04-expression-rules.md`).

## 상태 층: EvidenceStatus 5상태 (화면 표준)

pig-research 계보의 화면 어휘를 공통 표준으로 승격한다:

| 코드 | 표면 어휘 | 프로젝션 규칙 |
|---|---|---|
| `verified` | 근거 확인 | 판정 `match` + 현재성 유효 |
| `mismatch` | 원문 간 차이 | 판정 `mismatch` (현재성과 무관하게 우선 표시) |
| `review` | 추가 대조 | 판정 미산출 전부: `verifiable`(판정 전) · `unparsed` · `cross_check_conflict` · `llm_only` |
| `missing` | 자료 미확인 | 판정 `unverifiable` 또는 `no_reference_data` · `structurally_impossible` |
| `stale` | 현재성 재확인 | 판정·상태와 무관하게 기준일이 신선도 기준 초과 (mismatch 제외 전부에 우선) |

- 프로젝션 함수는 `contract/vocabulary.ts`의 `projectEvidenceStatus()` 하나뿐이다 — 화면이 각자 매핑을 만들지 않는다. 프로젝션은 상류 불변식(예: llm_only는 판정에 이르지 못함)을 재검증하지 않는다 — 불변식 보장은 엔진 책임이다.
- 우선순위: `mismatch` > `stale` > (`verified` | `review` | `missing`). 불일치는 낡아도 불일치로 보인다 — 위험 신호를 신선도가 가리지 않는다.
- **어휘 충돌 금지**: 판정 표면 어휘(일치/원장 불일치/대조 불가)는 다른 층위·다른 개념의 라벨로 재사용하지 않는다. 층별 지원 선언의 unsupported 라벨은 이 원칙에 따라 "검증 경로 없음"이다 (`contract/category.ts`).
- 구 4값(확인/대조 필요/미확인/현재성 만료)은 이 5상태로 **대체**된다: 확인→`verified`, 대조 필요→`review`, 미확인→`missing`, 현재성 만료→`stale`, 그리고 `mismatch`가 분리 신설 (구 체계는 불일치를 별도 상태로 갖지 않았다).

## 내부 층: Verifiability 6값 (노출 금지)

`verifiable / no_reference_data / structurally_impossible / unparsed / cross_check_conflict / llm_only` (`src/lib/verify/types.ts:5`).

- 내부 코드·리포트 JSON에는 유지하되 **화면 문자열로 직접 노출하지 않는다** — 화면은 항상 프로젝션을 거친다.
- `cross_check_conflict`(규칙·LLM 추출 불일치)와 `llm_only`(교차 확인 안 됨)는 판정에 이르지 못하는 강등 상태다 — LLM 단독 추출은 절대 판정으로 이어지지 않는다는 기존 불변식의 어휘적 표현.

## 현재성 (신선도) 기준

- 모든 근거 표시에는 `as_of`(원문 기준일)와 `fetched_at`(수집 시각)을 병기한다 (`03-evidence-structure.md`).
- 신선도 기준(카테고리·출처별 유효 기간)은 카테고리 디스크립터가 선언한다 — 예: 경락가 월 통계는 익월 갱신 전까지 유효, 이력제 개체 상태는 조회 시점 표기. `[팀 결정 대기]` 카테고리별 구체 수치는 담당자 제안으로 확정.
