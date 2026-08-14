# 미술품 조각투자 서비스 QA 명세와 검수 기록

- 문서 상태: **CURRENT · CANONICAL**
- 방법론 버전: `art-mvp-v1.0`
- 최종 회귀 상태: **FINAL_VALIDATED_WITH_DATABASE_CONTINUITY_AND_HISTORICAL_DISCOVERY** — 비교함 전체 기능까지 구현·재검증 완료
- 상태 표기: `완료`(검증 증거 있음) · `부분` · `미구현` · `미검증` · `해당 없음`
- 원칙: 코드가 있다는 이유만으로 완료로 표시하지 않는다. 명령 결과·URL·스크린샷·테스트 이름 등 재현 가능한 증거를 기록한다.

## 1. 검수 기준과 현재 기록 범위

이 문서는 요구사항별 수용 기준, 실행 절차, 결과 기록의 정본이다. 2절의 표는 정본 문서 최초 작성 시점의 수용 기준 matrix이며, **2026-08-15 기존 DB continuity 재검증 결과는 13절이 최신 기록으로 우선한다.** Chrome screenshot, 실제 OpenAI 키 호출, 실제 외부 수집은 이번 검증 범위에서 명시적으로 제외했다.

문서 작업으로 확인한 사항:

| 항목 | 상태 | 증거 |
|---|---|---|
| 7개 정본 문서 경로 | 완료 | `docs/ART_INVESTMENT_*.md` |
| 이전 문서 상태 표시 | 완료 | `IDI_PRODUCT_RESTRUCTURE.md` 첫 두 줄 |
| 참고 구조도 저장 | 완료 | `docs/reference/ART_INVESTMENT_SERVICE_MAP.png` |
| 앱 lint/typecheck/test/build | 완료 | 2026-08-14 최종 회귀: lint/typecheck/test:art/test:js/build 모두 exit 0 |

## 2. 요구사항별 구현 여부

### 2.1 제품 범위와 공통 UI

| ID | 수용 기준 | 상태 | 검증 방법/증거 |
|---|---|---|---|
| SCOPE-01 | 사용자 화면에 부동산·항공기 엔진·가축·음악 링크/필터/문구/데이터 없음 | 미검증 | 전체 route 텍스트 검색+브라우저 nav |
| SCOPE-02 | 홈에서 미술품 청약 전 AI 분석 서비스임을 즉시 이해 | 미검증 | `/` 고정 Hero 문구 확인 |
| SCOPE-03 | 별도 홍보 랜딩 없이 `/`에 검색과 상품이 함께 있음 | 미검증 | `/` DOM/스크린샷 |
| LAYOUT-01 | 헤더 메뉴 5종+로고, 비교 개수, 모바일 Drawer | 미검증 | 1440/390, keyboard |
| LAYOUT-02 | 푸터 설명·기준일·방법론·출처·고정 면책 | 미검증 | 전 route 공통 확인 |
| LAYOUT-03 | 상세 Breadcrumb, 잘못된 ID 404 | 미검증 | 각 동적 route invalid ID |

### 2.2 검색·상품 목록

| ID | 수용 기준 | 상태 | 검증 방법/증거 |
|---|---|---|---|
| SEARCH-01 | 자연어가 실제 ParsedSearchQuery로 변환 | 미검증 | `/api/ai/search` integration |
| SEARCH-02 | 해석 조건 칩 표시·개별 제거·초기화 | 미검증 | browser interaction |
| SEARCH-03 | 모호 표현은 임의 필터가 아니라 keyword | 미검증 | parser test |
| SEARCH-04 | 검색/필터/정렬/page가 URL에 저장·복원 | 미검증 | reload/back/share URL |
| SEARCH-05 | demo mode 예시 질의가 결정적으로 작동 | 미검증 | unit/integration |
| LIST-01 | 요구 상태/판단/작가/플랫폼/투자금/차이율 필터 | 미검증 | `/products` |
| LIST-02 | 6개 정렬과 정확한 결과 수 | 미검증 | fixture assertions |
| LIST-03 | 공통 ProductCard 데이터와 링크 영역 분리 | 미검증 | DOM, nested anchor 없음 |
| LIST-04 | 검색 없음/등록 없음 문구, 가짜 카드 없음 | 미검증 | empty fixtures/query |

### 2.3 상품 상세

