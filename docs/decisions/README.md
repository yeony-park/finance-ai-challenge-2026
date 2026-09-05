# Project Decision Records

This index lists material project decisions. Each ADR contains its rationale, alternatives, consequences, validation, and revisit triggers.

| ADR | Date | Status | Decision |
| --- | --- | --- | --- |
| [ADR-0001: 미술품 공식 이미지 4건 임시 사용](./ADR-0001-temporary-art-image-exception.md) | 2026-08-30 | Accepted | 과거 미술품 화면의 공식 이미지 4건을 정확한 URL 허용 목록으로 임시 사용하고, 상품 5는 이미지 미등록 상태로 유지한다. |
| [ADR-0002: CI 기반 PR 병합 가드레일](./ADR-0002-ci-pr-merge-guardrails.md) | 2026-08-31 | Accepted | `integration` 대상 PR에서 lint·타입 검사·테스트·빌드를 실행하고, CI 성공과 명시적 병합 동의가 확인된 경우에만 병합한다. |
| [ADR-0003: 합성 미술품 분석 UI 독립 이식](./ADR-0003-synthetic-art-analysis-transplant.md) | 2026-09-01 | Accepted | donor Next.js `/art`를 합성 데이터 namespace에 이식하고 기존 설명 탭·검증 API는 유지하며, 4단계 판단 대신 `합성 데이터 · 대조 불가`를 표시한다. |
| [ADR-0004: 축산 리포트 공통 지도 템플릿과 지연 로딩](./ADR-0004-shared-livestock-report-map-template.md) | 2026-09-01 | Superseded | 한우·한돈 리포트가 공통 섹션 프레임과 축종별 질병 지도 슬롯을 사용하고, 지도 코드·데이터는 해당 슬롯이 화면에 가까워질 때 로드한다. |
| [ADR-0005: 축산 질병 지도는 Kakao 베이스맵만 렌더링](./ADR-0005-kakao-only-livestock-map-rendering.md) | 2026-09-04 | Accepted | Kakao 지도 SDK가 준비된 경우에만 베이스맵·마커·필터를 표시하고 별도 윤곽 지도는 사용하지 않는다. |
