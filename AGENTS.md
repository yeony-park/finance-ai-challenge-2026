# JeomJeom·DAKER 개발 지침

## 작업 시작

작업 전에 다음 문서를 순서대로 확인한다.

1. `docs/product-scope.md` — 제품 목표, 팀 역할, AI 경계
2. `docs/competition.md` — 공모전 일정과 제출 조건
3. `docs/development.md` — Next.js 실행, 라우트, 검증 방법
4. `docs/design-system.md` — 공통 UI/UX 규칙
5. `PROJECT_STATUS.md`, `CODEX_GOAL.md`, `docs/PRD.md`, `docs/data.md` — 기존 데이터·검증 서비스 상태

- 프로젝트 루트는 `/Users/karlpark/projects/DAKER_1/finance-ai-challenge-2026`이다.
- 기존 구현과 사용자 변경을 보존하고 관련 없는 리팩터링은 하지 않는다.
- Terra·Luna와 `$ai-dev`, `$orca-ai-team` workflow는 사용자가 명시적으로 요청한 경우에만 사용한다.

## UI와 페이지 경계

- 공통 UI/UX 기준은 `app/globals.css`와 `docs/design-system.md`다.
- Next.js App Router의 `/`가 기본 UI이며 `components/site-header.tsx`가 공통 탐색을 제공한다.
- 담당 페이지 구현은 해당 `page.tsx`와 페이지 전용 파일에 둔다.

| 담당 | 페이지 | 기본 작업 파일 |
| --- | --- | --- |
| 공통 | Overview | `app/page.tsx` |
| 문수 | 부동산 | `app/real-estate/page.tsx` |
| 원준 | 가축·한우 | `app/livestock/cattle/page.tsx` |
| 연정 | 가축·돼지 | `app/livestock/pig/page.tsx` |
| 현석 | 미술품 | `app/art/page.tsx` |

- `components/asset-page.tsx`, `components/site-header.tsx`, `app/globals.css`는 전 페이지에 영향을 주므로 필요한 경우에만 수정한다.
- 실제 데이터가 연결되지 않은 값은 `샘플`, `미확인`, `연결 대기`로 표시한다.

## 사실·데이터 원칙

- 확인된 사실, 계산 결과, 추정을 구분한다. 불완전한 근거는 `null`, `확인 불가`, `판정 보류`로 유지한다.
- 숫자에는 출처와 기준 시점을 표시한다. 공시·공식 사이트 원문과 저장본·실시간 값을 구분한다.
- 표본 부족, 거래 중단, 현재성 만료, 식별 불충분 상태에서는 가격 적정성이나 매수 판단을 만들지 않는다.
- 개인화된 매수·매도 권유, 수익률 약속, 추정 시세는 범위 밖이다.
- 공시 사실, 외부 대조 결과, AI 설명을 구분하고 모든 핵심 사실값에 출처 URL과 기준일을 둔다.

## 보안·실행

- `.env` 값을 읽거나 출력하거나 Git에 추가하지 않는다. 인증키를 브라우저, 응답 JSON, URL에 노출하지 않는다.
- Next.js UI는 `npm run dev`로 실행하고 `http://localhost:3000`에서 확인한다.
- 합성 데이터 서버는 `python3 server.py`로 `127.0.0.1:8000`에서만 실행한다.
- 정적 산출물은 `python3 scripts/build_live_static.py`로 생성한 합성 전용 `/live`만 제공한다. 프로젝트 루트를 정적 서버로 공개하지 않는다.
- 운영 코드·Docker context·API·UI는 `data/synthetic/art-investment.json`과 허용된 OpenDART 경계만 사용한다.
- 합성 상품을 실제 OpenDART 접수번호와 연결하지 않는다.

## 파일 안내

- 기본 UI : `app/`, `components/`, `app/globals.css`
- 합성 데이터 서버 : `server.py`
- 합성 검색 UI : `index.html`, `search.html`, `suitability.html`, `styles.css`, `js/`
- 운영 데이터 : `data/synthetic/art-investment.json`
- 합성 이미지 : `public/synthetic-art/`
- OpenDART 제어 정보 : `data/art/dart-filing-manifest.json`
- 데이터 경계 검사 : `scripts/check_synthetic_boundary.py`
- 검증 : `tests/`

## 변경 후 검증

Next.js UI 변경은 아래 명령을 실행한다.

```bash
npm run lint
npm run typecheck
npm run build
```

데이터·합성 검색 UI 변경은 관련 범위에 맞춰 아래 명령을 실행한다.

```bash
python3 tests/validate_data.py
python3 -m unittest tests/test_synthetic_data.py tests/test_server.py tests/test_live_static.py
npm run test:js
npm run build:live
npm run check:live
npm run check:synthetic-source
npm run check:synthetic-artifact
```

네트워크 smoke test는 결정적 회귀 테스트와 구분한다.

```bash
python3 tests/smoke_live.py
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