| ID | 수용 기준 | 상태 | 검증 방법/증거 |
|---|---|---|---|
| DETAIL-01 | 헤더에 작품/발행사/플랫폼/청약/기준일/비교 표시 | 미검증 | `/products/demo-art-001` |
| DETAIL-02 | 7개 탭, 현재 탭 URL, invalid tab summary fallback | 미검증 | 모든 `?tab=` 직접 접근 |
| DETAIL-03 | 모든 상품이 허용 4단계 verdict 중 하나 | 미검증 | data/schema+UI |
| DETAIL-04 | 보류/판정불가/신뢰도/점수/확률 미노출 | 미검증 | DOM/전체 검색 |
| DETAIL-05 | 결론·이유 3개·3~5문장·네 축·질문 | 미검증 | summary tab |
| DETAIL-06 | 취득가/감정가 분리, 취득가 null 대체 금지 | 미검증 | DEMO-004 |
| DETAIL-07 | 미설명 차액과 계산식/근거 표시 | 미검증 | DEMO-001~003 |
| DETAIL-08 | 전체 작가와 동일 시리즈 거래 구분 | 미검증 | artist/comparables tabs |
| DETAIL-09 | 매각/청산/기간 내/지연 상태 구분 | 미검증 | platform tab/table |
| DETAIL-10 | 목표/실제 보유기간 비교 | 미검증 | exit/platform tabs |
| DETAIL-11 | 긴 근거 기본 접힘, Drawer/Accordion 작동 | 미검증 | mouse+keyboard+ESC |
| DETAIL-12 | 비공개·충돌이 위험에 반영되고 양쪽 원문 보존 | 미검증 | danger/conflict fixture |

### 2.4 작가·플랫폼·비교·방법론

| ID | 수용 기준 | 상태 | 검증 방법/증거 |
|---|---|---|---|
| ARTIST-01 | 작가 목록 검색과 4개 정렬 | 미검증 | `/artists` |
| ARTIST-02 | 상세 거래/분포/재거래/경력/관련상품/출처 | 미검증 | `/artists/[id]` |
| ARTIST-03 | 경력과 시장 가격 인과 혼용 없음 | 미검증 | copy review |
| PLATFORM-01 | 목록/상세, 브랜드·운영사·발행사 별도 | 미검증 | `/platforms/**` |
| PLATFORM-02 | 상태·기간·배당·지연·미매각·손실 이력 | 미검증 | aggregate vs raw records |
| COMPARE-01 | URL 기반 최대 3개, 0/1/2/3/4 처리 | 미검증 | `/compare?ids=` cases |
| COMPARE-02 | 요구 비교 필드와 상품 상세 링크 | 미검증 | comparison table |
| COMPARE-03 | AI 비교에 최고/무조건/보장 표현 없음 | 미검증 | schema/copy test |
| METHOD-01 | 요구 분석 기준·공식·버전·한계 공개 | 미검증 | `/methodology` headings |

### 2.5 AI·보안

| ID | 수용 기준 | 상태 | 검증 방법/증거 |
|---|---|---|---|
| AI-01 | Responses API 호출은 server route에서만 | 미검증 | module/client bundle audit |
| AI-02 | 모델명 단일 env 설정, 파일별 hardcode 없음 | 미검증 | code search |
| AI-03 | 조사 tools 역할 10종 제공 | 미검증 | tool unit/route integration |
| AI-04 | 정량 계산을 LLM이 아닌 pure functions가 수행 | 미검증 | unit tests/code review |
| AI-05 | AI output schema와 verdict/label/Evidence 검증 | 미검증 | invalid fixture tests |
| AI-06 | 사실→비교→의미→판단 영향 코멘트 | 미검증 | four demo copy review |
| AI-07 | 상품 질문 답변에 직접답변·수치·의미·영향·근거 | 미검증 | five example questions |
| AI-08 | 페이지마다 전체 웹 재조사하지 않고 저장 분석 우선 | 미검증 | network/tool call assertion |
| AI-09 | 실패 시 저장 분석→demo→오류/재시도 | 미검증 | forced timeout/schema error |
| SEC-01 | API key가 client bundle/HTML/response/log에 없음 | 미검증 | build grep/network/console |
| SEC-02 | 외부 원문 새 탭에 안전한 rel | 미검증 | DOM test |

## 3. 라우트 검증

