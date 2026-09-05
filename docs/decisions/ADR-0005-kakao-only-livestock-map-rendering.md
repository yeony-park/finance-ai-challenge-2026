# ADR-0005: 축산 질병 지도는 Kakao 베이스맵만 렌더링

- **Status:** Accepted
- **Decision date:** 2026-09-04
- **Supersedes:** [ADR-0004](./ADR-0004-shared-livestock-report-map-template.md)
- **Superseded by:** None

## Context

ADR-0004는 Kakao 지도 SDK를 불러오지 못했을 때 Natural Earth 대한민국 윤곽을 사용하는 SVG 대체 지도를 같은 프레임에 표시하도록 결정했다. 실제 화면에서는 SDK 로딩 문구와 질병 필터가 SVG 위에 겹쳐, 사용자가 대체 지도를 Kakao 지도로 오인할 수 있었다.

## Decision

한우·한돈 질병 지도는 Kakao 지도 SDK가 준비된 경우에만 베이스맵, 질병 마커와 필터를 표시한다. SDK가 준비되지 않았거나 키가 없으면 별도 지도 윤곽을 렌더링하지 않고 중립적인 로딩 또는 오류 문구만 표시한다. 화면 설명과 접근성 이름에서도 지도 공급자 이름을 제품 문구로 사용하지 않는다.

### Decision basis

- **User-confirmed:** Kakao 지도로 구현하고 Natural Earth로 보이는 지도를 제거한다.
- **User-confirmed:** 화면의 “kakao map” 텍스트를 제거한다.
- **Inferred:** 공급자 이름보다 실제 지도 로딩 성공 여부를 분명하게 구분하는 것이 오인을 줄인다.

## Alternatives considered

| Alternative | Benefits | Costs / risks | Why not selected |
| --- | --- | --- | --- |
| Natural Earth SVG 대체 지도 유지 | 키가 없어도 분포를 볼 수 있음 | Kakao 지도 적용 여부를 오인할 수 있음 | 사용자 요청과 충돌 |
| 정적 Kakao 지도 이미지로 대체 | 동일 공급자의 지도 외형 유지 | 별도 API·쿼터·오류 경로가 추가됨 | 현재 범위보다 복잡함 |
| Kakao SDK 성공 시에만 지도 표시 | 공급자와 렌더링 상태가 일치함 | SDK 실패 시 지도 대신 오류 상태만 보임 | 선택 |

## Consequences

### Positive

- Natural Earth 윤곽이 제품 화면에 표시되지 않는다.
- 질병 필터와 마커는 Kakao 베이스맵이 준비된 뒤에만 표시된다.
- 로딩 문구가 필터 뒤에 겹쳐 공급자 이름 일부만 보이던 문제가 사라진다.

### Negative / tradeoffs

- 카카오 키 누락, 도메인 미등록 또는 SDK 장애 시 지도 분포를 볼 수 없다.
- 외부 SDK 가용성에 대한 화면 의존도가 커진다.

## Guardrails

- SDK 준비 상태가 `ready`가 아니면 질병 필터와 마커 상세 패널을 표시하지 않는다.
- 실패 상태에서 타 공급자의 윤곽·타일·정적 지도를 렌더링하지 않는다.
- 키 값은 화면이나 로그에 출력하지 않는다.
- 질병 발생 좌표는 계속 행정구역 대표 좌표만 사용한다.

## Validation

- 키가 없는 렌더 결과에 `svg`, `Kakao Map`, `Natural Earth` 문자열이 없어야 한다.
- 유효한 키와 등록 도메인의 브라우저에서 Kakao 지도 타일과 질병 마커가 표시되어야 한다.
- TypeScript, ESLint, 관련 단위 테스트와 프로덕션 빌드가 통과해야 한다.

## Revisit triggers

- 카카오 SDK 장애 시에도 반드시 지도를 제공해야 한다는 제품 요구가 생길 때.
- 정적 Kakao 지도 API를 별도 폴백으로 도입할 때.
- 지도 공급자를 교체하거나 다중 공급자를 지원할 때.

## Sources

- Current conversation (no durable link).
- [축산 질병 지도 컴포넌트](../../src/components/pig/PigAsfKakaoMap.tsx)
- [공통 축산 지도 렌더러](../../src/components/livestock-disease/LivestockDiseaseMap.tsx)
