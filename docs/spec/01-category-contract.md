# 카테고리 계약 (Category Contract)

> **상태: v1-draft (팀 리뷰 요청)** · 타입 단일 진실: `src/lib/verify/contract/category.ts` · 실증 예시: `src/lib/verify/contract/cattle.ts` · 착수 드라이런(돼지 시점)으로 검증·개정됨 (2026-08-15)

## 착수 가이드 (담당자용 — 첫 세션 반나절 기준)

**사전 읽기 (약 1시간)**: ① `contract/cattle.ts`(실물 예시) ② `src/lib/verify/types.ts`의 `ClaimKind` 10종 ③ `src/lib/spine/rag/corpus.ts`의 등록 출처 7종 ④ `contract/__tests__/contract.test.ts`(기계 검증 항목) ⑤ 이 문서 전체.

1. 자기 카테고리의 `CategoryDescriptor` 초안을 `contract/<category>.ts`로 작성한다 — cattle 골격 모방.
2. **층별 지원 선언부터** 채운다: 실재성·가격·이행 각각 "무엇으로 검증 가능한가 / 왜 불가한가"를 근거와 함께. **unsupported도 1급 답이다.**
3. 필요한 공공 출처 중 코퍼스 미등록분은 `proposedSources`로 선언한다 (아래 §신규·보강 출처). 등록 행위 자체는 하지 않는다.
4. 수집 자산의 라이선스 신호등 분류(`05-data-policy.md` §2)는 `proposedSources[].license` 필드와 자산 메타데이터에 기록한다.
5. 계약 테스트를 카테고리별 새 파일 `contract/__tests__/<category>.test.ts`로 작성한다 (기존 테스트 파일 수정 금지 — cattle.test 항목을 미러). PR로 올리고 오너 리뷰를 받는다.

이 5단계 완료가 "카테고리 착수 완료"다. 리뷰 통과 품질 초안은 반나절(도메인 지식 보유 기준)로 잡는다.

## 담당

| 카테고리 | id | 담당 | 기존 자산 (07-asset-map 참조) |
|---|---|---|---|
| 한우 | `cattle` | 원준 | 검증 완결 (엔진 livestock 축, 공모 9건 실측) — 실증 예시로 선등록 |
| 돼지 | `pig` | 연정 | 데이터젠 1~3호 DART 실데이터 + 경락가 CSV 파서 |
| 미술품 | `art` | 현석 | 실데이터 338건 + 레포지토리 계층 |
| 부동산 | `real-estate` | 문수 | 엔진 real-estate 축(RTMS) + 국토부 API 클라이언트 포팅 후보 |

## 계약 요소

카테고리 1개 = `CategoryDescriptor` 1개(코드) + 문서 프로파일·페이지 섹션 구현(코드 외 산출물 — 디스크립터 필드가 아니라 M2+ 구현물이다).

### 1) 어댑터 (공공 데이터 클라이언트)

- `status: "planned" | "implemented"` — **초안 단계는 `planned` 선언이 정상이다** (계획 선언). `implemented` 전환 조건: 실어댑터 + **fake 트윈**이 통합 레포에 존재 (미러: `src/lib/verify/adapters/livestock-trace.ts` + `livestock-trace-fake.ts`). fake 트윈은 구현 시점 의무 — 키 없이 전체 파이프라인이 완주해야 한다.
- 외부 응답은 Zod 경계 검증 필수, 반환 타입은 `readonly` 인터페이스.
- `moduleName`은 `src/lib/verify/` 기준 상대 명칭 (예: `adapters/pig-auction-price`).
- **DART 축(dart-viewer·opendart-filings)은 전 카테고리 공통 축이므로 adapters에 넣지 않는다** — 층 선언의 `publicSourceIds`로만 인용한다 (cattle 예시 참조).
- 레이트리밋·쿼터가 있는 API는 수집 CLI + 캐시 방식(미러: `src/lib/verify/reference/auction-collect-cli.ts` — 일 1,000건 한도 대응)을 따른다. 화면은 캐시만 읽는다.

### 2) 신규·보강 출처 선언 (`proposedSources`)

- 어댑터·층 선언이 인용하는 `sourceId`는 스파인 출처 레지스트리(`src/lib/spine/rag/corpus.ts`) 등록분이거나 `proposedSources` 선언분이어야 한다 — 계약 테스트 `unknownSourceIds()`가 기계 검증한다.
- **코퍼스 등록·서술 보강은 M2+에서 오너가 일괄 반영한다** (proposedClaimKinds와 동일 문형 — 담당자는 등록하지 않고 선언만 한다. 기존 파일 무수정 원칙).
- 기존 등록 id의 **재사용 조건**: 같은 운영 기관·데이터셋 계열이면 재사용 가능하되, 등록 서술이 자기 카테고리에 맞지 않으면(예: "소도체 경락가" 서술을 돼지가 인용) `proposedSources`에 같은 id + `amendsExisting: true`로 서술 보강을 선언한다 — LLM 컨텍스트에 틀린 설명이 주입되는 것을 막는 장치다.
- `license` 필드가 신호등 분류의 기록 위치다 (green/yellow/red — `05` §2).

