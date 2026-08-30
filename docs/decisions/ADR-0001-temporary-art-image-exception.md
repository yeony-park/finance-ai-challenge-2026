# ADR-0001: 미술품 공식 이미지 4건 임시 사용

- **Status:** Accepted
- **Decision date:** 2026-08-30
- **Supersedes:** None
- **Superseded by:** None

## Context

미술품 분석 화면은 5상품 모두에 동일한 로컬 placeholder를 표시해 실제 작품 선택 UI와 다르게 보였다. 과거 `e4a4bf5` 구현에는 상품 1~4의 공식 상품 원문에 연결된 이미지 URL이 있었고 상품 5에는 이미지가 없었다. 저장소 정책은 제3자 호스팅 이미지 렌더링을 금지하므로 예외 여부를 사용자에게 명시적으로 확인했다.

## Decision

상품 1~4의 과거 공식 이미지 URL과 상품 원문 URL을 `/art`의 클릭형 선택 카드와 공개 상품 DTO에서 임시 사용한다. 상품 5는 다른 작품 이미지를 대체하지 않고 `imageType: "missing"`, `imageUrl: null`로 유지한다.

### Decision basis

- **User-confirmed:** 정책 충돌과 권한 확인 필요성을 안내한 뒤 사용자가 2026-08-30에 “응 일단 사용해줘”라고 임시 사용을 승인했다.
- **Inferred:** 과거 이미지 카드와 현재 상품 선택·Evidence Copilot 동기화를 결합하려는 의도다. 근거는 직전 대화의 “그림이 이렇게 나오는 게 아닐텐데”와 이전 브랜치 UI 이식 요청이다.

## Alternatives considered

| Alternative | Benefits | Costs / risks | Why not selected |
| --- | --- | --- | --- |
| 로컬 placeholder 5건 유지 | 외부 의존과 권리 위험 없음 | 실제 작품 선택 UI와 다르고 동일 이미지가 오해를 만듦 | 사용자가 현재 결과를 거부함 |
| 허가된 로컬 이미지가 제공될 때까지 이미지 숨김 | 정책을 그대로 유지 | 요청한 작품 이미지 UI를 지금 제공하지 못함 | 사용자가 임시 원격 이미지 사용을 선택함 |
| 공식 이미지 4건 정확 허용 | 과거 화면과 가까우며 실제 상품을 구분 가능 | CDN 가용성·권리 재검토 필요 | 선택됨 |

## Rationale

사용 이유의 상세 법적·사업적 근거는 명시되지 않았다. 사용자 확인은 임시 사용 승인으로만 기록하며 저작권 또는 플랫폼 이용허락 확보로 해석하지 않는다.

## Consequences

### Positive

- 네 상품을 실제 작품 이미지로 구분해 선택할 수 있다.
- 기존 `?product=` 선택 상태와 Evidence Copilot 동기화를 유지할 수 있다.
- 상품 5에 다른 유영국 작품을 잘못 연결하지 않는다.

### Negative / tradeoffs

- 외부 CDN 가용성에 의존한다.
- 공개 배포 전 별도의 권리 확인이 필요하다.
- 이미지 URL과 원문 URL이 공개 상품 API에 포함된다.

## Guardrails

- `ART_PRODUCT_MEDIA_BY_ID`의 네 이미지·원문 쌍만 허용하고 다른 URL은 Zod 경계에서 거부한다.
- Next Image는 네 파일의 정확한 HTTPS URL만 허용하고 query·리다이렉트·로컬 IP를 차단한다.
- 상품 5는 이미지 없음으로 표시하며 유사 작가·동명 작품 이미지를 대신 사용하지 않는다.
- 이미지는 `object-fit: contain`과 높이 상한을 적용해 자르거나 화면을 덮지 않게 한다.
- 이 결정은 권리 확보 사실로 표기하지 않는다.

## Validation

- repository·API 테스트에서 상품별 이미지 URL·원문 URL과 상품 5의 null 상태를 고정한다.
- schema 부정 테스트에서 미승인 URL과 잘못 연결된 이미지·원문 쌍을 거부한다.
- `/_next/image` 응답 4건이 200이고 콘솔 CSP·optimizer 오류가 없어야 한다.
- 5/3/2열 반응형 화면에서 이미지가 잘리지 않고 카드 선택이 URL·분석·Copilot에 함께 반영돼야 한다.

## Revisit triggers

- 외부 배포 또는 심사 제출 전.
- 권리 확인 결과가 부정적이거나 불명확할 때.
- CDN 이미지가 차단·교체·리다이렉트될 때.
- 허가된 로컬 작품 이미지가 제공될 때.

## Sources

- Current conversation (no durable link).
- [미술품 데이터 정책](../spec/05-data-policy.md)
- [미술품 상품 미디어 모델](../../src/lib/art/product-model.ts)
- Git commit `e4a4bf5b75b3b8191fd2dfb96ba008f6d9017a45` (`feat: add art disclosure evidence gallery`).

## Amendments

- None.