| URL | 정상 | 직접 접근/새로고침 | 교차 링크 | invalid/empty | 상태 |
|---|---|---|---|---|---|
| `/` | Hero/search/products | 해당 | products/artists/platforms | 등록 상품 없음 | 미검증 |
| `/products` | query/filter/cards | query 유지 | detail/artist/platform | 결과 없음 | 미검증 |
| `/products/[productId]` | 7 tabs | tab 유지 | artist/platform/compare | 404 | 미검증 |
| `/artists` | search/sort/cards | query 유지 | artist detail | empty | 미검증 |
| `/artists/[artistId]` | analysis/records | 해당 | related product | 404 | 미검증 |
| `/platforms` | cards/metrics | query 유지 | platform detail | empty | 미검증 |
| `/platforms/[platformId]` | relations/track | 해당 | related product | 404 | 미검증 |
| `/compare` | 2~3 products | ids 유지 | product detail | 0/1/invalid IDs | 미검증 |
| `/methodology` | all sections/version | 해당 | source anchors | 해당 없음 | 미검증 |

라우트 smoke 절차:

1. 각 URL을 주소창에서 직접 연다.
2. 새로고침 후 같은 화면/상태인지 확인한다.
3. 내부 링크를 따라 왕복하고 뒤로가기로 query/tab/scroll이 가능한 범위에서 복원되는지 확인한다.
4. 존재하지 않는 ID와 잘못된 query를 입력해 깨진 shell/500이 아닌 정상 fallback인지 확인한다.
5. 콘솔 error와 hydration warning을 기록한다.

## 4. AI 기능 검증

### 자연어 검색 test cases

| 입력 | 필수 해석 |
|---|---|
| `최근 거래가 꾸준한 작가의 청약 중 상품` | `open`, 거래량 관련 조건/정렬; 칩 표시 |
| `공모가가 유사 작품보다 비싼 상품` | premium positive/descending |
| `청산이 자주 지연된 플랫폼 상품` | delayed only, delay descending |
| `취득가와 공모가 차이가 작은 상품` | premium range/sort 방법론과 일치 |
| `최근 3년 낙찰률이 높은 작가` | sell-through 조건/정렬 |
| `회수 위험이 큰 청약 예정 상품` | upcoming + caution/danger |
| `분위기가 좋은 상품` | 임의 위험/수익 필터 금지, keyword/unresolved |

### 판단·코멘트 test cases

- DEMO-001: 요구 수치에서 `해볼 만함`, 비용 설명력+거래/청산 근거.
- DEMO-002: `조건부 해볼 만함`, 동일 시리즈 표본과 평균 4개월 지연.
- DEMO-003: `주의`, 미설명 1,800만원+표본/지연 결합.
- DEMO-004: `위험`, 취득가 비공개, 감정가 대체 없음, 거래/청산/주체 복합 위험.
- 모든 문장이 저장 수치와 일치하고 금지 책임회피/판정불가 표현이 없어야 한다.

### 상품 질문 test cases

각 demo에 대해 다음을 실행한다.

1. 왜 이 판단인가?
2. 작가 거래량은 실제로 어느 정도인가?
3. 유사 작품보다 얼마나 비싼가?
4. 플랫폼은 과거 청산을 제때 했는가?
5. 가장 큰 위험 하나와 긍정적인 부분은 무엇인가?

응답은 직접 답변·수치·의미·판단 영향·존재하는 Evidence 링크를 포함한다. 취득가 null에서는 계산값을 만들지 않는다.

### 오류 주입

- `OPENAI_API_KEY` 없음
- API timeout, 429, 500
- invalid JSON/schema/verdict label mismatch
- 존재하지 않는 Evidence ID
- 검색 tool 접근 실패/원문 충돌

각 경우 페이지 전체가 유지되고 정해진 fallback과 재시도가 표시되는지 확인한다.

## 5. 그래프 검증

| 그래프 | 데이터 연결 | 시각/접근성 체크 | 상태 |
|---|---|---|---|
| 취득가 vs 공모금액 | PriceMetrics | KRW 단위, 값 라벨, 텍스트 요약 | 미검증 |
| 공모금액 stack | DisclosedCost+gap | 합계 일치, 범례, 색 외 구분 | 미검증 |
| 유사작 가격 위치/산점도 | Comparable+Auction | 날짜/가격 축, 결과 모양, 기준선 | 미검증 |
| 5년 출품·낙찰 | Auction raw | 연도/건수, 출품≥낙찰 invariant | 미검증 |
| 중위 낙찰가 | sold records | 빈 연도 단절/없음 처리 | 미검증 |
| 유찰/낙찰률 | sold+unsold | 분모 표시, withdrawn 제외 | 미검증 |
| 거래/유찰 추이 | annual metrics | 단위/legend/summary | 미검증 |
| 목표 vs 실제기간 | TrackRecord | 개월 단위, 지연 라벨 | 미검증 |
| 매각·청산 timeline | soldAt/liquidatedAt | 두 event 분리 | 미검증 |
| 플랫폼 상태 분포 | raw TrackRecord | 매각/청산/지연/미매각 구분 | 미검증 |

