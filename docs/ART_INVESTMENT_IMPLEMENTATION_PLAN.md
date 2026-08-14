# 미술품 조각투자 서비스 구현 계획

- 문서 상태: **CURRENT · CANONICAL**
- 계획 기준: 4주·4인 금융 공모전 MVP
- 기술 기준: Next.js 16.3 App Router, React 19.2, TypeScript strict, Node.js 22
- 주의: 아래 “현재 구현”은 계획 수립 시 저장소 조사 기준이며, 완료 여부는 [`ART_INVESTMENT_QA.md`](./ART_INVESTMENT_QA.md)에서 검증한다.

## 1. 현재 구현 조사

### 저장소·도구

- `package.json`: Next 16.3.0, React 19.2, TypeScript 5.9, ESLint; chart/OpenAI/schema/test UI 라이브러리는 현재 의존성에 없다.
- App Router와 `app/layout.tsx`, `app/not-found.tsx`, 전역 `app/globals.css`를 사용한다.
- alias `@/*`, `strict: true`, JSON module import가 설정돼 있다.
- 검증 script는 `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:js`와 Python 데이터 테스트가 있다.

### 조사 당시 사용자 UI

- 라우트: `/`, `/search`, `/products/[id]`, `/track-records`, `/suitability`, `/real-estate`, `/livestock/cattle`, `/livestock/pig`, `/art`.
- `/`는 로컬 evidence catalog 소개와 키워드 검색 진입이며 새 고정 Hero/자연어 조건 변환/우선 청약 카드를 제공하지 않는다.
- 상품 상세는 단일 긴 화면이며 `판정 보류`; 7개 탭, 네 단계 최종 판단, 차트, 질문답변이 없다.
- 헤더에 부동산·한우·돼지 등 이전 자산 링크와 `UI prototype`이 있다.
- `components/search-form.tsx`는 GET keyword form, `components/product-card.tsx`는 근거 중심 기존 카드다.
- `lib/catalog.ts`가 `data/*.json`을 직접 import해 화면 projection/검색을 만들며 Repository 경계가 없다.
- 데이터에는 실존 부동산·미술품과 플랫폼 저장본이 섞여 있고 요구된 4개 가상 판단 데모 구조가 없다.

### 보존할 기반

- Next.js 16 App Router, React 19, TypeScript strict, package manager와 script 명칭
- `app/layout.tsx`의 metadata/root shell 패턴과 `app/not-found.tsx`의 404 경계(내용은 새 제품에 맞게 수정)
- `app/globals.css`의 기존 reset/접근성/색상 토큰 중 새 금융 UI와 호환되는 부분
- `components/icons.tsx`의 접근 가능한 단순 SVG 패턴
- 서버에서 JSON을 읽을 수 있는 TypeScript 기반과 기존 포맷 함수 중 의미가 맞는 함수
- 기존 검증된 원자료는 삭제하지 않고 새 사용자 UI와 demo Repository에서 분리
- 기존 테스트 명령과 결정적 데이터 검증 자산

## 2. 목표 구조와의 차이

| 영역 | 조사 당시 구현 | 목표 |
|---|---|---|
| 제품 범위 | 부동산·가축·미술품 혼합 | 미술품 조각투자 청약 전 분석만 |
| IA | 검색/이력/적합성/자산별 prototype | 9개 canonical URL과 상호 연결 |
| 홈 | 소개 후 별도 검색 | 서비스 설명+자연어 검색+실제 우선 상품 |
| 검색 | 단순 keyword | AI 구조 조건, 칩, URL 필터/정렬/페이지 |
| 판단 | 판정 보류 | 모든 상품 네 단계 판단 |
| 상세 | 단일 페이지·원문 목록 | 7개 탭, 네 축, 차트, Evidence Drawer |
| 작가/플랫폼 | 독립 canonical 목록·상세 없음 | 목록/상세, 관련 상품 연결 |
| 비교 | 없음 | URL 기반 최대 3개와 AI 설명 |
| AI | 서버 OpenAI 경계 없음 | Responses API, tools, schema, fallback |
| 데이터 | component가 catalog projection에 결합 | domain entity + Repository + demo/real 분리 |
| 차트 | 없음 | 접근 가능한 HTML/CSS/SVG 차트 |
| 상태 | 일부 저장본/보류 중심 | 로딩·결측·충돌·AI 실패·demo 포함 |
| 접근성 | 기본 링크/폼 | Drawer focus, 탭, chart summary, 44px touch |

