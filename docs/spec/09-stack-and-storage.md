# 기술 스택 · 저장 계층 (Stack & Storage)

> **상태: v1-draft (팀 리뷰 요청)** · 2026-08-23 초안 · **2026-08-29 3관점 리뷰(DB·정합성·보안) 반영 + DB 호스팅 Supabase 오너 확정** · 근거: `05-data-policy.md`(신호등·크롤링 금지가 더미 데이터 필요의 원전), `06-ai-guardrails.md`(RAG·캐시 경계), postgres-patterns 스킬 규약.
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
| DB | Supabase Postgres + pgvector (2026-08-29 오너 확정) | §2 저장 3층 — 렌더 경로 접근 금지 |
| 배포 | Vercel (CLI 수동, git 연동 없음) | `CLAUDE.md` 배포 절 |

새 의존성 추가 기준: ① 기존 스택으로 불가한가 ② 키·서비스 없이도 빌드·테스트가 완주하는가 ③ `.vercelignore`·데이터 정책에 영향 없는가 — 셋을 PR 본문에 명기.

## 2. 저장 계층 3층 구조

| 층 | 저장소 | 용도 | 화면 접근 |
|---|---|---|---|
| ① 파일 캐시 | `data/public/`·`data/reference/`·`data/offers/` (커밋) | 검증 리포트·시장 통계·공모 좌표 — **모든 화면 수치·근거의 유일한 원천** (사용자 대면 문안의 단일 진실은 `src/lib/content/` — R-INV-01) | 서버 컴포넌트 직독 (유지) |
| ② Vercel Blob | 정정 감시 이벤트 스토어 | cron 간 상태 보존 | 불가 |
| ③ Postgres (신설) | **Supabase (관리형 Postgres) + pgvector — 2026-08-29 오너 확정** | §3 더미·참조 데이터 원장 + §4 RAG 코퍼스 | **불가 — 렌더 경로에서 DB 조회 금지** |

호스팅 비교 근거 (2026-08-29 실측): Neon(0.5GB·100 CU-h·연결 시 자동 기상) / Supabase(500MB·pgvector 전 플랜·**7일 무활동 시 일시정지 — 대시보드 수동 복구, 90일 초과 시 인프라 회수**·테이블/SQL 대시보드) / Oracle Always Free(관리형 Postgres 없음·VM 셀프호스팅은 idle 회수 정책과 충돌 — 탈락). Supabase 채택 사유: 팀원이 적재 데이터를 눈으로 확인할 대시보드 + 챗 개통 후 대화 로그 저장으로 상시 활동 예상. **일시정지 방어**: 챗 개통 전 구간은 cron(`/api/cron/monitor`, 주 2회)에 경량 DB ping 1쿼리를 포함해 7일 무활동을 구조적으로 차단한다 — ping 실패는 cron 결과에 정직 표기하되 cron 본 임무를 중단시키지 않는다.

**구속 원칙: Postgres 도입은 "화면은 캐시만 읽는다"를 바꾸지 않는다.** DB에 접근하는 경로는 두 개뿐이다:

1. **수집·생성 파이프라인(CLI)** — DB에 적재하고, 화면용 산출물을 `data/public/`으로 **내보낸다**(export). 화면은 그 파일을 읽는다.
2. **`POST /api/search` RAG 검색(M2+)** — 스파인 경유 유일한 런타임 DB 읽기. `08-api-contract.md` §4.

이 구조 덕에 DB 장애·미설정은 검색 열화(`degraded: true`)만 만들고 검증 리포트·목록 화면은 무사하다 — URL 무중단 요건의 방어선이다.

### 2.1 접근 계층·페일 모드