공통 검증:

- data 없음에서 빈 축/가짜 0 막대가 없다.
- 390px에서 chart가 잘리거나 viewport 전체 가로 scroll을 만들지 않는다.
- 색각 이상 simulation에서도 텍스트/패턴/형태로 상태를 구분한다.
- 스크린리더가 동일 핵심 수치를 텍스트로 얻는다.

## 6. 데모 데이터 검증

| 항목 | DEMO-001 | DEMO-002 | DEMO-003 | DEMO-004 |
|---|---:|---:|---:|---:|
| 취득가 | 120,000,000 | 100,000,000 | 90,000,000 | null |
| 감정가 | 정의 데이터 | 정의 데이터 | 정의 데이터 | 140,000,000 |
| 공모금액 | 130,000,000 | 115,000,000 | 118,000,000 | 165,000,000 |
| 공개 비용 | 9,000,000 | 12,000,000 | 10,000,000 | 불완전 |
| 미설명 차액 | 1,000,000 | 3,000,000 | 18,000,000 | null |
| 최근 3년 거래 | 42 | 26 | 12 | 7 |
| 낙찰률 | 81% | 72% | 61% | 43% |
| 동일 시리즈 | 11 | 5 | 3 | 1 |
| verdict | 해볼 만함 | 조건부 해볼 만함 | 주의 | 위험 |

추가 확인:

- [ ] 모든 entity 이름에 DEMO가 있고 `isDemo=true`.
- [ ] 화면에 DemoDataBadge가 있음.
- [ ] 각 작가의 최근 5년 출품/낙찰/유찰 원행으로 집계 재현.
- [ ] 작품명·시리즈·재료·크기·제작연도·날짜·경매사·국가가 있음.
- [ ] 각 플랫폼 과거 상품에 목표/실제기간·배당·매각금액·매각/청산일·지연·상태가 있음.
- [ ] 실존 작가/기업에 가짜 수치를 사용하지 않음.
- [ ] DEMO-004 감정가로 취득가 계산하지 않음.

## 7. 모바일·접근성 검증

### viewport matrix

| 폭 | 핵심 기대 | 상태 |
|---|---|---|
| 1440px | 넓은 container, 2열 header/charts, 측면 필터 | 미검증 |
| 1024px | 2열/1열 안전 전환, nav 유지 | 미검증 |
| 768px | 필터 Drawer, 표/탭 scroll | 미검증 |
| 390px | 단일열, hamburger, 44px touch, viewport overflow 없음 | 미검증 |

### 키보드/스크린리더

- Tab 순서가 시각 순서와 일치하고 skip/명확한 focus가 있다.
- 햄버거, 필터, Evidence Drawer, 경력 Accordion을 Enter/Space로 조작한다.
- modal은 focus trap, ESC 닫기, trigger focus 복귀.
- 탭은 선택 상태와 panel 관계를 전달하거나 실제 URL 링크 semantics를 일관되게 사용한다.
- 이미지 alt, icon-only button accessible name, 외부 링크 의미가 있다.
- 차트 텍스트 summary, table caption/headers가 있다.
- 상태는 색상 외 라벨·아이콘으로 전달한다.
- 200% zoom과 prefers-reduced-motion에서 정보/동작 손실이 없다.

## 8. 단위·통합 테스트 목록

### 단위

- [ ] 공모가 차이, 차이율, 미설명 차액
- [ ] acquisition null/0 방어
- [ ] 낙찰/유찰률과 분모 0
- [ ] 평균/중위/최고가 제외 평균
- [ ] 1/3/5년 날짜 경계
- [ ] 플랫폼 지연·기간 내 청산률
- [ ] query parse/serialize와 invalid enum
- [ ] 자료 부족 위험
- [ ] Structured Output verdict/label/Evidence 검증

### 통합

