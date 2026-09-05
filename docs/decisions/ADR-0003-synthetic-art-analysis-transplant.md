# ADR-0003: 합성 미술품 분석 UI 독립 이식

- **Status:** Accepted
- **Decision date:** 2026-09-01
- **Supersedes:** None
- **Superseded by:** None

## Context

현재 `/art`의 분석 탭은 수동 검증된 미술품 데이터와 공통 카테고리 분석 레이아웃을 사용한다. 한편 `synthetic-feature-restore` 브랜치의 커밋 `e65337f06b6143f45c2be7698f5674f9d0f5dd9d`에는 합성 미술품 327건을 탐색하는 Next.js `/art` 카탈로그, 작품 선택 후 상세 화면, 원본 합성 JSON과 로컬 이미지 자산이 있다.

사용자는 현재 분석 탭 레이아웃을 기준으로 조정하지 말고 해당 커밋의 레이아웃, 더미 미술품 데이터, 미술품 선택 후 이어지는 UI를 먼저 이식한 뒤 다른 페이지와의 디자인 조율은 별도로 진행하라고 요청했다. 다만 저장소 정책은 합성 근거로 투자 판단 등급을 산출하는 것을 금지하고, 현재 `/api/products`는 수동 검증된 5개 미술품의 계약을 유지해야 한다.

## Decision

커밋 `e65337f06b6143f45c2be7698f5674f9d0f5dd9d`의 Next.js `/art` 카탈로그를 현재 `/art` 분석 탭의 기준 UI로 이식한다. 기존 `/art` 설명 탭은 유지하고, 합성 카탈로그·상세 UI·데이터 접근 코드와 하위 경로는 기존 미술품 API 및 타입과 충돌하지 않도록 별도 namespace에 둔다.

원본 자산 중 `data/synthetic/art-investment.json`과 `public/synthetic-art/`를 복사한다. 동일한 정적 빌드 복제본인 `live/data/synthetic/art-investment.json`과 `live/synthetic-art/`는 복사하지 않는다. 브랜치 전체 merge 또는 commit cherry-pick은 하지 않으며, 현재 `/api/products`와 수동 검증 데이터 흐름을 덮어쓰지 않는다.

원본 합성 JSON에 포함된 4단계 판단값은 데이터 원본 보존을 위해 남길 수 있지만 새 UI·프론트엔드 타입·필터·검색·비교 로직에서는 소비하거나 노출하지 않는다. 합성 상품의 판단 상태는 `합성 데이터 · 대조 불가`로 중립 표시한다.

### Decision basis

- **User-confirmed:** 사용자는 `synthetic-feature-restore` 브랜치와 최신 커밋 `e65337f`를 작업 원본으로 지정하고, 현재 분석 탭 레이아웃을 무시한 채 그 레이아웃·더미 미술품 데이터·미술품 선택 UI를 모두 가져오라고 요청했다.
- **User-confirmed:** 다른 페이지와의 디자인 디테일 조율은 이식 이후 별도 지시하겠다고 했다.
- **Inferred:** 요청 범위가 분석 탭이므로 현재 `/art` 설명 탭은 유지한다. 근거는 사용자가 교체 대상을 일관되게 “분석 탭”으로 한정한 점이다.
- **Inferred:** 기존 수동 검증 API와 합성 UI를 namespace로 분리하는 것이 두 데이터 계약의 혼동과 회귀를 줄이는 최소 변경이다. 근거는 현재 API 계약과 합성 데이터 표시 정책이다.

## Alternatives considered

| Alternative | Benefits | Costs / risks | Why not selected |
| --- | --- | --- | --- |
| 브랜치 전체 merge 또는 commit cherry-pick | 원본 구현을 가장 빠르게 가져올 수 있음 | 현재 통합 브랜치의 수정과 충돌하며 라우트·API·전역 스타일·금지된 4단계 판단까지 함께 들어올 수 있음 | 요청 범위를 넘어가고 현재 데이터 계약을 보호하기 어려움 |
| `live/search.html` 정적 화면 이식 | 독립 실행이 쉽고 정적 결과를 그대로 재현 가능 | 현재 Next.js 분석 탭과 라우팅 구조가 다르고, 작품 카드의 상세 이동 흐름이 기준 구현보다 제한적임 | 분석 탭에 직접 대응하는 donor Next.js `/art`를 선택함 |
| 현재 `/api/products`와 미술품 타입을 합성 데이터로 교체 | 코드 경로가 하나라 단순해 보임 | 수동 검증 5개 상품 계약을 깨고 합성·검증 데이터를 구분할 수 없음 | 기존 계약 유지가 필요함 |
| 현재 분석 레이아웃에 합성 카드만 추가 | 변경 범위가 작음 | 현재 레이아웃을 무시하고 donor UI를 이식하라는 명시적 요청을 충족하지 못함 | 사용자가 donor 레이아웃을 기준으로 선택함 |

## Rationale