- 드라이버: **postgres-js(`postgres`) + drizzle-orm** (스키마 = `src/lib/db/schema.ts`, 마이그레이션 = drizzle-kit → `db/migrations/` 커밋). drizzle 대신 직 SQL 여부는 `[팀 결정 대기]` — 단 §2.2 파라미터화 의무는 선택과 무관하게 적용.
- **연결 문자열 2종 분리 (의무)**:
  - `DATABASE_URL` — Supavisor **transaction 풀러**(포트 6543) 경유, 런타임(`/api/search`) 전용. 서버리스 동시 인보케이션의 직결 커넥션 고갈 방지.
  - `DATABASE_URL_DIRECT` — 세션 모드 연결(포트 5432), CLI 전용(마이그레이션·시드·export). drizzle-kit은 반드시 이쪽을 쓴다(트랜잭션 풀링 모드에서 DDL·세션 기능 제약). **2026-08-29 오너 실측 정정**: 이 프로젝트의 진짜 직결 호스트(`db.*.supabase.co`)는 IPv6 전용이라 로컬에서 도달 불가 → **세션 풀러(5432)로 대체**한다. 세션 모드라 DDL·마이그레이션·`CREATE ROLE`이 호환된다("직결"이라는 표기는 세션 풀러를 포함하는 뜻으로 읽는다).
- **자격증명 역할 분리 (의무)**: 런타임 `DATABASE_URL`에는 `rag_documents`·`rag_chunks` **SELECT 전용 Postgres 역할**을 부여한다. 원장 쓰기·마이그레이션 권한은 CLI 전용 자격증명에만. 공개 검색 경로의 취약점이 원장 쓰기로 확대되는 것을 차단하는 유일한 방어선이다(Supabase 무료 플랜에는 IP allow가 없음). Supabase의 `service_role`·`anon` 키는 PostgREST용 — 이 프로젝트는 PostgREST를 쓰지 않으므로 두 키를 코드에 들여오지 않는다. **역할 생성은 마이그레이션과 분리한 운영 스크립트 `db/roles.sql`**로 준비돼 있다(마이그레이션이 아님 — `db:migrate`가 실행하지 않는다). **적용 순서·시점(오너 결정)**: `db:migrate`로 스키마 적용 후 → `db/roles.sql`(비밀번호 실행 시 주입, 커밋 금지) → `DATABASE_URL`을 이 역할로 재발급. 그 전까지는 런타임·CLI 둘 다 `postgres` 사용자지만 `/api/search`가 없어 노출 표면이 없다.
- **확장 가용 실측 (2026-08-29 오너)**: `vector` 0.8.2 · `pg_trgm` 1.6 · `unaccent` 1.1 모두 사용 가능. `CREATE EXTENSION`은 마이그레이션에서 수행한다(`vector`는 `0000_init.sql` 선두에 이미 포함; `pg_trgm`은 §4 한국어 보강 [팀 결정 대기] 확정 후 별도 마이그레이션으로 추가).
- `DATABASE_URL` 미설정이면 **file 모드** — 어댑터 fake 트윈 관례(`01` §1) 그대로, DB 리포지토리의 트윈이 `data/` JSON을 읽어 같은 인터페이스로 응답한다. 팀원 로컬·CI에서 DB 불필요 원칙.
- 금액은 원화 정수 `bigint`(won), 시각은 `timestamptz`, 문자열은 `text`, id는 `bigint identity` + 공개 슬러그 별도 열. 외래키에는 인덱스 필수.
- 마이그레이션은 append-only — 배포된 마이그레이션 파일 수정 금지, 정정은 새 마이그레이션으로.
- **drizzle 지원 범위 spike 선행**: `vector` 컬럼·generated column(`tsv`)·HNSW 인덱스는 drizzle 버전에 따라 1급 지원이 아닐 수 있다 — 구현 착수 전 최소 spike로 확인하고, 미지원분은 raw sql 마이그레이션으로 처리(문서에 어느 쪽인지 기록).

### 2.2 쿼리 안전 (접근 계층 선택과 무관한 의무)