## 3. 유지·제거·비노출 전략

### 유지

- 프레임워크, `@/` alias, App Router 서버 컴포넌트 기본, strict TypeScript
- 현재 디자인 토큰 중 중립 배경/텍스트 대비/공통 shell
- 404 pattern, source link의 새 탭 방식, 검증된 계산/format pattern
- 기존 데이터 파일은 운영 데이터 삭제 금지 원칙에 따라 보관한다.

### 제거하거나 숨길 사용자 노출

- 헤더/홈/빠른 진입/필터/카드/문구에서 부동산, 항공기 엔진, 가축, 기타 자산군
- `/real-estate`, `/livestock/*`, `/art`, `/search`, `/track-records`, `/suitability`의 글로벌 진입
- `판정 보류`, `검토 상태 -`, 신뢰도/확률/점수 UI
- 다중 자산 metadata와 서비스 설명

이전 파일을 무조건 삭제할 필요는 없다. MVP에서는 글로벌 nav에서 제거하고 canonical URL로 교체한다. 직접 접근 정책은 제품 오인을 막기 위해 `notFound()` 또는 관련 canonical 경로 redirect 중 하나를 일관되게 적용한다. 운영 원자료는 삭제하지 않는다.

## 4. 의도된 Next.js 아키텍처

```text
app/
  layout.tsx
  page.tsx
  not-found.tsx
  products/page.tsx
  products/[productId]/page.tsx
  artists/page.tsx
  artists/[artistId]/page.tsx
  platforms/page.tsx
  platforms/[platformId]/page.tsx
  compare/page.tsx
  methodology/page.tsx
  api/ai/search/route.ts
  api/ai/analyze-product/route.ts
  api/ai/ask-product/route.ts
  api/ai/compare/route.ts
components/
  layout/               # header, footer, breadcrumb, container
  search/               # natural search, chips, filters
  cards/                # product, artist, platform, reason
  analysis/             # verdict, metrics, QA panel
  charts/               # accessible CSS/SVG charts
  tables/               # comparable, track record, changelog
  evidence/             # drawer, accordion, source
  states/               # loading, empty, error, not found, demo
lib/
  domain/
    types.ts
    calculations/       # pure functions
    methodology/        # art-mvp-v1.0 constants/rules
    validation/         # runtime schema
  repositories/
    product-repository.ts
    artist-repository.ts
    platform-repository.ts
    analysis-repository.ts
    evidence-repository.ts
    demo/               # fixture adapters
  ai/
    client.server.ts    # server-only env/model
    schemas.ts
    tools.server.ts
    demo-parser.ts
    fallbacks.ts
  query/                # URL parse/serialize
  format/               # KRW/date/ratio presentation
data/
  demo/                 # 가상 엔티티만
  real/                 # 권리/허락 확인된 실데이터 adapter 대상
```

실제 저장소 명명에 맞게 디렉터리를 합칠 수 있지만 계층 책임은 유지한다. 페이지는 기본 Server Component로 Repository를 호출한다. Client Component는 검색 입력/칩, 모바일 Drawer, 비교 tray, 질문, disclosure처럼 상호작용이 필요한 작은 경계에만 사용한다.

현재 chart 의존성이 없으므로 P0는 접근 가능한 HTML/CSS/SVG로 막대·점·timeline을 구현한다. 외부 library 추가가 필요하면 bundle, SSR, 접근성, license를 검토하고 package 변경을 한 곳에서 수행한다.

## 5. 파일별 변경 계획