- [ ] 자연어→조건→칩→URL→제거
- [ ] ProductCard 각 내부 action
- [ ] 상세 tab URL과 direct access
- [ ] 작가/플랫폼/관련 상품 양방향 이동
- [ ] Evidence Drawer 접근성
- [ ] 비교함/URL 3개 제한
- [ ] AI 실패 fallback
- [ ] demo badge/404

## 9. 최종 테스트 결과 기록

최종 회귀 시각: **2026-08-14 18:41 KST**. 첫 실행에서 `lib/art/ai.ts`의 라이브 조사 JSON Schema 괄호 오류를 발견해 함수 전체를 명확한 구조로 수정했다. HTTP 점검에서는 취득가가 비공개인 DEMO-004에서 공개 비용 상세가 숨는 회귀를 발견해 `PriceBridgeChart`가 비용 항목을 계속 표시하도록 수정했다. 이후 아래 전체 검증을 처음부터 다시 실행했다.

| 명령/검사 | 결과 | 상세 |
|---|---|---|
| `npm run lint` | 완료 | exit 0, 오류 0; 기존 static/live 파일의 unused warning 7건은 비차단 |
| `npm run typecheck` | 완료 | exit 0 |
| `npm run test:art` | 완료 | 13/13 통과: 계산 3, 검색 3, schema/tool 2, 최종 회귀 5 |
| `npm run test:js` | 완료 | calculations, API fallback, track records, restructure contract 통과 |
| `npm run build` | 완료 | Next.js production build, 28개 static page 생성 완료 |
| 주요 route HTTP | 완료 | 16개 정상 route HTTP 200, generic invalid URL HTTP 404 |
| 동적 invalid ID | 완료 | 상품 ID 없음 화면 렌더링 확인; Next streamed not-found 응답은 HTTP 200 |
| 자연어 검색 API | 완료 | `POST /api/ai/search` HTTP 200, `open`+최근 거래 20건 조건 확인 |
| 상품 Q&A API | 완료 | `POST /api/ai/ask-product` HTTP 200, 직접 답변·수치·의미·영향·Evidence 확인 |
| 상품 비교 API | 완료 | `POST /api/ai/compare` HTTP 200, 2개 finding 확인 |
| 저장 분석 fallback | 완료 | `POST /api/ai/analyze-product` demo HTTP 200, 저장 verdict 확인 |
| 검증 서버 종료 | 완료 | localhost:3100 프로세스 종료 |

## 10. 남은 문제·이번 회귀 제외 범위

요청된 회귀 검증 항목에는 남은 실패가 없다. 다음 항목은 이번 검증에서 의도적으로 제외했다.

| ID | 상태 | 제외 항목 | 이유 |
|---|---|---|---|
| EX-01 | 제외 | Chrome headless 390/1440 screenshot | 사용자 명시 제외 |
| EX-02 | 제외 | 실제 `OPENAI_API_KEY`를 사용한 live 호출 | 사용자 명시 제외; server-only 함수/schema/tool 연결은 정적 회귀 통과 |
| EX-03 | 제외 | 실제 외부 공시·경매 자동 수집 | 사용자 명시 제외 |
| EX-04 | 제외 | commit/push/deploy | 금지 작업 |

## 11. 최종 수용 체크

- [ ] 미술품 단일 범위와 고정 Hero
- [ ] 9개 route/상호 링크/404/URL 상태
- [ ] 자연어 실제 조건 변환과 칩
- [ ] 모든 상품 4단계 판단, 금지 출력 없음
- [ ] 7개 탭과 5개 분석 범주의 실제 graph
- [ ] 가격/비용/미설명, 작가/시리즈, 목표/실제, 매각/청산 구분
- [ ] Evidence/충돌/변경 이력 연결
- [ ] 작가·플랫폼·비교·방법론
- [ ] 4개 가상 demo의 수치·판단·차트 데이터
- [ ] AI server-only/schema/fallback/demo+live
- [ ] 390/768/1024/1440, keyboard/a11y
- [ ] lint/typecheck/unit/integration/build 통과
- [ ] 정본 문서와 실제 구현 일치

## 12. 2026-08-14 최종 회귀 상세

### 마지막 변경 항목