- 사용자 입력이 개입하는 **모든** 쿼리는 파라미터 바인딩 강제 — drizzle 선택 시 쿼리 빌더 API만(원시 `sql` 템플릿에 문자열 보간 금지), 직 SQL 선택 시 postgres-js 태그드 템플릿만. `+`·템플릿 리터럴로 사용자 값을 SQL 문자열에 직접 삽입하는 패턴은 계약 위반.
- RAG 키워드 검색은 `to_tsquery` 금지 — **`websearch_to_tsquery`**(또는 `plainto_tsquery`)만 사용. 사용자 자유 텍스트를 tsquery 연산자 문법으로 직접 해석시키면 파싱 오류로 500·서비스 거부 벡터가 된다.

### 2.3 리포지토리 인터페이스 (DB 모드·file 모드 공통 계약)

구현 전 기준 시그니처 — 팀원별 리포지토리 구현이 갈라지지 않게 하는 최소 골격. 상세는 `schema.ts`와 함께 확정:

```ts
interface OfferingsRepository {
  findBySlug(slug: string): Promise<Offering | null>
  listByCategory(categoryId: CategoryId): Promise<Offering[]>
}
interface RagSearchRepository {
  search(query: string, opts?: { categoryId?: CategoryId }): Promise<RagHit[]>
  // RagHit = { sourceId, content, score, asOf } — file 모드는 사전 작성 콘텐츠 키워드 매칭으로
  // 같은 형태를 반환하고 응답의 degraded: true 와 연동된다 (06 §4)
}
```

file 모드 트윈은 "DB 스키마와 동형인 JSON 미러"가 아니라 위 인터페이스의 동형 구현이다 — 특히 RAG는 열화 경로가 질적으로 다르므로(키워드 매칭) 인터페이스 뒤에서만 분기한다. `/api/search` 핸들러에 모드 분기 금지.

## 3. 더미·참조 데이터 원장 (부동산·미술품)

### 3.1 왜 더미인가 (정직 규약 — 위반 금지)

부동산·미술품은 상품 페이지 크롤링이 금지(신호등 Red)이고 플랫폼 재표시는 서면 확인 전 금지(Yellow)다. 따라서 공개 화면용 데이터는 ① Green 공공 원장(RTMS·건축물대장 등) ② 서면 확인 완료분 ③ **합성(더미) 데이터**의 3종으로만 구성한다. 합성 데이터 규칙:

- 모든 레코드에 `provenance` 필수: `"public_record" | "manual_verified" | "synthetic"`. 3값 외 금지.
- `synthetic` 레코드가 화면에 오르는 표면에는 **"예시 데이터" 고지를 같은 표면에** 부착한다 — 실측처럼 보이는 배치는 `04-expression-rules.md` 위반이다. 판정(`match` 등)은 synthetic 근거 위에서 산출하지 않는다 — synthetic 근거만 있는 항목은 "대조 불가"다.
- 실존 발행사·실존 상품을 흉내 낸 합성 금지 — 가공 명칭(`예시 오피스 A` 류)만. 실명 규칙은 `05` §1. **기계 검증 의무**: ① synthetic 레코드의 표기명은 `예시 ` 프리픽스를 Zod `.refine()`으로 강제(프리픽스 없는 synthetic 삽입 거부) ② 시드 CLI는 synthetic 명칭 필드(`title_public`·`artwork_title`·`auction_house` 등)를 실존 개체 블록리스트(DART 발행인 레지스트리 스냅샷 + `07-asset-map` 등재 실존 플랫폼·경매사)와 대조해 겹치면 시드를 실패시킨다 — 눈대중 판단에 맡기지 않는다.
- 시드는 결정적(고정 시드)이며 스크립트 재실행으로 동일 결과가 재현돼야 한다. 손으로 DB를 고치지 않는다.
- **적재 원천 경로 가드 (의무)**: `db:seed`는 원천 파일 경로가 `data/raw/`·`data/snapshots/`·`data/reports/`(로컬 전용)이면 즉시 실패한다 — 커밋 가능 원천(`data/offers/`·`data/reference/`)과 명시적 synthetic 생성기만 허용. CLI 진입점에 하드코딩한다. "마스킹 전 데이터 DB 적재 금지"(§3.2 말미)의 유일한 기계 강제 지점이다 — export 사후 게이트는 Supabase 인스턴스 자체의 유출은 못 막는다.

