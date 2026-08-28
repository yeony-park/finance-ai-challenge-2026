# 기술 스택 · 저장 계층 (Stack & Storage)

> **상태: v1-draft (팀 리뷰 요청)** · 2026-08-23 · 근거: `05-data-policy.md`(신호등·크롤링 금지가 더미 데이터 필요의 원전), `06-ai-guardrails.md`(RAG·캐시 경계), postgres-patterns 스킬 규약.
> DB 스키마의 단일 진실은 도입 후 `src/lib/db/schema.ts`가 된다 — 문서와 다르면 코드를 따르고 문서를 정정한다.

## 1. 확정 스택 (현행 — 변경은 오너 합의 필수)

| 층 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router + React 19 | 화면은 서버 컴포넌트 + 파일 캐시 직독 |
| 언어 | TypeScript strict | `any` 금지, 공개 API 명시 타입 |
| 경계 검증 | Zod 4 | 모든 외부 입력·응답 경계 의무 |
| 스타일 | Tailwind 4 + `src/styles/tokens.css`(`--ds-*`) | 디자인 시스템은 `docs/design/design-system.md` |
| 모션 | motion | |
| 테스트 | Vitest (node 환경) | 익명화 게이트·계약 테스트 포함 |
| LLM | AI SDK(`ai` + `@ai-sdk/openai`) — 스파인 경계 수렴 | 키 없으면 fake 완주 (`06` §7) |
| CLI 실행 | tsx (`--env-file-if-exists=.env`) | 수집·생성 파이프라인 진입점 |
| 배포 | Vercel (CLI 수동, git 연동 없음) | `CLAUDE.md` 배포 절 |

새 의존성 추가 기준: ① 기존 스택으로 불가한가 ② 키·서비스 없이도 빌드·테스트가 완주하는가 ③ `.vercelignore`·데이터 정책에 영향 없는가 — 셋을 PR 본문에 명기.

## 2. 저장 계층 3층 구조

| 층 | 저장소 | 용도 | 화면 접근 |
|---|---|---|---|
| ① 파일 캐시 | `data/public/`·`data/reference/`·`data/offers/` (커밋) | 검증 리포트·시장 통계·공모 좌표 — **모든 화면 수치·문구의 유일한 원천** | 서버 컴포넌트 직독 (유지) |
| ② Vercel Blob | 정정 감시 이벤트 스토어 | cron 간 상태 보존 | 불가 |
| ③ Postgres (신설) | Neon (Vercel Marketplace) + pgvector | §3 더미·참조 데이터 원장 + §4 RAG 코퍼스 | **불가 — 렌더 경로에서 DB 조회 금지** |

**구속 원칙: Postgres 도입은 "화면은 캐시만 읽는다"를 바꾸지 않는다.** DB에 접근하는 경로는 두 개뿐이다:

1. **수집·생성 파이프라인(CLI)** — DB에 적재하고, 화면용 산출물을 `data/public/`으로 **내보낸다**(export). 화면은 그 파일을 읽는다.
2. **`POST /api/search` RAG 검색(M2+)** — 스파인 경유 유일한 런타임 DB 읽기. `08-api-contract.md` §4.

이 구조 덕에 DB 장애·미설정은 검색 열화(`degraded: true`)만 만들고 검증 리포트·목록 화면은 무사하다 — URL 무중단 요건의 방어선이다.

### 2.1 접근 계층·페일 모드

- 드라이버: `@neondatabase/serverless` + **drizzle-orm** (스키마 = `src/lib/db/schema.ts`, 마이그레이션 = drizzle-kit → `db/migrations/` 커밋). `[팀 결정 대기]`
- `DATABASE_URL` 미설정이면 **file 모드** — 어댑터 fake 트윈 관례(`01` §1) 그대로, DB 리포지토리의 트윈이 `data/` JSON을 읽어 같은 인터페이스로 응답한다. 팀원 로컬·CI에서 DB 불필요 원칙.
- 금액은 원화 정수 `bigint`(won), 시각은 `timestamptz`, 문자열은 `text`, id는 `bigint identity` + 공개 슬러그 별도 열. 외래키에는 인덱스 필수.
- 마이그레이션은 append-only — 배포된 마이그레이션 파일 수정 금지, 정정은 새 마이그레이션으로.

## 3. 더미·참조 데이터 원장 (부동산·미술품)

### 3.1 왜 더미인가 (정직 규약 — 위반 금지)