| 파일/영역 | 계획 |
|---|---|
| `app/layout.tsx` | 미술품 단일 metadata, 새 Header/Footer shell |
| `app/page.tsx` | Hero, 자연어 검색, 빠른 진입, 우선 상품, 네 축, 완료 상품 |
| `app/products/page.tsx` | 신규: URL 검색/필터/정렬/empty |
| `app/products/[productId]/page.tsx` | 기존 `[id]` 의미를 canonical productId 상세/7탭으로 전환 |
| `app/artists/**` | 신규 목록·상세 |
| `app/platforms/**` | 신규 목록·상세 |
| `app/compare/page.tsx` | 신규 URL ids 비교 |
| `app/methodology/page.tsx` | 신규 공개 기준 |
| `app/api/ai/**/route.ts` | 신규 server-only AI endpoints |
| `components/site-header.tsx` | 이전 자산 nav 제거, 모바일 Drawer와 비교 수 |
| `components/product-card.tsx` | 새 공통 카드 데이터/내부 링크/비교 행동 |
| `components/search-form.tsx` | NaturalLanguageSearch로 대체 또는 역할 축소 |
| `components/*` | screen spec 공통 컴포넌트를 책임별 추가 |
| `lib/catalog.ts` | 직접 fixture projection을 Repository facade로 점진 대체; 기존 원자료 adapter는 보존 |
| `lib/domain/**` | 계산, 방법론, schema, query 추가 |
| `data/demo/**` | 4개 가상 상품/경매/트랙레코드/Evidence/Analysis |
| `tests/**` | 계산·schema·API·URL·navigation·fallback 회귀 추가 |
| `app/globals.css` | 금융 분석 token, layout, charts, responsive, focus/state styles |
| 기존 자산 route | global 비노출; 일관된 404/redirect 정책 적용 |

## 6. 구현 순서와 의존성

### P0 기반

1. 정본 문서·기존 superseded 상태와 구조도 저장
2. TypeScript domain type/enum/schema 정의
3. 4개 가상 상품과 경매·트랙레코드·Evidence 작성
4. 순수 계산 함수와 단위 테스트
5. Repository interface와 demo adapter
6. query parse/serialize와 방법론 상수

### P0 사용자 흐름

7. GlobalHeader/Footer/Breadcrumb/상태 컴포넌트
8. `/` Hero·빠른 진입·상품 카드
9. demo 자연어 parser와 `/api/ai/search`
10. `/products` URL 검색·칩·필터·정렬
11. 상세 header/summary와 7개 tab URL
12. 가격/유사작/작가/회수/플랫폼 chart·table
13. Evidence Accordion/Drawer
14. 404, 결측, 충돌, 이미지 없음, mobile

### P1

15. 작가 목록/상세
16. 플랫폼 목록/상세
17. 비교 tray와 `/compare`
18. 상품별 AI 질문답변
19. `/methodology`
20. live OpenAI tools/schema/fallback, 서버 보안 검증
21. 접근성·반응형·성능 마무리

P0/P1이 완료되기 전에 외부 자동수집 고도화나 복잡한 유사작 모델(P2)을 시작하지 않는다.

## 7. 4주 일정

### 1주차 — 모델·데모·공통 골격

- Day 1: 현재 gap/IA 확정, 이전 노출 제거 전략
- Day 2: entity/schema/Repository 계약
- Day 3: 4개 demo와 계산 함수
- Day 4: layout/header/footer/state/card
- Day 5: 홈과 기본 접근성, 계산·data validation 테스트

완료 gate: demo 4건이 repository로 조회되고 계산 불변식이 통과하며 홈에서 상품 상세로 이동.

### 2주차 — 탐색과 상품 상세 P0

- 자연어 demo parser, URL filter/chips
- 상품 목록과 ProductCard
- 상세 summary/price/comparables
- 접근 가능한 가격/유사작 chart와 table
- URL/계산/상세 이동 통합 테스트

완료 gate: 홈 → 검색 → 칩 → 상세 → 가격/유사작이 실제 동작.

### 3주차 — 분석 축·근거·P1 페이지

- artist/exit/platform/evidence 탭
- 작가 목록/상세, 플랫폼 목록/상세
- CompareTray와 최대 3개 비교
- methodology
- 모바일 Drawer/표/탭

완료 gate: 전체 canonical route와 교차 링크, 7개 탭, Evidence가 동작.

### 4주차 — AI live·QA·공모전 마감

- OpenAI Responses API/tools/Structured Outputs 서버 연동
- 질문답변·비교 설명과 fallback
- schema/grounding/security 테스트
- 390/768/1024/1440 수동 검수, keyboard/ARIA
- lint/typecheck/unit/integration/build, 요구사항 대조와 수정

완료 gate: 환경변수 없는 demo와 유효 key live 양쪽, 모든 필수 검증 통과.

## 8. 4인 역할 분담

