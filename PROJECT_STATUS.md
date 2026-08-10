# DAKER 작업 인수인계

기준 시점 : 2026-08-10 16:51 KST

## 현재 위치와 보존 상태

- [팩트] 프로젝트 루트는 `/Users/karlpark/projects/DAKER_1/finance-ai-challenge-2026`이다. 근거 : 2026-08-10 14:44 KST `git rev-parse --show-toplevel` 및 상위 폴더 목록 확인.
- [팩트] 기존 `DAKER_1`의 앱, 데이터, 테스트, 문서, 작업 산출물, `.codex`, `.vscode`, `.env`를 이 저장소로 이동했다. 최초 이동 뒤 상위 `_workspace`에 새로 생긴 `조각투자_쉬운설명.md`도 대상 `_workspace`로 추가 이동했다. 근거 : 2026-08-10 14:47 KST 상위 폴더에는 `finance-ai-challenge-2026`만 남은 것을 확인.
- [팩트] 챌린지 저장소의 기존 2줄 `README.md`는 `CHALLENGE_README.md`로 보존했고, DAKER 설명 문서를 루트 `README.md`로 배치했다. 근거 : 2026-08-10 14:44 KST 로컬 파일 확인.
- [팩트] `.env`, `.DS_Store`, `_workspace`는 로컬에 보존되어 있으나 `.gitignore`로 Git 추적에서 제외된다. 근거 : 2026-08-10 14:44 KST `git check-ignore -v`.
- [팩트] 원격 저장소는 `https://github.com/yeony-park/finance-ai-challenge-2026.git`, branch는 `main`이다. 근거 : 2026-08-10 KST `git remote -v`, `git status --branch`.

## 검증 기준선

- [팩트] `python3 tests/validate_data.py` : `PASS: data`. 실행 시점 : 2026-08-10 14:44 KST.
- [팩트] `npm run test:js` : calculation 및 API fallback 테스트 통과. 실행 시점 : 2026-08-10 14:44 KST.
- [팩트] `python3 -m unittest -v tests/test_server.py tests/test_live_static.py` : 30건 통과. 실행 시점 : 2026-08-10 14:44 KST. 최초 샌드박스 실행은 로컬 port bind 권한으로 2건 오류였고, 허용된 로컬 환경에서 같은 테스트를 재실행해 통과했다.
- [팩트] `npm run build:live`, `npm run check:live` : 고정 allowlist 7개 파일의 생성 및 hash 검증 통과. 실행 시점 : 2026-08-10 14:44 KST.
- [팩트] `python3 tests/smoke_live.py` : 저장 catalog의 부동산 3건, 미술품 5건 검증 통과. 실행 시점 : 2026-08-10 14:44 KST.
- [미확인] 같은 smoke test에서 SOU, RTMS, 건축HUB, VWorld, OpenDART 관련 외부 확인 17건은 현재 네트워크 또는 인가 상태를 확정하지 못해 `SKIP`됐다. 실시간 API 정상 동작을 증명하지 않는다.
- [팩트] 새 경로에서 `python3 server.py`를 실행하고 브라우저로 확인했다. 전체 상품 8건이 렌더링됐고 부동산 filter 선택 시 3건만 표시됐다. 1440×900 desktop override와 390×844 mobile override에서 문서 전체의 수평 overflow는 없었다. `127.0.0.1` 페이지에서 발생한 console error 또는 warning은 없었다. 실행 시점 : 2026-08-10 14:45 KST.

## Codex 연속성

- [팩트] 루트 `AGENTS.md`가 시작 파일, 사실·데이터 원칙, 보안, 파일 지도, 검증 명령을 지정한다.
- [팩트] `.codex/config.toml`과 `.codex/agents/terra.toml`, `.codex/agents/luna.toml`이 저장소 내부에 있다.
- [팩트] Codex CLI `0.147.0`의 `codex --strict-config doctor --json`에서 config load, authentication, Git 저장소 탐지는 `ok`였고 cwd는 현재 프로젝트 루트로 인식됐다. 실행 시점 : 2026-08-10 14:44 KST.
- [미확인] 같은 doctor 실행의 provider reachability는 DNS·HTTP 연결 실패로 `fail`, WebSocket은 `warning`이었다. 로컬 설정 파일의 parse와 인증 저장 상태는 확인했지만 당시 외부 모델 연결 성공은 확인하지 못했다.
- [팩트] Terra, Luna, `$ai-dev`, `$orca-ai-team` workflow는 사용자가 명시적으로 요청한 경우에만 사용한다.
- [팩트] 2026-08-10 15:06 KST `im-not-ai`, `ai-dev`, `orca-ai-team` source를 `~/.codex/skill-library/`에 모았고, `~/.codex/skills/`에는 전역 자동 탐색용 symlink를 배치했다. `im-not-ai`의 Codex 호출명은 원본 frontmatter에 따라 `$humanize-korean`이다.