부동산·미술품은 상품 페이지 크롤링이 금지(신호등 Red)이고 플랫폼 재표시는 서면 확인 전 금지(Yellow)다. 따라서 공개 화면용 데이터는 ① Green 공공 원장(RTMS·건축물대장 등) ② 서면 확인 완료분 ③ **합성(더미) 데이터**의 3종으로만 구성한다. 합성 데이터 규칙:

- 모든 레코드에 `provenance` 필수: `"public_record" | "manual_verified" | "synthetic"`. 3값 외 금지.
- `synthetic` 레코드가 화면에 오르는 표면에는 **"예시 데이터" 고지를 같은 표면에** 부착한다 — 실측처럼 보이는 배치는 `04-expression-rules.md` 위반이다. 판정(`match` 등)은 synthetic 근거 위에서 산출하지 않는다 — synthetic 근거만 있는 항목은 "대조 불가"다.
- 실존 발행사·실존 상품을 흉내 낸 합성 금지 — 가공 명칭(`예시 오피스 A` 류)만. 실명 규칙은 `05` §1.
- 시드는 결정적(고정 시드)이며 스크립트 재실행으로 동일 결과가 재현돼야 한다. 손으로 DB를 고치지 않는다.

### 3.2 스키마 초안 (DDL — drizzle 이관 전 참조용)

기존 타입을 원장화한다: 미술품은 `src/lib/art/types.ts`, 부동산은 `data/offers/real-estate-a.json` 구조가 원전이다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE offerings (                          -- 카테고리 공통 공모 원장
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_slug text NOT NULL UNIQUE,                -- 중립 공개 id: art-N, re-N …
  category_id text NOT NULL,                      -- cattle | pig | art | real-estate
  provenance text NOT NULL CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  title_public text NOT NULL,                     -- 마스킹 완료 표기명
  amount_won bigint,
  opens_on date, closes_on date,
  detail jsonb NOT NULL DEFAULT '{}',             -- 카테고리 특화 필드 (Zod 스키마로 경계 검증)
  source_meta jsonb NOT NULL,                     -- sourceUrl·license·method·retrievedAt·sha256 (05 §2 의무)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON offerings (category_id, provenance);

CREATE TABLE art_auction_records (                -- 미술품 낙찰 기록 (실데이터 338건 + synthetic)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provenance text NOT NULL CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  artwork_title text NOT NULL,
  auction_date date NOT NULL,
  auction_house text NOT NULL,
  medium text, width_cm numeric(8,2), height_cm numeric(8,2),
  currency text NOT NULL, normalized_price_krw bigint,
  result text NOT NULL CHECK (result IN ('sold','unsold','withdrawn','unknown')),
  source_meta jsonb NOT NULL
);
CREATE INDEX ON art_auction_records (auction_date);

CREATE TABLE re_trades (                          -- 부동산 실거래 (RTMS 수집분 원장화, Green)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provenance text NOT NULL DEFAULT 'public_record',
  lawd_cd text NOT NULL, deal_ym text NOT NULL,   -- 법정동 5자리 · YYYY-MM
  building_use text, dong text,
  amount_won bigint NOT NULL, deal_on date NOT NULL,
  source_meta jsonb NOT NULL
);
CREATE INDEX ON re_trades (lawd_cd, deal_ym);
```

- 판정·리포트는 DB에 넣지 않는다 — 리포트의 진실은 여전히 파이프라인 산출 JSON(①층)이다. DB는 "대조에 쓸 참조 원장"까지만.
- 개인정보 포함 원천은 DB에도 넣지 않는다 — `data/raw/` 로컬 전용 원칙은 DB에 그대로 적용된다. Neon은 커밋 대상이 아니지만 팀 공유 저장소이므로 **마스킹 전 데이터 적재 금지**.

### 3.3 시드·내보내기 규약

```bash
npm run db:migrate     # drizzle-kit — db/migrations/ 적용
npm run db:seed        # 결정적 시드 (idempotent — ON CONFLICT 처리, 재실행 안전)
npm run db:export      # DB → data/public/·data/reference/ 화면용 산출물 생성 (마스킹 게이트 경유)
```

- `db:export`만이 화면 데이터를 만든다. export는 기존 마스킹 2단(`report/mask.ts` → `residual.ts`)과 익명화 게이트 테스트를 동일하게 통과해야 한다.
- 시드 원천 파일 위치: 커밋 가능한 것은 `data/offers/`·`data/reference/`, 로컬 전용은 `data/raw/` — 기존 정책 그대로.

## 4. RAG 저장소 (pgvector)

용도: `POST /api/search`(08 §4)의 ①입문 교육 ④범위 밖 판별 근거 검색. **검증 사실(③유형)은 RAG가 아니라 리포트 캐시가 원천**이다 — RAG로 판정·수치를 검색해 답하지 않는다.

```sql
CREATE TABLE rag_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL,                        -- 스파인 코퍼스 레지스트리 id와 1:1 (미등록 id 금지)
  title text NOT NULL, url text,
  license text NOT NULL CHECK (license IN ('green','yellow_confirmed')),  -- red·yellow 미확인 적재 금지
  retrieved_on date NOT NULL,
  provenance text NOT NULL DEFAULT 'public_record'
);