| 역할 | 주 책임 | 교차 검토 |
|---|---|---|
| A · Product/Frontend | IA, layout, 홈, 목록, 반응형, 접근성 | B의 chart semantics |
| B · Analysis UI | 상품 7탭, chart/table, Evidence Drawer, 비교 | C의 계산 projection |
| C · Data/Domain | entity, demo, Repository, 계산, 방법론, data validation | D의 AI schema grounding |
| D · AI/Quality | Route Handler, OpenAI tools/schema/fallback, 질문/비교, 통합·보안 QA | A/B 접근성 E2E |

공통 파일(`layout`, globals, shared type)은 담당자를 지정하고 짧은 변경 단위로 병합 충돌을 줄인다. 한 명이 자기 기능의 테스트까지 함께 작성하고 다른 한 명이 요구사항 관점에서 검토한다.

## 9. 테스트 계획

### 단위

- 가격 차이/차이율/미설명 차액과 취득가 null
- 낙찰/유찰률 분모, 평균/중위/최고가 제외 평균
- 1/3/5년 경계와 최근 거래 공백
- 목표/실제 지연과 기간 내 청산률
- query enum/숫자/중복 ID parse/serialize
- 자료 부족 위험과 verdict schema/evidence ID

### 통합

- demo 자연어 → 구조 조건 → 칩 → 제거 → URL
- ProductCard 상품/작가/플랫폼/비교 행동
- 상세 `tab` URL, 직접 접근, 잘못된 tab fallback
- 근거 Drawer 키보드/ESC/focus return
- 비교 URL 0/1/2/3/4개 처리
- AI route demo/live 실패 fallback과 key 비노출
- 404와 demo badge

### E2E 핵심

```text
홈 → 자연어 검색 → 조건 칩 → 상품 선택 → AI 판단 → 공모가
→ 유사 작품 → 작가 기록 → 회수 → 플랫폼 → 근거 → 상품 비교
```

### 품질 명령

```bash
npm run lint
npm run typecheck
npm run test:js
npm run build
```

새 UI test runner를 추가한다면 저장소 도구와 충돌하지 않게 최소 구성하고 package script에 명확히 연결한다. 브라우저 수동/자동 확인은 1440×900, 1024, 768, 390×844 및 콘솔·깨진 링크를 포함한다.

## 10. 구현 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| 4주 범위 과대 | route는 많으나 품질 미달 | demo/Repository/공통 component 우선, P0 gate 후 P1 |
| 현재 실제 데이터와 새 schema 간극 | fixture 직접결합/오류 | adapter와 Repository, raw 원자료 보존 |
| OpenAI SDK/API 변화 | build/runtime 실패 | 설치 버전과 공식 docs 확인, server wrapper 단일화 |
| AI hallucination | 잘못된 판단 | 순수 계산, Structured Output, Evidence ID/숫자 grounding |
| API key 노출 | 보안 사고 | server-only module, bundle/HTML/response 검사 |
| 외부 자료 권리/접근 | live 조사 차단 | 공식 출처 우선, 링크+최소 사실, demo mode, 허락 검토 |
| 차트 library 없음 | 일정/접근성 | P0 CSS/SVG와 텍스트 요약, 장식 복잡도 제한 |
| URL/client state 불일치 | 공유/뒤로가기 실패 | URL 정본, parser/serializer 통합 테스트 |
| 주체·상태 혼용 | 트랙레코드 왜곡 | 별도 entity/enum, sold/liquidated/within-target 테스트 |
| demo 실데이터 오인 | 신뢰 훼손 | 모든 계층 `isDemo`, 명확한 DEMO 이름과 badge |
| 이전 자산 URL 노출 | 제품 범위 위반 | nav/metadata 제거, 직접 접근 404/redirect smoke test |
| 병렬 작업 충돌 | 공통 파일 손실 | 담당자, 작게 변경, 변경 전 최신 tree 확인 |

## 11. Definition of Done

- 제품 명세 완료 조건과 QA 체크리스트가 모두 증거와 함께 `완료`다.
- 미술품 외 자산이 사용자 화면과 canonical navigation에 없다.
- demo 4개 계산과 판단, route 9개, 7개 상세 탭, 상호 링크가 일치한다.
- demo/live AI가 실제 server endpoint를 사용하고 schema/fallback/security가 검증됐다.
- 390~1440px, keyboard, focus, chart summary가 검증됐다.
- lint/typecheck/test/build가 깨끗한 실행에서 통과한다.
- 문서의 “구현됨” 주장과 실제 코드가 일치하고 미구현은 QA에 남아 있다.
