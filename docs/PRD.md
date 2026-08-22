# DAKER 미술품 조각투자 실사 대시보드 PRD

## 제품 정의

DAKER는 미술품 조각투자 상품을 단순 나열하지 않는다. 공모금액, 작품 식별, 공개 비교 근거, 회수 조건과 플랫폼 자체 게시 이력을 원문 링크·기준일·한계와 함께 보여준다.

## 데이터 범위

- 현재 상품: `data/products.json`의 미술품 5건
- 플랫폼 자체 게시 이력: ArtNGuide 187건, 아트투게더 145건, TESSA 6건
- 데모: `data/demo/art-investment.json`의 명시적 데모 데이터
- OpenDART: 서버 전용 원문 ZIP·XML 존재 확인. 금액과 작품 필드는 자동 추출·검산 전 저장 수치로 유지한다.

플랫폼 자체 게시 이력은 독립 검증된 발행사 청산 실적이나 가격 적정성 표본으로 합산하지 않는다. 통화, 작품 identity, 발행사 관계가 확인되지 않은 값은 추정하지 않는다.

## 요구사항

- 상품·작가·플랫폼·과거 기록을 분리해 탐색한다.
- 핵심 수치에 출처 URL과 기준일을 표시한다.
- 가격 비교에서 동일 작품과 유사 작품, KRW와 다른 통화를 분리한다.
- 표본 부족, 작품 식별 불충분, 현재성 만료, 청약·처분 상태 미확인 때는 판정을 보류한다.
- OpenDART 인증키는 서버에만 보관한다. 인증·일시 오류와 형식 오류는 성공 결과로 표시하거나 장기 cache하지 않는다.
- `/live`와 Python 서버는 고정 allowlist의 검증 저장본만 제공한다.

## 비목표

개인별 매수·매도 추천, 목표수익률 또는 원금 보장, 감정·진위·법률 판단 대체, 로그인·회원·세션 데이터 수집은 제공하지 않는다.

## 검증

```bash
npm run lint
npm run typecheck
npm run test:art
npm run test:js
npm run build
python3 tests/validate_data.py
python3 scripts/build_artnguide_track_records.py --check
python3 scripts/build_artnguide_due_diligence.py --check
python3 scripts/build_weshareart_research.py --check
python3 -m unittest tests/test_artnguide_data.py tests/test_artnguide_due_diligence.py tests/test_weshareart_data.py tests/test_tessa_data.py tests/test_server.py tests/test_live_static.py
npm run check:live
```