### 3.2 스키마 초안 (DDL — drizzle 이관 전 참조용)

기존 타입을 원장화한다: 미술품은 `src/lib/art/types.ts`, 부동산은 `data/offers/real-estate-a.json` 구조가 원전이다.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE offerings (                          -- 카테고리 공통 공모 원장
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  offer_slug text NOT NULL UNIQUE,                -- 중립 공개 id: art-N, re-N … (멱등 시드의 ON CONFLICT 타깃)
  category_id text NOT NULL CHECK (category_id IN ('cattle','pig','art','real-estate')),
  provenance text NOT NULL CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  title_public text NOT NULL,                     -- 마스킹 완료 표기명 (synthetic은 '예시 ' 프리픽스 의무 — §3.1)
  amount_won bigint,
  opens_on date, closes_on date,
  CHECK (closes_on IS NULL OR opens_on IS NULL OR closes_on >= opens_on),
  detail jsonb NOT NULL DEFAULT '{}',             -- 카테고리 특화 필드 (Zod strict 화이트리스트로 경계 검증 — 자연인 식별 필드명 금지)
  source_meta jsonb NOT NULL,                     -- sourceUrl·license·method·retrievedAt·sha256 (05 §2 의무)
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON offerings (category_id, provenance);

CREATE TABLE art_auction_records (                -- 미술품 낙찰 기록 (실데이터 + synthetic)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_ref text NOT NULL UNIQUE,              -- 자연키: source_meta의 sha256(또는 sourceUrl) 승격 — 멱등 시드 타깃 (jsonb 내부는 ON CONFLICT 불가)
  provenance text NOT NULL CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  artwork_title text NOT NULL,
  auction_date date NOT NULL,
  auction_house text NOT NULL,
  medium text, width_cm numeric(8,2), height_cm numeric(8,2),
  currency text NOT NULL, normalized_price_krw bigint,
  result text NOT NULL CHECK (result IN ('sold','unsold','withdrawn','unknown')),
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON art_auction_records (auction_date);

CREATE TABLE re_trades (                          -- 부동산 실거래 (RTMS 수집분 원장화, Green)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provenance text NOT NULL DEFAULT 'public_record'
    CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  lawd_cd text NOT NULL CHECK (lawd_cd ~ '^\d{5}$'),
  deal_ym text NOT NULL CHECK (deal_ym ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  building_use text, dong text,
  amount_won bigint NOT NULL, deal_on date NOT NULL,
  source_meta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lawd_cd, deal_ym, dong, deal_on, amount_won)  -- RTMS 자연키 근사 — 멱등 시드 타깃. 공식 거래 고유 id 확보 시 교체
);
CREATE INDEX ON re_trades (lawd_cd, deal_ym);
```

- 판정·리포트는 DB에 넣지 않는다 — 리포트의 진실은 여전히 파이프라인 산출 JSON(①층)이다. DB는 "대조에 쓸 참조 원장"까지만.
- 개인정보 포함 원천은 DB에도 넣지 않는다 — `data/raw/` 로컬 전용 원칙은 DB에 그대로 적용된다. Supabase는 커밋 대상이 아니지만 팀 공유 저장소이므로 **마스킹 전 데이터 적재 금지** — 기계 강제는 §3.1 원천 경로 가드.
- **필드 매핑 원칙**: `data/offers/*.json`의 공모 자체 정보(`offer.*`, 매각·정산 포함)는 `offerings.detail`로, 시장 참조 거래(RTMS 수집분)는 `re_trades` 로우로 — "공모 귀속 정보"와 "시장 참조 원장"의 경계를 섞지 않는다. 필드별 상세 매핑표는 `schema.ts` 구현 PR에서 확정·병기.

### 3.3 시드·내보내기 규약

```bash
npm run db:migrate     # drizzle-kit — db/migrations/ 적용
npm run db:seed        # 결정적 시드 (idempotent — ON CONFLICT 처리, 재실행 안전)
npm run db:export      # DB → data/public/·data/reference/ 화면용 산출물 생성 (마스킹 게이트 경유)
```

- `db:export`만이 화면 데이터를 만든다. export는 기존 마스킹 2단(`report/mask.ts` → `residual.ts`)과 익명화 게이트 테스트를 동일하게 통과해야 한다.
- 시드 원천 파일 위치: 커밋 가능한 것은 `data/offers/`·`data/reference/`, 로컬 전용은 `data/raw/` — 기존 정책 그대로.

### 3.4 offerings 공개 인덱스 v2 (`data/public/offerings/index.json`)

`db:export` 산출물. 목록·카드 렌더 공통 계약. 단일 진실은 `src/lib/db/export/public-offering.ts`의 Zod(`publicOfferingsManifestSchema`) — 문서와 다르면 코드를 따른다. **판정은 3값 계열만**: 집계 점수·4단계 verdict(`worth_considering|conditional|caution|danger` 류)·`similarityScore` 필드 반입 금지(현석 미술품 카탈로그의 4단계 verdict는 배제 대상). synthetic 고지는 `isExample`로 유지.

```jsonc
{
  "schemaVersion": 2,
  "generatedBy": "db:export",
  "offerings": [{
    "offerSlug": "art-1",              // 중립 공개 id
    "categoryId": "art",               // cattle|pig|art|real-estate
    "assetLabel": "미술품",             // categoryById(id).label 파생
    "titlePublic": "예시 회화 A",       // maskFreeText 경유
    "provenance": "synthetic",         // 3값
    "isExample": true,                 // synthetic 고지 (provenance==='synthetic')
    "amountWon": 120000000,            // 정수|null
    "minimumInvestment": 100000,       // 정수|null (detail.minimumInvestment ?? detail.unitPriceWon)
    "subscription": { "opensOn": "2026-05-04", "closesOn": "2026-05-12", "precision": "day" },  // phase는 클라이언트가 파생
    "detail": { "artistName": "…", "platformName": "…", "hasImage": false, "note": "…" }  // 카테고리별 화이트리스트, 전부 마스킹
  }]
}
```

- `detail` 화이트리스트: art=`{artistName, platformName, hasImage, note?}`, real-estate=`{buildingUse, note?}`, 그 외=`{note?}`. 카테고리 확장 시 `cardDetail`에 화이트리스트 추가.
- 청약 `phase`(`upcoming|open|closed`)는 인덱스에 굽지 않는다 — `subscription.opensOn/closesOn`에서 클라이언트가 파생(내보내기 시각 고정 방지).
- **재생성 절차(오너)**: 합성 생성기(`seed/synthetic.ts`)의 detail 확장은 `db:seed` 재실행으로 DB에 반영된 뒤 `db:export`로 산출물에 반영된다 — schema.ts(DB 컬럼)는 불변(카테고리 필드는 `detail` jsonb)이라 신규 마이그레이션 불필요.

## 4. RAG 저장소 (pgvector)

용도: `POST /api/search`(08 §4)의 ①입문 교육 ④범위 밖 판별 근거 검색. **검증 사실(③유형)은 RAG가 아니라 리포트 캐시가 원천**이다 — RAG로 판정·수치를 검색해 답하지 않는다.

```sql
CREATE TABLE rag_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL UNIQUE,                 -- 스파인 코퍼스 레지스트리 id와 1:1 (미등록 id 금지 — UNIQUE로 중복 등록도 차단)
  title text NOT NULL, url text,
  license text NOT NULL CHECK (license IN ('green','yellow_confirmed')),  -- red·yellow 미확인 적재 금지
  retrieved_on date NOT NULL,
  provenance text NOT NULL DEFAULT 'public_record'
    CHECK (provenance IN ('public_record','manual_verified','synthetic')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rag_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id bigint NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,  -- 문서 재시드 시 청크 동반 정리
  chunk_index int NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL,
  embedding vector(1536),                         -- nullable = 의도된 설계: fake/열화 적재 시 생략. NULL 로우는 HNSW가 건너뛰고 키워드 매칭에만 잡힌다
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX ON rag_chunks (document_id);
CREATE INDEX ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON rag_chunks USING gin (tsv);
```

**한국어 키워드 검색 한계 (인지된 리스크)**: `to_tsvector('simple', …)`은 형태소 분석이 없어 조사 결합형("공모는"/"공모가")이 서로 다른 토큰이 된다 — 한국어 본문에 대한 tsvector 단독 키워드 검색은 정확도가 매우 낮고, **fake 모드(키·DB 없는 환경)의 검색 품질 전체가 이 경로에 의존**하므로 방치 불가. 보강 기본값: ① `pg_trgm` + GIN 인덱스를 키워드 폴백에 병행(형태소 없이 부분 문자열 유사도로 동작 — Supabase 확장 지원 목록에서 확인) ② 적재 CLI에서 조사 스트리핑 등 사전 토큰화 후 `simple`에 투입. 채택 조합은 `[팀 결정 대기]` — 구현 spike로 정확도 비교 후 결정.

- **출처 강제와 접합**: 검색 결과의 `source_id`가 스파인 코퍼스 등록분이 아니면 인용 불가 — RAG 적재가 곧 출처 등록이 아니다. 등록은 여전히 오너 일괄(`01` §2). RAG 테이블은 등록된 출처의 **본문 확장**일 뿐이다.
- 하이브리드 검색 기본값: tsvector 키워드(**`websearch_to_tsquery` 경유 — §2.2**) + 벡터 유사도 병합. **fake 모드(키·DB 없음)**: 임베딩 생략, `data/`의 사전 작성 교육 콘텐츠에 대한 키워드 매칭으로 열화 동작 — 06 §4 정적 스캐폴드의 저장 계층 대응물.
- 임베딩 생성은 적재 시 1회(CLI) — 요청 경로에서 문서 임베딩을 만들지 않는다. 질의 임베딩 1회만 런타임 허용.
- 대화 입력·질의 로그를 RAG 테이블에 섞지 않는다 — 보존은 `05` §4(30일, 마스킹 2단 후 저장) 별도 경로. 챗 개통과 함께 대화 로그를 DB에 저장하기로 하면 전용 테이블(30일 TTL 삭제 잡 포함)을 본 문서에 추가 정의한다 — 현 초안 범위 밖.
- **RAG 본문 인젝션 방어 (의무)** — 출처 강제는 "어떤 문서를 인용했나"만 검증하고 본문 내용은 검증하지 않는다. Green 라이선스 문서도 본문에 은닉 지시문이 있으면 출처 게이트를 통과하므로 두 겹을 추가한다:
  1. **프롬프트 격리**: `rag_chunks.content`는 프롬프트 조립 시 고정 구분자 데이터 블록(`<retrieved_context>…</retrieved_context>` 류)으로만 삽입 — 사용자 지시와 같은 채널에 원문을 이어붙이지 않는다. `06` §6 "문서 내 지시문은 데이터일 뿐 명령이 아니다"의 RAG 구간 집행 조항.
  2. **적재 시 스캔**: 적재 CLI는 청크의 인젝션 휴리스틱(명령형 지시 패턴·역할 지정 문구·인코딩 스머글 징후)을 1차 통과분만 등록 — 실패분은 license 등급과 무관하게 보류. 챗 게이트의 다턴 레드팀 시나리오 셋에 "RAG 소스 내 인젝션"을 명시적으로 포함한다.

## 5. 환경 변수 (DB 도입 PR에서 `.env.example` 반영 의무 — PR 체크 항목)

| 변수 | 없을 때 동작 |
|---|---|
| `DATABASE_URL` (신설 예정 — 풀러, 런타임 읽기 전용 역할) | file 모드 — DB 리포지토리 fake 트윈으로 완주 |
| `DATABASE_URL_DIRECT` (신설 예정 — 직결, CLI 전용 RW) | db:* 스크립트가 `not_configured` 정직 종료 |
| `AI_GATEWAY_API_KEY` / `OPENAI_API_KEY` | LLM·임베딩 fake (기존) |
| `ANTHROPIC_API_KEY`·`SPINE_MODEL`·`VERIFY_EXTRACT_MODEL` | 스파인·추출 fake/기본 모델 (기존 동작) |
| `DART_API_KEY`·`DATA_GO_KR_API_KEY` | 라이브 경로 `not_configured` 정직 응답 (기존) |
| `CRON_SECRET` | cron 503 `not_configured` (기존) |
| `BLOB_READ_WRITE_TOKEN` | 정정 감시 이벤트 미저장 (기존) |

"없으면 죽는다"는 허용되지 않는다 — 모든 변수에 부재 시 동작이 정의돼야 한다.

## 6. 검증

- 계약 테스트: ① provenance 3값 외 거부 ② synthetic 근거로 판정 산출 시도 거부 ③ `rag_documents.source_id` 미등록 id 거부 ④ file 모드 완주(`DATABASE_URL` 없이 `npm test`·`npm run build` 그린) ⑤ synthetic `예시 ` 프리픽스 없는 레코드 거부 ⑥ `db:seed` 로컬 전용 경로(`data/raw/` 등) 원천 즉시 실패.
- `db:export` 산출물은 기존 익명화 게이트 테스트 대상에 자동 포함된다 — DB 유래라고 게이트를 우회하지 않는다. **배포 체크 연동**: CI 없는 수동 배포 구조이므로, `CLAUDE.md` 배포 절에 "직전 `db:export` 실행분이 익명화 게이트를 그린으로 통과했는가"를 체크 항목으로 명기한다(DB 도입 PR에서 반영).
- 스키마 변경은 worklog 4섹션 기록 대상이다 (특히 마스킹·공개 경로에 닿는 변경).

## 확정 (2026-08-29 오너)

| 항목 | 확정값 | 근거 |
|---|---|---|
| DB 호스팅 | **Supabase** | §2 비교 근거 참조 — 대시보드 가시성 + 챗 개통 후 상시 활동 예상. 일시정지는 cron ping으로 방어 |

## 팀 결정 대기 (기본값 병기)

| 항목 | 기본값 | 근거 |
|---|---|---|
| 접근 계층 | drizzle-orm + drizzle-kit | 타입 안전 + 마이그레이션 파일 커밋. 대안: postgres-js 직 SQL — 어느 쪽이든 §2.2 파라미터화 의무 |
| 임베딩 모델·차원 | text-embedding-3-small (1536) | claim 추출 프로덕션 경로(OpenAI 직결)와 동일 제공자 — 스파인 기본 모델은 Anthropic이므로 "스파인과 동일"이 아님(2026-08-29 정정). 변경 시 재적재 필요 |
| 한국어 키워드 검색 보강 | `pg_trgm` 병행 (대안: 적재 시 사전 토큰화) | §4 한계 절 — fake 모드 검색 품질 직결, spike로 비교 후 확정 |
| RAG 도입 범위 | 검색(①④유형)만 — 리포트 서술 생성에는 미사용 | 검증 사실 오염 방지 (06 §3) |
| synthetic 고지 문구 | "예시 데이터로 구성한 화면입니다" 계열 — 문안은 `src/lib/content/` 등재 후 출력 필터 감사 | 04 표현 규칙 |
| 더미 데이터 규모 | 부동산 공모 3건·미술품 공모 3건 + 참조 원장은 실데이터 우선 | 심사 시연 최소 단위 |