donor Next.js `/art`는 사용자가 지정한 commit 안에서 분석 탭과 가장 직접적으로 대응하고, 카탈로그에서 작품 상세로 이어지는 상호작용을 이미 제공한다. 필요한 파일만 분리 이식하면 현재 설명 탭과 수동 검증 미술품 계약을 보존하면서도 요청한 합성 미술품 탐색 경험을 재현할 수 있다.

4단계 투자 판단은 합성 근거만으로 결론을 내리지 않는다는 프로젝트 정책과 충돌한다. 따라서 레이아웃과 탐색 상호작용은 이식하되 판단 의미는 가져오지 않고, 검증 불가능한 상태를 명시적으로 표시한다.

## Consequences

### Positive

- 분석 탭에서 9개 현재 상품과 318개 과거 기록을 포함한 합성 미술품 카탈로그를 탐색할 수 있다.
- 작품 선택 후 합성 상품 상세 흐름을 현재 수동 검증 API와 독립적으로 제공할 수 있다.
- 기존 `/art` 설명 화면과 검증된 5개 미술품 데이터 계약을 유지한다.
- 정적 `live/` 복제본을 추가하지 않아 동일 데이터와 이미지의 중복 관리를 피한다.

### Negative / tradeoffs

- 합성 카탈로그와 기존 검증 미술품 화면이 별도 코드 경로로 유지되어 일부 중복이 생긴다.
- donor 화면의 전역 스타일을 그대로 가져오지 않으므로 픽셀 단위로 완전히 동일하지 않을 수 있다.
- 원본 JSON에는 사용하지 않는 4단계 판단 필드가 남아 있어 UI 경계에서 지속적인 비노출 관리가 필요하다.
- 다른 카테고리와의 디자인 일관성 조정은 후속 작업으로 남는다.

## Guardrails

- `/art` 설명 탭과 현재 수동 검증 미술품 데이터 흐름을 유지한다.
- 합성 데이터 repository, UI 컴포넌트와 상세 경로는 기존 `src/lib/art`, `src/components/art`, `/api/products` 계약을 덮어쓰지 않는 이름과 경로를 사용한다.
- `data/synthetic/art-investment.json`과 `public/synthetic-art/`만 source asset으로 추가하고 byte-identical `live/` 복제본은 추가하지 않는다.
- donor 브랜치를 merge하거나 commit을 cherry-pick하지 않고 필요한 파일과 동작만 이식한다.
- 4단계 판단값과 라벨은 새 프론트엔드 타입·검색·필터·비교·렌더링에서 사용하지 않는다.
- 합성 상품은 `합성 데이터 · 대조 불가`로 표시하고 실제 투자 검증 결과로 오인할 수 있는 문구를 넣지 않는다.
- donor 전역 CSS를 import하지 않고 현재 애플리케이션의 다른 경로에 스타일이 누출되지 않게 범위를 제한한다.

## Validation

- 분석 탭에서 `전체 327`, `현재 상품 9`, `과거 기록 318` 범위를 확인하고 검색·필터·페이지 이동이 URL 상태와 함께 동작해야 한다.
- 현재 상품과 과거 기록 카드를 선택했을 때 각각의 합성 상세 화면으로 이동하고, 상세 화면의 모든 내부 링크가 존재하는 경로를 가리켜야 한다.
- 합성 화면에서 donor의 4단계 판단 라벨이 렌더링되지 않고 `합성 데이터 · 대조 불가`가 표시되어야 한다.
- 기존 `/art` 설명 탭과 `/api/products` 응답 및 관련 테스트가 이식 전 계약을 유지해야 한다.
- `data/synthetic/art-investment.json`과 `public/synthetic-art/`의 327개 SVG가 존재하고, 동일 목적의 `live/` 복제 파일은 새로 추가되지 않아야 한다.
- lint, TypeScript 검사, 테스트와 Next.js build가 모두 성공해야 한다.

## Revisit triggers

- 합성 데이터가 실제 근거 또는 공식 데이터로 교체될 때.
- 프로젝트의 판단 등급 정책이 변경되어 합성 데이터의 평가 결과를 표시할 수 있게 될 때.
- donor 브랜치에 반영해야 할 새로운 카탈로그 또는 상세 상호작용이 추가될 때.
- 기존 검증 미술품과 합성 카탈로그를 하나의 API 계약으로 통합하기로 결정할 때.
- 다른 카테고리와의 디자인 통합 작업을 시작할 때.

## Sources

- Current conversation (no durable link).
- [`synthetic-feature-restore` branch](https://github.com/yeony-park/finance-ai-challenge-2026/tree/synthetic-feature-restore)
- [Donor commit `e65337f`](https://github.com/yeony-park/finance-ai-challenge-2026/commit/e65337f06b6143f45c2be7698f5674f9d0f5dd9d)
- [미술품 이식 브리프](../planning/%EC%9D%B4%EC%8B%9D-%EB%B8%8C%EB%A6%AC%ED%94%84-%EB%AF%B8%EC%88%A0%ED%92%88.md)
- [API 계약](../spec/08-api-contract.md)
- [스택 및 저장 정책](../spec/09-stack-and-storage.md)

## Amendments

- None.
