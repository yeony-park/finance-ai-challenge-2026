# DAKER 개발 지침

## 작업 시작

- 이 파일과 `PROJECT_STATUS.md`, `CODEX_GOAL.md`, `README.md`, `docs/PRD.md`, `docs/data.md`를 먼저 확인한다.
- 프로젝트 루트는 `/Users/karlpark/projects/DAKER_1/finance-ai-challenge-2026`이다.
- 기존 구현과 사용자 변경을 보존하고, 관련 없는 리팩터링은 하지 않는다.
- 프로젝트 custom agent인 Terra·Luna와 `$ai-dev`, `$orca-ai-team` workflow는 사용자가 명시적으로 요청한 경우에만 사용한다.
- 전역 skill source와 호출명은 `/Users/karlpark/.codex/skill-library/SKILLS.md`에서 확인한다.

## 사실·데이터 원칙

- 확인된 사실, 계산 결과, 추정을 구분한다. 불완전한 근거는 `null`, `확인 불가`, `판정 보류`로 유지한다.
- 숫자에는 출처와 기준 시점을 표시한다. 공시·공식 사이트 원문과 저장본·실시간 값을 구분한다.
- 표본 부족, 거래 중단, 현재성 만료, 식별 불충분 상태에서 가격 적정성이나 매수 판단을 만들지 않는다.
- 개인화된 매수·매도 권유, 수익률 약속, 추정 시세는 범위 밖이다.

## 보안·실행

- `.env`의 값은 읽거나 출력하거나 Git에 추가하지 않는다. 인증키를 브라우저, 응답 JSON, URL에 노출하지 않는다.
- 권장 실행은 `python3 server.py`이며 `127.0.0.1:8000`만 사용한다.
- 정적 배포본은 `python3 scripts/build_live_static.py`로 생성한 `/live`만 제공한다. 프로젝트 루트를 정적 서버로 공개하지 않는다.
- 외부 API 실패 시 검증된 저장본과 실패 상태를 유지하며, 확인되지 않은 값으로 채우지 않는다.

## 파일 안내

- 서버·API adapter : `server.py`
- UI : `index.html`, `styles.css`, `js/app.js`, `js/api.js`, `js/calculations.js`
- 데이터 : `data/products.json`, `data/issuers.json`, `data/source_snapshots.json`, `data/sou_property_configs.json`
- 검증 : `tests/validate_data.py`, `tests/test_calculations.mjs`, `tests/test_api.mjs`, `tests/test_server.py`, `tests/test_live_static.py`, `tests/smoke_live.py`
- 공개 정적본 builder : `scripts/build_live_static.py`

## 변경 후 검증

관련 범위에 맞춰 아래 검증을 실행하고, 실행 명령·통과 여부·미검증 항목을 보고한다.

```bash
python3 tests/validate_data.py
npm run test:js
python3 -m unittest tests/test_server.py tests/test_live_static.py
npm run check:live
```

네트워크 smoke test는 결정적 회귀 테스트와 구분한다.

```bash
python3 tests/smoke_live.py
```