- **모바일 필터**: `/products` SSR markup의 `mobile-filter`, 768px media rule, 전용 회귀 테스트 통과.
- **변경 이력**: Evidence 탭의 `ChangeLogTable`, 이전값 129,000,000원과 새 값 130,000,000원 HTTP markup 확인.
- **비용 상세**: DEMO-001의 5개 비용 및 취득가 비공개 DEMO-004의 2개 부분 공개 비용까지 HTTP markup 확인.
- **라이브 웹 조사 함수**: Responses API `web_search_preview`, Structured Output, server-only analyze route 연결을 정적 회귀로 확인. 실제 키 호출은 제외.
- **데모 데이터 보정**: 최근 3년 42/26/12/7건, beta 120일 지연, gamma 210일 지연, DEMO-004 취득가 `null`·부분 비용 2개를 fixture assertion으로 확인.

### HTTP route 결과

`/`, `/products`, 상품 상세 7개 탭, DEMO-004 가격 탭, `/artists`, 작가 상세, `/platforms`, 플랫폼 상세, `/compare`, `/methodology`는 HTTP 200이었다. `/not-a-real-route`는 HTTP 404였다. 존재하지 않는 상품 ID는 명시적 데이터 없음 UI를 표시했다.

### 당시 판정 — 철회됨

당시에는 demo-only Repository만 검증했으므로 `FINAL_VALIDATED`로 볼 수 없다. 이 기록은 13절의 데이터 continuity 재검증으로 철회·대체한다.


## 13. 2026-08-15 기존 DB continuity 수정과 최종 재검증

### 이전 상태 철회

2026-08-14의 `FINAL_VALIDATED`는 새 Repository가 `data/demo/art-investment.json`만 읽는 동안 실행된 UI·demo 회귀였다. 기존 DB가 파일로 보존돼 있다는 것과 새 서비스에서 조회·표시된다는 것은 다르므로 그 판정을 철회했다. 아래 연결·수치·HTTP 검증을 완료한 결과로만 새 상태를 부여한다.

### 연결 결과

| 원본 | normalized 연결 | 검증 결과 |
|---|---:|---|
| `data/products.json` | 미술품 5개 | 전체 상품 9개 중 real 5, demo 4; 부동산 3개 제외 |
| `data/artnguide_track_records.json` | 187건 | `sold` 138 (`TRANSFER`), `returned` 12 (`RETURNED_PRODUCT`, 원문 `status_label=매각완료` 충돌을 별도 보존), `exit_in_progress` 37 |
| `data/artnguide_due_diligence.json` | 같은 187건 enrichment | record evidence 187와 artist track evidence 187을 각 track payload에 연결; 실적에 중복 합산하지 않음 |
| `data/weshareart_research.json` | 145건 | canonical `아트투게더` 플랫폼; 현재 실상품 5건과 같은 플랫폼 탐색 경로에 연결하되 과거 레코드의 법적 발행사 identity는 미검증; `operating` 93, 자체 게시 `liquidated` 52; 통화 미기재 금액의 KRW 표기 0건 |
| `data/tessa_sale_records.json` | 6건 | `liquidated` 3, `loss_confirmed` 3; HKD 임의 환산 없음 |
| 플랫폼 legacy history 합계 | 338건 | 187 + 145 + 6; due-diligence를 별도 history로 더하지 않음 |

추가 경계:

- legacy track의 확인되지 않은 canonical 발행사·상품 FK는 `null`이며 source-local reference와 raw payload를 보존한다.
- 5개 기존 상품의 현재 lifecycle은 `상태 미확인`; `operating`으로 추정하지 않는다.
- 실상품 Evidence는 원본 product payload와 source URL을 제공하고, source의 `publisher`/`collected_at`이 null이면 `publisher 미기재`/null로 유지한다.
- 실상품 중위 낙찰가가 없으면 평균·총액을 대체하지 않고 빈 상태를 표시한다.
- 현재 상품 5개와 과거 `아트투게더` 145건은 사용자 탐색용 canonical `platform-arttogether` 하나로 연결한다. 단, 이 연결을 과거 레코드별 법적 발행사 identity 확인으로 해석하지 않으며 해당 FK는 `null`을 유지한다.
- 모든 real 상품은 `기존 DB · 공개자료 저장본`, demo 상품은 `DEMO · 데모 데이터` badge를 사용한다.

### 최종 명령 결과