## 다음 작업 시 주의

- [팩트] 2026-08-10 16:51 KST `hyunsuk` branch에 기능별 commit을 만들고 `origin/hyunsuk`로 push했다. 근거 : `git log --oneline --decorate`, `git status -sb`, Git push 성공 응답.
- `.env` 값은 출력하거나 Git에 추가하지 않는다.
- 실시간 출처 상태는 이 문서의 과거 결과로 단정하지 말고 해당 작업 시점에 다시 확인한다.
- 변경 뒤에는 `AGENTS.md`의 검증 명령과 실제 브라우저 화면을 다시 확인한다.

## 2026-08-10 연구 데이터 및 화면 통합

- [팩트] 2026-08-10 21:10~21:59 KST 공개 화면과 공개 API를 조회해 ArtNGuide 작품 트랙레코드 187건(1~19페이지), WeshareArt 지난 공동구매 145건(1~15페이지), WeshareArt 투자계약증권 적합성 테스트 10문항, TESSA 매각·정산 공시 6건을 영문 파일명의 Markdown으로 보존했다. 원문 출처 : `https://artnguide.co.kr/purchase-summary`, `https://weshareart.com/goods?type=ALL&page=1`, `https://weshareart.com/invest/tendency/inquiry`, TESSA 문서별 링크는 해당 Markdown에 수록.
- [팩트] 산출물은 `deliverables/artnguide_artwork_track_records_2026-08-10.md`, `deliverables/weshareart_co_purchase_track_records_2026-08-10.md`, `deliverables/weshareart_investment_contract_securities_suitability_test_2026-08-10.md`, `deliverables/tessa_artwork_sale_disclosures_2026-08-10.md`이다. 회원정보, 계정·세션값, 개인 답안·결과·만기일, UTM 값은 수집하지 않았고 WeshareArt 작가 상세의 개인 프로필성 9개 필드는 145건 모두 제거했다.
- [팩트] `data/artnguide_track_records.json`, `data/weshareart_research.json`, `data/tessa_sale_records.json`과 `/api/track-records/artnguide`, `/api/research/weshareart`, `/api/track-records/tessa`를 추가했다. 화면에는 출처·상태·검색 filter, 12건 단위 pagination, 상세·원본 JSON, WeshareArt 적합성 테스트 정적 문항을 연결했다.
- [팩트] 2026-08-10 22:04~22:28 KST 실제 브라우저에서 1440×900 및 390×844 화면을 확인했다. 출처별 187·145·6건, 적합성 테스트 10문항·선택지 20개가 렌더링됐고 문서 전체 수평 overflow 및 로컬 console error·warning은 없었다.
- [팩트] 2026-08-10 22:34 KST 기준 Python unit test 61건, JavaScript test suite, `tests/validate_data.py`, live allowlist 11개 파일 build·hash check가 모두 통과했다. `tests/smoke_live.py`는 SOU·RTMS·일부 건축HUB·VWorld·OpenDART·catalog 확인을 통과했고 VWorld 1필지와 건축HUB 북수동 1건은 외부 응답 상태로 `SKIP`됐다.
- [팩트] ArtNGuide 상단 집계는 총 188회지만 페이지 목록은 187건이며 원인을 공개 응답만으로 확인하지 못했다. WeshareArt 인증 필요 매각 상세 endpoint는 비로그인 상태에서 HTTP 401이어서 우회하지 않았다. TESSA 일부 공시는 표시 수익률과 산술값, 수수료 원 미만 처리에서 차이가 있으나 원문의 반올림·절사 규칙은 기재되지 않아 원문값과 산술값을 분리 표시했다.
