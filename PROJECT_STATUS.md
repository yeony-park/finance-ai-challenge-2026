# DAKER 작업 인수인계

기준 시점: 2026-08-15 KST

## 현재 범위

- 사용자 UI와 카탈로그는 미술품 조각투자 전용이다.
- `data/products.json`에는 미술품 상품 5건만 있다.
- 플랫폼 자체 게시 이력은 ArtNGuide 187건, 아트투게더 145건, TESSA 6건으로 총 338건이다.
- `lib/art/opendart-verification.ts`의 OpenDART 원문 ZIP 확인은 서버 전용이며, 저장된 금액·작품 정보를 실시간 값으로 바꾸지 않는다.
- `server.py`와 `/live`는 검증 저장본만 제공하며 외부 상품 API를 호출하지 않는다.

## 검증

변경 뒤에는 `AGENTS.md`의 결정적 검증 명령과 Next.js lint, typecheck, build를 실행한다. 네트워크 확인은 결정적 테스트와 분리하며, 키·로컬 환경 설정을 읽거나 출력하지 않는다.