| 명령/검사 | 결과 | 상세 |
|---|---|---|
| `npm run lint` | 완료 | exit 0, error 0; 기존 static/live/test 파일의 비차단 unused warning 7건 |
| `npm run typecheck` | 완료 | exit 0 |
| `npm run test:art` | 완료 | 17/17; 새 continuity 테스트 4개 포함 |
| `npm run test:js` | 완료 | calculations, API fallback, track records, restructure contract 통과 |
| `npm run build` | 완료 | Next.js production build, 42개 page 생성 과정 통과 |
| HTTP route matrix | 완료 | 홈·목록·실상품 5개 탭 표본·실작가·legacy 플랫폼 4개·pagination/search·혼합 비교·방법론 HTTP 200, invalid route HTTP 404 |
| Repository/API 수량 | 완료 | `/api/products` 9개(real 5), platform API 187/145/6 |
| raw continuity | 완료 | platform API summary `sourceSnapshot`, track `sourcePayload`, ArtNGuide `dueDiligencePayload` 확인 |
| AI fallback | 완료 | 실상품 search/ask/compare/analyze HTTP 200; 김환기 낙찰률은 원문 연도 집계 64.4% 사용 |

### 제외 범위

기존 제외 원칙을 유지했다: Chrome headless screenshot, 실제 OpenAI key 호출, 실제 외부 재수집, commit/push/deploy는 수행하지 않았다. 키가 없는 demo fallback과 server-only 연결만 검증했다.

### 최종 판정

기존 DB 파일 보존 여부뿐 아니라 새 Repository, 상품·작가·플랫폼 UI, pagination/search, API payload, 실데이터 badge, 결측·통화·상태 경계를 검증했다. `FINAL_VALIDATED_WITH_DATABASE_CONTINUITY` 기록은 Opus 독립 검수 결과로 철회되었고, 이후 수정·Fable 재검수·후속 차단 수정의 최종 판정은 14절이 대체한다.


## 14. 2026-08-15 과거 338건 탐색·독립 재검수 최종 판정

### 최종 데이터 계약

- 통합 카탈로그: **347건** = 과거 338 + 현재 실상품 5 + DEMO 4.
- 원본별 과거 이력: ArtNGuide 187, 아트투게더 145, TESSA 6.
- ArtNGuide: `sold` 138, `returned` 12, `exit_in_progress` 37. `RETURNED_PRODUCT` 12건은 `sold`나 `unsold`로 단정하지 않고 `returned`로 표시하며, 원문 `status_label=매각완료` 충돌과 `soldMoney`·`soldTime`·`profit`을 함께 보존한다.
- 아트투게더: `operating` 93, `liquidated` 52. 금액 통화가 없으므로 KRW로 추정하지 않는다.
- TESSA: `liquidated` 3, `loss_confirmed` 3. 초기 금액 KRW와 매각 통화 HKD를 분리하고 환산하지 않는다. `source_reported_return_pct`는 **플랫폼 기재 수익률**, `calculated_settlement_return_pct`는 **DAKER 계산 수익률**로 별도 표시한다.
- 플랫폼: 실데이터는 canonical `아트투게더` 1개(현재 5/과거 145), ArtNGuide(0/187), TESSA(0/6). DEMO 플랫폼 4개는 별도 badge와 상세 경로를 유지한다.
- 작가: 전체 정규화 entity 103명(과거·현재 실데이터·DEMO 포함). 과거 검색 결과는 이우환 41, 박서보 17, 김환기 12, 야요이 쿠사마 39.

### 재현 검증

| 명령/검사 | 최종 결과 |
|---|---|
| `npm run lint` | exit 0, 오류 0; 기존 비차단 warning 7건 |
| `npm run typecheck` | exit 0 |
| `npm run test:art` | production build와 실제 standalone HTTP API/page 검증 포함 **26/26** 통과 |
| `npm run test:js` | calculations/API fallback/track records/restructure 4개 통과 |
| `npm run build` | Next.js production build, 135개 static page generation 과정 통과 |
| 통합 pagination | 347개 ID를 중복 없이 모두 도달; 플랫폼별 187/145/6 전체 도달 |
| 실데이터 우선 | 현재 실상품 5건이 DEMO 4건보다 먼저 정렬되고 null은 마지막 |
| 동적 상세 | ArtNGuide·아트투게더·TESSA 표본 상세 200; 콜론 포함 TESSA ID decode 검증 |
| 플랫폼 상세 | 실데이터 3개와 DEMO 4개 상세/API 200; canonical 아트투게더 중복 없음 |
| 원본 필드 | ArtNGuide/아트투게더/TESSA 필수 구조화 필드와 전체 `sourcePayload` 노출 |

### 독립 검수와 후속 수정

