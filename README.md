# JeomJeom

미술품·부동산·가축(한우·돼지) STO의 공시와 외부 근거를 연결하는 검토 지원 플랫폼이다. `origin/main`의 Next.js UI/UX 골격을 기본 화면으로 사용하고, DAKER의 검증 데이터·검색 API·정적 검색 화면을 함께 보존한다.

## 기본 UI 실행

Node.js 22와 npm을 권장한다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 연다. Docker 사용 방법과 라우트별 담당 파일은 [`docs/development.md`](docs/development.md)를 참고한다. 공통 타이포·색상·간격·카드 규칙은 [`docs/design-system.md`](docs/design-system.md)를 따른다.

| 라우트 | 영역 | 담당 |
| --- | --- | --- |
| `/` | 통합 Overview | 공통 |
| `/real-estate` | 부동산 | 문수 |
| `/livestock/cattle` | 가축·한우 | 원준 |
| `/livestock/pig` | 가축·돼지 | 연정 |
| `/art` | 미술품 | 현석 |

## DAKER 데이터·검색 서비스

기본 상품 8건과 아트앤가이드 187건, 아트투게더 145건, TESSA 6건을 합친 346건을 검증 저장본 기반 검색 인덱스로 연결한다. 전체 목록은 나열하지 않고 검색어·자산 분류·상태 조건에 맞는 항목만 표시한다. 원문 근거와 기준일을 표시하지만 개인별 매수·매도 권유나 공식 감정평가는 제공하지 않는다.

```bash
python3 server.py
```

`http://127.0.0.1:8000`에서 메인 `index.html`, 검색 결과 `search.html`, 적합성 테스트 자료 `suitability.html`을 제공한다. `.env`의 인증키는 브라우저·응답 JSON·출처 URL에 노출하지 않는다. 외부 API가 실패하면 검증 저장본과 실패 상태를 유지한다.

주요 저장본은 다음과 같다.

- `data/artnguide_track_records.json` : 2026-08-10 21:22 KST 검증 187건
- `data/weshareart_research.json` : 2026-08-10 21:42~21:46 KST 검증 145건과 적합성 테스트 10문항
- `data/tessa_sale_records.json` : 2026-08-10 21:53 KST 검증 6건

공개 정적본은 `npm run build:live`로 생성하며 `/live`의 고정 allowlist 13개 파일만 제공한다. 상세한 출처·법적 경계·비교 규칙은 [`docs/PRD.md`](docs/PRD.md)와 [`docs/data.md`](docs/data.md)를 참고한다.

## 검증

Next.js UI :

```bash
npm run lint
npm run typecheck
npm run build
```

DAKER 데이터·검색 서비스 :

```bash
python3 tests/validate_data.py
python3 scripts/build_artnguide_track_records.py --check
python3 scripts/build_artnguide_due_diligence.py --check
python3 scripts/build_weshareart_research.py --check
npm run test:js
python3 -m unittest tests/test_server.py tests/test_live_static.py
npm run check:live
```