CREATE TABLE rag_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES rag_documents(id),
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding vector(1536),                         -- text-embedding-3-small [팀 결정 대기]
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX ON rag_chunks (document_id);
CREATE INDEX ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON rag_chunks USING gin (tsv);
```

- **출처 강제와 접합**: 검색 결과의 `source_id`가 스파인 코퍼스 등록분이 아니면 인용 불가 — RAG 적재가 곧 출처 등록이 아니다. 등록은 여전히 오너 일괄(`01` §2). RAG 테이블은 등록된 출처의 **본문 확장**일 뿐이다.
- 하이브리드 검색 기본값: tsvector 키워드 + 벡터 유사도 병합. **fake 모드(키·DB 없음)**: 임베딩 생략, `data/`의 사전 작성 교육 콘텐츠에 대한 키워드 매칭으로 열화 동작 — 06 §4 정적 스캐폴드의 저장 계층 대응물.
- 임베딩 생성은 적재 시 1회(CLI) — 요청 경로에서 문서 임베딩을 만들지 않는다. 질의 임베딩 1회만 런타임 허용.
- 대화 입력·질의 로그를 RAG 테이블에 섞지 않는다 — 보존은 `05` §4(30일) 별도 경로.

## 5. 환경 변수 (`.env.example` 반영)

| 변수 | 없을 때 동작 |
|---|---|
| `DATABASE_URL` | file 모드 — DB 리포지토리 fake 트윈으로 완주 |
| `AI_GATEWAY_API_KEY` / `OPENAI_API_KEY` | LLM·임베딩 fake (기존) |
| `DART_API_KEY`·`DATA_GO_KR_API_KEY` | 라이브 경로 `not_configured` 정직 응답 (기존) |

"없으면 죽는다"는 허용되지 않는다 — 모든 변수에 부재 시 동작이 정의돼야 한다.

## 6. 검증

- 계약 테스트: ① provenance 3값 외 거부 ② synthetic 근거로 판정 산출 시도 거부 ③ `rag_documents.source_id` 미등록 id 거부 ④ file 모드 완주(`DATABASE_URL` 없이 `npm test`·`npm run build` 그린).
- `db:export` 산출물은 기존 익명화 게이트 테스트 대상에 자동 포함된다 — DB 유래라고 게이트를 우회하지 않는다.
- 스키마 변경은 worklog 4섹션 기록 대상이다 (특히 마스킹·공개 경로에 닿는 변경).

## 팀 결정 대기 (기본값 병기)

| 항목 | 기본값 | 근거 |
|---|---|---|
| DB 호스팅 | Neon (Vercel Marketplace) | 서버리스 드라이버·무료 티어·pgvector 지원. 대안: Supabase |
| 접근 계층 | drizzle-orm + drizzle-kit | 타입 안전 + 마이그레이션 파일 커밋. 대안: `@neondatabase/serverless` 직 SQL |
| 임베딩 모델·차원 | text-embedding-3-small (1536) | 스파인 LLM 경계와 동일 제공자. 변경 시 재적재 필요 |
| RAG 도입 범위 | 검색(①④유형)만 — 리포트 서술 생성에는 미사용 | 검증 사실 오염 방지 (06 §3) |
| synthetic 고지 문구 | "예시 데이터로 구성한 화면입니다" 계열 — 문안은 `src/lib/content/` 등재 후 출력 필터 감사 | 04 표현 규칙 |
| 더미 데이터 규모 | 부동산 공모 3건·미술품 공모 3건 + 참조 원장은 실데이터 우선 | 심사 시연 최소 단위 |