### 3) claim kinds

- 기존 엔진 등록분(`ClaimKind` 10종)은 그대로 사용한다.
- 신규 kind는 `proposedClaimKinds`에 선언(의미·단위·검증 방법 병기) — 엔진 유니온 등록은 M2+ 오너 일괄.

### 4) 층별 지원 선언 — 계약의 핵심

| 층 | 질문 | 예 |
|---|---|---|
| `existence` 실재성 | 공시된 자산이 실제로 존재하는가 | 한우: 개체 대조 = supported / 돼지: 개체 특정 불가, 농장 단위 = partial |
| `price` 가격 | 공모가가 시장 어디에 위치하는가 | 부동산: RTMS 실거래 = supported(키 상태 확인 중) |
| `performance` 이행 | 약속 이행·정정·사건이 추적되는가 | 전 카테고리: DART 정정 계보·발행실적 = supported |

- `basis`(근거 또는 불가 사유) + `publicSourceIds`(등록 or proposed id) 필수. "농장 단위 가능·개체 단위 불가" 같은 세분은 `level: "partial"` + basis 산문으로 표현한다.
- **출처 규칙**: `supported`·`partial` 층은 출처 1개 이상, `unsupported` 층은 출처 생략 가능(불가 사유가 basis에 있으므로) — `layerSourcesSatisfied()`가 기계 검증한다.
- **사건·질병 출처**(ASF·폐사·월간보고 등 event-timeline의 원천)는 `performance` 층의 출처로 선언한다.
- `engineAssetKind`: 기존 엔진 파이프라인 축(`AssetKind`)이 그 카테고리 검증에 이미 존재할 때만 바인딩한다(cattle→livestock, real-estate→real-estate). 새 축이 필요한 카테고리(pig·art)는 생략 — 엔진 축 신설은 M2+.
- 화면은 이 선언을 "이 카테고리는 무엇을 확인하고 무엇을 못 하는가" 밴드로 렌더링하고, **노출 상품의 선정 기준(검증 가능 데이터 존재 여부)·선정이 품질 평가가 아님 고지**를 같은 밴드에 포함한다.

### 5) 페이지 섹션

필수 슬롯 5종 (+ 재량 슬롯 `custom`은 별도):

| 슬롯 id | 내용 | 근거 |
|---|---|---|
| `layer-declaration` | 층별 지원 선언 + 노출 상품 선정 기준 고지 | 결정 3, PRD Scope 3 |
| `verdict-summary` | 사실 판정 3값 **건수 나열** (허용 형태는 `04` 참조 — 비율·게이지 금지) | `02-vocabulary.md` |
| `evidence-table` | 근거 상태 5상태 표 (출처·기준일·한계 열 포함) | `03-evidence-structure.md` |
| `event-timeline` | **사건·정정의 상품 귀속 타임라인** — 게시판 분리 금지 | IDI 실사용 관찰 |
| `review-questions` | 미확인 항목의 확인 질문 변환 | PRD Scope 2-③ |

`custom`: 카테고리 자유 섹션 — 표현 규칙(`04`)·데이터 정책(`05`) 준수 하에 담당자 재량. 점수·배지·집계 표시는 custom에서도 금지다.

## 신규 카테고리 추가 절차 (확장성 정의)

1. `CategoryDescriptor` 작성(proposedSources·proposedClaimKinds 선언 포함) → 2. 오너가 코퍼스·ClaimKind 일괄 반영(M2+) → 3. 어댑터+fake 트윈 구현(`planned`→`implemented`) → 4. 문서 프로파일 → 5. 착지 페이지 슬롯 구현. 공통 계층(core·spine·셸) 수정은 오너 반영 단계에만 발생하며, 그 외 수정이 필요해지면 계약의 결함으로 보고 계약을 고친다.

## 검증

- 카테고리별 테스트 파일이 cattle.test 항목(층 선언 완전성·출처 정합·claim 중복 없음)을 미러해야 한다.
- `npx tsc --noEmit` + `npm test` 그린은 **구조 검증까지만**이다 — 출처 인용의 의미 정합(내 카테고리에 맞는 서술인가)과 표현·데이터 정책 준수는 오너 리뷰가 판정한다. 기계 그린 ≠ 리뷰 통과.