Fable read-only 독립 diff 검수는 338건 노출, 수량, artist 정규화, pagination, raw field, 통화, 실데이터 우선 정렬을 통과로 확인하고 두 차단점을 발견했다. 후속 수정으로 (1) `RETURNED_PRODUCT`를 반환과 원문 상태 충돌로 표현하며 매각 기재값을 보존했고, (2) TESSA 플랫폼 기재 수익률과 DAKER 계산 수익률을 분리했다. 추가로 DEMO 플랫폼 4개 링크의 not-found 회귀와 홈 작가 수 caption을 수정했다. Luna가 실제 HTTP 회귀로 이를 재검증했다.

### 제외·프로세스 기록

Chrome 1440/390 screenshot, 실제 OpenAI key 호출, 외부 재수집, commit/push/deploy는 제외했다. 최종 수동 검증에서는 responsive CSS와 HTTP markup만 확인했다. **변경형 Git 명령은 실행하지 않았으나**, Orca 작업자 두 명이 명시적 금지에도 read-only `git diff`/`git diff --check`를 실행한 프로세스 이탈이 있었다. 파일 상태를 변경하는 Git 동작은 없었고 이후 모든 통합·검증은 프로젝트 명령과 직접 파일 검사로 수행했다.

### 최종 판정

**FINAL_VALIDATED_WITH_DATABASE_CONTINUITY_AND_HISTORICAL_DISCOVERY**


## 15. 2026-08-15 홈·DEMO·상품 필터 후속 수정

사용자 화면 검토에 따라 홈의 `REPOSITORY SNAPSHOT` 카드 영역을 제거했다. 판단 체계가 `해볼 만함 / 조건부 해볼 만함 / 주의 / 위험`의 4단계이므로 3개가 아니라 **등급별 1개씩 4개 DEMO**를 모두 `청약 예정` 작품으로 표시한다.

상품 목록의 링크 나열식 필터는 체크박스 form으로 교체했다. 현재 상품 상태, 과거 진행 상태, 원본 플랫폼, 식별 근거를 정렬된 그룹으로 제공하고 여러 항목을 동시에 선택할 수 있다. 768px 이하에서는 같은 form을 접이식 모바일 필터로 제공한다.

이 과정에서 빈 수익률 입력이 숫자 `0`으로 변환되어 `/products?scope=historical` 화면이 338건이 아니라 93건만 보여주던 결함도 발견해 수정했다. 반복 query parameter와 쉼표 구분 parameter를 페이지와 `/api/products`가 모두 처리하도록 통일했다.

최종 결과: lint 오류 0(기존 warning 7), typecheck 통과, `test:art` production build·HTTP 통합 테스트 포함 **27/27**, `test:js` 전체 통과, build 135개 static page generation 과정 통과.


## 16. 2026-08-15 비교함 전체 기능 후속 구현

기존 비교 기능은 카드 버튼, localStorage ID 저장, 단순 비교표만 존재해 직접 `/compare`로 진입하면 선택 UI가 없고 최대 개수 초과 시 가장 오래된 항목을 조용히 삭제하는 불완전한 상태였다.

후속 구현으로 다음을 완료했다.

- 상품 카드에서 비교함 추가/제외 상태를 즉시 표시한다.
- localStorage에 최대 3개를 유지하고, 초과 선택은 기존 상품을 삭제하지 않고 안내한다.
- 전역 비교 tray에 `선택 수/3`, 최소 2개 안내, 비교 이동, 전체 비우기를 제공한다.
- 헤더의 상품 비교 링크가 저장된 선택 ID와 개수를 유지한다.
- `/compare`에서 현재 상품 9개를 체크박스로 직접 선택하며, DEMO 청약 예정 작품을 먼저 보여준다.
- 2~3개를 선택해야 비교표가 열리고, URL `ids` query로 공유·새로고침할 수 있다.
- 비교표에서 각 상품 상세로 이동하거나 개별 상품을 제외할 수 있다.
- 공모금액, 취득가, 감정가, 공모가 차이율, 미설명 차액, 유사작 중위값, 출품 수, 낙찰률, 동일 시리즈, 회수 분석, 플랫폼 이력, 목표 보유기간을 동일 기준으로 비교한다.
- 저장된 DEMO 분석 판단을 비교한 결과임을 문구로 명시한다.

최종 검증은 lint 오류 0(기존 warning 7), typecheck, production build, 실제 HTTP 비교 페이지 검증을 포함한 `test:art` **28/28**, `test:js` 전체 통과다.
