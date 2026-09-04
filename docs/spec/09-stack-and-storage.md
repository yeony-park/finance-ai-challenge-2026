# 기술 스택 · 저장 계층 (Stack & Storage)

> **상태: 통합 RAG 아키텍처 MVP 및 AWS RDS 이전 계약 반영** · 2026-08-23 초안 · 2026-08-30 file/DB repository·product scope·API 통합 · 2026-08-31 AWS RDS(ap-northeast-2) 이전. 로컬 SQLite semantic 색인은 적용·검증됐고 AWS RDS pgvector 재적재는 후속 단계다. 근거: `05-data-policy.md`, `06-ai-guardrails.md`, `contracts/storage.md`.
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
| DB | AWS RDS PostgreSQL 18 + pgvector, ap-northeast-2 (2026-08-31 오너 결정 — Supabase에서 이전) | §2 저장 3층 — 렌더 경로 접근 금지 |
| 배포 | Vercel (CLI 수동, git 연동 없음) | `CLAUDE.md` 배포 절 |

새 의존성 추가 기준: ① 기존 스택으로 불가한가 ② 키·서비스 없이도 빌드·테스트가 완주하는가 ③ `.vercelignore`·데이터 정책에 영향 없는가 — 셋을 PR 본문에 명기.

## 2. 저장 계층 3층 구조

| 층 | 저장소 | 용도 | 화면 접근 |
|---|---|---|---|
| ① 파일 캐시 | `data/public/`·`data/reference/`·`data/offers/`·승인 scenario/common knowledge index | 검증 리포트·시장 통계·공모 좌표·승인 문서 인덱스 | 서버 컴포넌트 및 file repository 직독 |
| ② Vercel Blob | 정정 감시 이벤트 스토어 | cron 간 상태 보존 | 불가 |
| ③ Postgres | **AWS RDS PostgreSQL + pgvector (ap-northeast-2) — 2026-08-31 이전** | §3 더미·참조 데이터 원장 + §4 generic/product RAG + §5 검증 실행 이력·원장 관측 | 서버 컴포넌트 직독 불가; search/evidence API와 이력 기록만 허용 |

호스팅 비교는 2026-08-29에 Neon·Supabase·Oracle을 대상으로 수행했지만, 2026-08-31 오너 결정으로 AWS RDS를 최종 채택했다. 이전 후보의 일시정지 방어와 풀러 구성은 현재 운영 계약이 아니다.

**2026-08-31 이전 확정 (오너 결정)**: 레이턴시 벤치 재현성(공유 컴퓨트·풀러 홉 제거)과 Vercel 함수 icn1 고정에 따른 동일 리전 코로케이션을 위해 **AWS RDS PostgreSQL 18(db.t4g.micro, ap-northeast-2)**로 이전 완료. 마이그레이션 0000~0004·roles.sql·ingest·seed·export 재현 검증 그린. RDS는 무활동 일시정지가 없으므로 **위 ping 조항은 폐기**(cron 미구현 상태에서 폐기라 코드 변경 없음). 접속은 풀러 없이 단일 엔드포인트(5432)이며 `rds.force_ssl` 기본 활성 — 연결 문자열에 `sslmode=require` 의무.

**구속 원칙: Postgres 도입은 "화면은 캐시만 읽는다"를 바꾸지 않는다.** DB에 접근하는 경로는 두 개뿐이다:

1. **수집·생성 파이프라인(CLI)** — DB 유래 화면 자료는 export하고, common PDF는 `knowledge:index`가 승인 manifest만 검증·파싱해 generated index를 만든다. 원천 manifest/PDF와 review candidate는 화면·API에 직접 노출하지 않는다.
2. **런타임 retrieval API** — `POST /api/search`는 공개 offering과 generic keyword RAG를, `POST /api/evidence/query`의 published-offer 경로는 구조화 항목과 exact product PDF 근거를 repository로 읽는다. 상품 질의에 generic corpus를 섞지 않는다.

`DATABASE_URL` 미설정은 file mode와 `degraded` 메타데이터로 정직하게 동작한다. 반대로 DB가 설정된 뒤 조회가 실패하면 file로 조용히 폴백하지 않고 API 오류로 전파한다. 두 경우 모두 서버 컴포넌트의 파일 기반 화면은 DB와 독립적이다.

### 2.1 접근 계층·페일 모드

- 드라이버: **postgres-js(`postgres`) + drizzle-orm**. 스키마 정본은 `src/lib/db/schema.ts`, 마이그레이션 정본은 수기 SQL `db/migrations/`이며 `db:migrate` 자체 러너가 `_migrations`로 적용을 추적한다. drizzle-kit generate는 `db/generated/` 드리프트 대조용일 뿐 실 적용 경로가 아니다.
- **연결 문자열 2종 분리 (의무)**:
  - `DATABASE_URL` — RDS 단일 엔드포인트(5432), **제한 역할(`jeomjeom_rag_ro`)** 자격증명, 런타임 전용. 풀러가 없으므로 서버리스 동시 인보케이션은 postgres-js 커넥션 풀 상한(인스턴스당 1~2)으로 방어하고, 필요 시 RDS Proxy를 후속 옵션으로 둔다. (구 Supavisor 6543 서술은 2026-08-31 이전으로 폐기.)
  - `DATABASE_URL_DIRECT` — 같은 RDS 엔드포인트(5432)의 마스터/RW 자격증명으로 migration·seed·ingest·export CLI에서만 사용한다.
- **자격증명 역할 분리 (의무)**: `db/roles.sql`의 런타임 역할은 RLS가 공개 범위를 제한하는 `rag_documents`·`rag_chunks` SELECT, `runtime_public_offerings` 화이트리스트 뷰 SELECT, `verification_runs`·`monitor_runs`·`monitor_events` INSERT를 갖는다. 실행 이력 상세 열은 읽지 못하되 멱등 INSERT와 `RETURNING`에 필요한 열 및 identity sequence USAGE만 예외로 허용한다. 원장 쓰기와 DDL은 `DATABASE_URL_DIRECT` 전용이다.
- **확장 가용 실측 (2026-08-31 RDS)**: `vector` 0.8.1 · `pg_trgm` 1.6 · `unaccent` 1.1. `CREATE EXTENSION`은 마이그레이션에서 수행한다.
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
interface ProductKnowledgeRepository {
  findExact(scope: {
    categoryId: CategoryId
    productId: string
    dataNature: "observed" | "scenario"
    scenarioId?: string
  }): Promise<ProductKnowledgeResult>
}
```

file 모드 트윈은 "DB 스키마와 동형인 JSON 미러"가 아니라 위 인터페이스의 동형 구현이다 — 특히 RAG는 열화 경로가 질적으로 다르므로(키워드 매칭) 인터페이스 뒤에서만 분기한다. `/api/search` 핸들러에 모드 분기 금지.

## 3. 더미·참조 데이터 원장 (부동산·미술품)

### 3.1 왜 더미인가 (정직 규약 — 위반 금지)

부동산·미술품은 상품 페이지 크롤링이 금지(신호등 Red)이고 플랫폼 재표시는 서면 확인 전 금지(Yellow)다. 따라서 공개 화면용 데이터는 ① Green 공공 원장(RTMS·건축물대장 등) ② 서면 확인 완료분 ③ **합성(더미) 데이터**의 3종으로만 구성한다. 합성 데이터 규칙:

- 모든 레코드에 `provenance` 필수: `"public_record" | "manual_verified" | "synthetic"`. 3값 외 금지.
- `synthetic` 레코드가 화면에 오르는 표면에는 **"예시 데이터" 고지를 같은 표면에** 부착한다 — 실측처럼 보이는 배치는 `04-expression-rules.md` 위반이다. 판정(`match` 등)은 synthetic 근거 위에서 산출하지 않는다 — synthetic 근거만 있는 항목은 "대조 불가"다.
- **synthetic slug 네임스페이스 분리 (2026-08-29 신설)**: synthetic 레코드의 `offer_slug`는 `ex-` 프리픽스 의무(`ex-art-1` 류). 근거: 실측 미술품 상수(`src/lib/content/art.ts`의 `art-1~5`, 공모 11.8억)와 DB synthetic(`art-1~3`, 예시 회화 1.2억)이 **같은 키의 다른 실체**로 충돌하는 것이 실측됨 — 실측 데이터의 slug 공간을 synthetic이 선점하지 않는다. 기존 synthetic slug는 시드·인덱스에서 일괄 개칭(인덱스 v2 소비자 부재 시점이라 저비용).
- 실존 발행사·실존 상품을 흉내 낸 합성 금지 — 가공 명칭(`예시 오피스 A` 류)만. 실명 규칙은 `05` §1. **기계 검증 의무**: ① synthetic 레코드의 표기명은 `예시 ` 프리픽스를 Zod `.refine()`으로 강제(프리픽스 없는 synthetic 삽입 거부) ② 시드 CLI는 synthetic 명칭 필드(`title_public`·`artwork_title`·`auction_house` 등)를 실존 개체 블록리스트(DART 발행인 레지스트리 스냅샷 + `07-asset-map` 등재 실존 플랫폼·경매사)와 대조해 겹치면 시드를 실패시킨다 — 눈대중 판단에 맡기지 않는다.
- 시드는 결정적(고정 시드)이며 스크립트 재실행으로 동일 결과가 재현돼야 한다. 손으로 DB를 고치지 않는다.
- **적재 원천 경로 가드 (의무)**: `db:seed`는 원천 파일 경로가 `data/raw/`·`data/snapshots/`·`data/reports/`(로컬 전용)이면 즉시 실패한다 — 커밋 가능 원천(`data/offers/`·`data/reference/`)과 명시적 synthetic 생성기만 허용. CLI 진입점에 하드코딩한다. "마스킹 전 데이터 DB 적재 금지"(§3.2 말미)의 유일한 기계 강제 지점이다 — export 사후 게이트는 RDS 인스턴스 자체의 유출은 못 막는다.

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

CREATE TABLE real_estate_trades (          -- 0004에서 re_trades를 rename (R-STO-23)                          -- 부동산 실거래 (RTMS 수집분 원장화, Green)
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
CREATE INDEX ON real_estate_trades (lawd_cd, deal_ym);
```

- 판정·리포트는 DB에 넣지 않는다 — 리포트의 진실은 여전히 파이프라인 산출 JSON(①층)이다. DB는 "대조에 쓸 참조 원장"까지만.
- 개인정보 포함 원천은 DB에도 넣지 않는다 — `data/raw/` 로컬 전용 원칙은 DB에 그대로 적용된다. RDS는 팀 공유 저장소이므로 **마스킹 전 데이터 적재 금지** — 기계 강제는 §3.1 원천 경로 가드.
- **필드 매핑 원칙**: `data/offers/*.json`의 공모 자체 정보(`offer.*`, 매각·정산 포함)는 `offerings.detail`로, 시장 참조 거래(RTMS 수집분)는 `real_estate_trades` 로우로 — "공모 귀속 정보"와 "시장 참조 원장"의 경계를 섞지 않는다. 필드별 상세 매핑표는 `schema.ts` 구현 PR에서 확정·병기.

### 3.3 시드·내보내기 규약

```bash
npm run db:migrate     # 수기 SQL db/migrations/ 적용 — 자체 러너, _migrations 추적
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

- `detail` 화이트리스트: art=`{artistName, platformName, hasImage, note?}`, real-estate=`{buildingUse, note?}`, 그 외=`{note?}`. 카테고리 확장 시 `cardDetail`에 화이트리스트 추가. 분 단위 청약 시각을 갖는 cattle 공모(livestock 7~9)는 `detail.opensAt`·`detail.closesAt`(ISO 8601, KST offset)를 추가로 통과시키며 그 존재로 `subscription.precision`을 `minute`/`day`로 파생한다(A안 — schema.ts date 컬럼 불변, 마이그레이션 불필요).
- 청약 `phase`(`upcoming|open|closed`)는 인덱스에 굽지 않는다 — `subscription.opensOn/closesOn`에서 클라이언트가 파생(내보내기 시각 고정 방지).
- **재생성 절차(오너)**: 합성 생성기(`seed/synthetic.ts`)의 detail 확장은 `db:seed` 재실행으로 DB에 반영된 뒤 `db:export`로 산출물에 반영된다 — schema.ts(DB 컬럼)는 불변(카테고리 필드는 `detail` jsonb)이라 신규 마이그레이션 불필요.

### 3.5 카테고리별 참조 원장 통합표 (2026-08-29 전수 인벤토리 기반 — 일괄 적용 대상)

2026-08-29 실측: 현행 5테이블은 보유 데이터의 약 20%만 수용한다. 파일에 실거래 839건·한우 경락가 33개월(~480행)·돼지 경락가 60행이 있으나 DB 적재 경로가 전무하고, `real_estate_trades`는 적재 코드 자체가 없다. 목표 상태:

| 카테고리 | 참조 원장 | 대상 테이블 | 작업 |
|---|---|---|---|
| cattle | 경락가 월집계 (`data/reference/auction-price/` 33파일) | `cattle_auction_prices` **신설** — month·breed_cd·sex_cd·grade_cd·price_per_kg·head_count·avg_price_per_kg·sample_size·partial·source_meta, UNIQUE(month,breed_cd,sex_cd,grade_cd) | 파일→DB 적재 CLI. license·sha256은 MANIFEST에서 조인해 source_meta 충족 |
| cattle | 개체 이력 (축산물이력제) | §5 `ledger_observations` — **farmerNm·farmAddr 등 PII 제외 구조화 필드만** | 대조 실행 시 기록 (수기 스냅샷 이관 아님 — snapshots는 DB 금지 유지) |
| pig | 대표가격 (CSV 60행, Green·메타 완비) | `pig_auction_prices` **신설** — month·skin_type·sex·grade·region·head_count·price_won_per_kg·amount_won·weight_kg, UNIQUE(month,skin_type,sex,grade,region) | CSV→DB 적재 |
| pig | 회차 3건 (`src/lib/content/pig.ts` 상수) | `offerings` 이관 — provenance=`manual_verified`, 회차 구조는 `detail` 화이트리스트 확장 | pig 공모 행 0건 공백 해소. 문안 상수는 코드 유지(감사 게이트) |
| art | 낙찰 기록 | `art_auction_records` (기존) | 실데이터 338건은 라이선스 재판정(팀 안건 6) 전 적재 보류 |
| art | 실측 공모 5건 (`src/lib/content/art.ts` 상수) | `offerings` 이관 — provenance=`manual_verified`, slug 충돌은 §3.1 `ex-` 규칙으로 해소 | |
| real-estate | 실거래 (RTMS 8파일 839건) | `real_estate_trades` **확장** — +building_type·floor·building_area_sqm·land_area_sqm·build_year·cancelled boolean (면적 없이는 ㎡ 단가 비교 불가) | 새 마이그레이션(append-only) + 적재 CLI |
| real-estate | 건축물대장 | 보류 — 실데이터 0건(API 403) | 키 승인 후 신설 `[팀 결정 대기]` |
| 공통 | 신고서 사실 카드 (`data/offers/filing-facts/` 18행) | `offering_filing_facts` **신설** — offer_slug·rcp_no·submitted_on·fact_id·label·value·section·short, UNIQUE(offer_slug,rcp_no,fact_id) | offerings와 DART 계보 연결 확보 |
| 공통 | 공모 좌표 (`data/offers/*.json`) | `offerings` **확장 파싱** — `asset` jsonb(lawd_cd·bjdong_cd·dong 등 조인 키)·`sale` jsonb·`limits` — 현행 rawOfferSchema가 6개 필드군을 유실 중 | detail 화이트리스트 확장(스키마 컬럼 불변) 또는 컬럼 추가 — 구현 시 확정 |
| RAG | 코퍼스 미적재 6건 + 교육 콘텐츠(1,464줄, 검색 밖) | `rag_documents/chunks` | `data/reference/rag/`에 청크 추가(코드 변경 불필요). 교육 콘텐츠는 청크 **미러**만 — 컴포넌트 직독 구조 유지 |

파일은 계속 **수집 원본이자 기본 화면 원천**이다(R-STO-03). DB 유래 화면 자료는 export 산출물, PDF 지식은 `knowledge:index`의 공개 승인 generated index만 사용한다. 파일→DB 적재는 `db:seed`가 아니라 **`db:ingest` 계열 CLI**로 분리해 synthetic 시드와 승인 지식 snapshot을 구분한다.

## 4. RAG 저장소 — 통합 RAG 아키텍처 MVP

기본 런타임은 keyword 검색이다. 승인 canonical chunk의 로컬 SQLite overlay가 있고 운영 opt-in·feature flag·exact scope·hash 검증을 모두 통과한 요청만 semantic 검색을 사용한다. generic corpus는 상품 결과가 없는 일반 개념 질문에만 사용하고, product corpus는 exact 상품 근거질의에만 사용한다. 아래 vector DDL은 AWS RDS 목표 스키마이며, 운영 pgvector 검색 경로는 별도 검증 전까지 완료로 간주하지 않는다.

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

### 4.1 `0004_rag_product_scope.sql` 확장

- 기존 행은 근거 없이 상품 scope를 만들지 않고 `scope_kind='generic'`으로만 백필한다.
- product 행에는 `ingest_owner`, `category_id`, `product_id`, `data_nature`, `source_kind`, URL·기준일·hash·상태·한계가 필수다. scenario product에는 `scenario_id`가 필수다.
- document/chunk의 생성 `scope_key`와 복합 FK로 scope 혼합을 막고 public/ready exact 조회 인덱스를 둔다.
- `approved_for_external_ai`와 `pii_review_status`를 document/chunk에 함께 저장하며 PII 검토가 `passed`가 아니면 외부 AI 승인을 허용하지 않는다.
- ETL은 고정 `ingest_owner`의 active snapshot만 upsert하고 같은 owner에서 사라진 행을 transaction 안에서 `revoked` 처리한다. generic 및 다른 owner 행은 보존한다.

**한국어 키워드 검색 한계 (인지된 리스크)**: `to_tsvector('simple', …)`은 형태소 분석이 없어 조사 결합형("공모는"/"공모가")이 서로 다른 토큰이 된다 — 한국어 본문에 대한 tsvector 단독 키워드 검색은 정확도가 매우 낮고, **fake 모드(키·DB 없는 환경)의 검색 품질 전체가 이 경로에 의존**하므로 방치 불가. 보강 기본값: ① `pg_trgm` + GIN 인덱스를 키워드 폴백에 병행(형태소 없이 부분 문자열 유사도로 동작 — RDS PostgreSQL 18 가용 확장 실측(vector 0.8.1·pg_trgm 1.6·unaccent 1.1, 2026-08-31)) ② 적재 CLI에서 조사 스트리핑 등 사전 토큰화 후 `simple`에 투입. 채택 조합은 `[팀 결정 대기]` — 구현 spike로 정확도 비교 후 결정.

- **출처 강제와 접합**: generic 검색 결과의 `source_id`는 스파인 코퍼스 등록분만 인용한다. product 문서는 코퍼스 id 대신 exact scope, manifest/public 승인, 공개 URL, 기준일, source/chunk hash와 ready 상태를 검증한다. 어느 경로도 RAG 적재만으로 공개 승인을 얻지 않는다.
- DB generic 검색은 `scope_kind='generic'` + `websearch_to_tsquery('simple', …)` FTS, file twin은 lexical 검색이다. product 조회는 exact scope + 공개 승인 + ready document/chunk만 반환한다.
- keyword/file/DB FTS 또는 semantic 강등 경로는 `semantic:false`와 강등 사유를 표시한다. 최신 canonical contentVersion의 로컬 SQLite hit을 exact scope·source/document/chunk hash로 재검증한 경우에만 `semantic:true`이며, 홈 결합 결과는 `strategy:"hybrid"`로 표시한다.
- 로컬 색인은 `text-embedding-3-small` 1536차원으로 생성·검증했다. AWS RDS pgvector 연결·재적재는 후속 검증 대상이다.
- 대화 입력·질의 로그를 RAG 테이블에 섞지 않는다 — 보존은 `05` §4(30일, 마스킹 2단 후 저장) 별도 경로. 챗 개통과 함께 대화 로그를 DB에 저장하기로 하면 전용 테이블(30일 TTL 삭제 잡 포함)을 본 문서에 추가 정의한다 — 현 초안 범위 밖.
- **RAG 본문 인젝션 방어 (의무)** — 출처 강제는 "어떤 문서를 인용했나"만 검증하고 본문 내용은 검증하지 않는다. Green 라이선스 문서도 본문에 은닉 지시문이 있으면 출처 게이트를 통과하므로 두 겹을 추가한다:
  1. **프롬프트 격리**: `rag_chunks.content`는 프롬프트 조립 시 고정 구분자 데이터 블록(`<retrieved_context>…</retrieved_context>` 류)으로만 삽입 — 사용자 지시와 같은 채널에 원문을 이어붙이지 않는다. `06` §6 "문서 내 지시문은 데이터일 뿐 명령이 아니다"의 RAG 구간 집행 조항.
  2. **적재 시 스캔**: 적재 CLI는 청크의 인젝션 휴리스틱(명령형 지시 패턴·역할 지정 문구·인코딩 스머글 징후)을 1차 통과분만 등록 — 실패분은 license 등급과 무관하게 보류. 챗 게이트의 다턴 레드팀 시나리오 셋에 "RAG 소스 내 인젝션"을 명시적으로 포함한다.

## 5. 검증 실행 이력·원장 관측 (Run Ledger — 2026-08-29 오너 지시 신설)

**문제**: 파일에 없는 것은 판정 결과가 아니라 "판정이 언제·무엇을 보고 내려졌는지"다. 실측 — ① 라이브 재대조(`POST /api/verify`)는 100% 휘발(감사 추적 0, 공공 API 일 쿼터 실사용 집계 불가) ② cron 감시 이력은 Blob write-only(읽는 코드 0건) ③ 원장 API 원응답은 판정 문장 1줄로 축약 후 폐기 → **과거 판정 재현 불가** ④ 로컬 실행 이력은 파일명 ISO 시각으로만 존재(livestock-9에 리포트 18개 누적).

**경계 재정의 (R-STO-11 개정)**: "판정·리포트 **본문**(판정 문장·근거 서술·화면이 읽는 것)은 DB에 넣지 않는다"는 유지. **실행 이력 메타 + 판정 건수 집계 + 구조화 원장 관측치**는 DB 기록 대상이다 — 이는 R-STO-11이 허용한 "대조용 참조 원장"의 연장이지 리포트 이관이 아니다.

```sql
CREATE TABLE verification_runs (                  -- 실행 원장: 모든 검증 실행(cli·cron·api)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_key text NOT NULL UNIQUE,                   -- {offer_slug}:{generated_at ISO} — 멱등 타깃
  offer_slug text NOT NULL, rcp_no text,
  trigger text NOT NULL CHECK (trigger IN ('cli','cron','api')),
  mode text NOT NULL CHECK (mode IN ('fake','live','snapshot')),
  extraction_mode text,
  generated_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','failed','degraded')),
  verdict_counts jsonb NOT NULL DEFAULT '{}',     -- {match,mismatch,unverifiable} 건수만 — 판정 본문·문장 금지
  source_ids text[] NOT NULL DEFAULT '{}',
  artifact_name text, artifact_sha256 text,       -- 산출 리포트 파일과의 연결 고리
  ledger_calls int,                               -- 공공 API 호출 수 — 쿼터 실사용 집계 근거
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON verification_runs (offer_slug, generated_at);
CREATE INDEX ON verification_runs (trigger, created_at);

CREATE TABLE monitor_runs (                       -- cron 감시 실행 이력 (Blob 원본은 아카이브로 유지)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checked_at timestamptz NOT NULL UNIQUE,
  source text NOT NULL,
  event_counts jsonb NOT NULL DEFAULT '{}',       -- kind별 건수
  blob_key text,                                  -- 원본 MonitorRun의 Blob 경로
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE monitor_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  monitor_run_id bigint NOT NULL REFERENCES monitor_runs(id) ON DELETE CASCADE,
  offer_slug text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('no_amendment','amendment_detected','detection_failed')),
  base_rcp_no text, checked_through text, amendment_rcp_nos text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX ON monitor_events (offer_slug, kind);

CREATE TABLE ledger_observations (                -- 원장 관측 스냅샷: 대조 시점의 공공 원장 상태 (과거 판정 재현 근거)
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id text NOT NULL CHECK (category_id IN ('cattle','pig','art','real-estate')),
  subject_key text NOT NULL,                      -- 공개 마스킹 규칙과 동일한 마스킹 식별자 — 원문 이력번호 금지
  source_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  subject_exists boolean,
  fields jsonb NOT NULL DEFAULT '{}',             -- 구조화 화이트리스트만(birth_ymd·breed·sex·current_farm_no 등)
  UNIQUE (subject_key, source_id, observed_at)
);
CREATE INDEX ON ledger_observations (subject_key, observed_at);
```

**집행 규칙**:
1. **자유문장 금지**: `Evidence.observed` 원문 문자열을 어떤 컬럼에도 복사하지 않는다 — 마스킹 전 실명·주소가 따라 들어가는 경로다. `fields`는 Zod strict 화이트리스트만, `farmerNm`·`farmAddr` 계열 필드명은 리터럴 금지어.
2. **기록 주체 (2026-08-30 정정)**: CLI는 `DATABASE_URL_DIRECT`로 기록. **cron·라이브 API는 런타임 자격증명으로 기록** — 프로덕션에서 이 경로들은 직결을 갖지 않으므로(직결은 CLI 전용, 배포 안 함) 직결을 요구하면 영구 무기록이 된다. 라이브 API(`POST /api/verify`)는 응답 후 `after()`로 실행 보장, cron(`monitor_runs/events`)은 요청 내 트랜잭션으로 기록. DB 실패가 응답을 실패시키지 않는다(무중단 요건, 실패는 loud 로그). DB 미설정(file 모드)이면 기록 생략이 정직한 동작.
3. **런타임 역할 확장 (R-STO-16 재개정)**: 런타임 자격증명 = 공개 승인 RLS가 적용된 rag 2테이블 SELECT + `runtime_public_offerings` SELECT + `verification_runs`·`monitor_runs`·`monitor_events` INSERT. `ON CONFLICT`의 `verification_runs.run_key`·`monitor_runs.checked_at`과 `RETURNING`의 `monitor_runs.id`만 column-level SELECT하고, 세 identity sequence의 USAGE만 허용한다. 공개 경로가 다른 실행 이력 열을 읽거나 타 원장·sequence를 사용하는 것은 계속 차단한다.
4. **watch 이중 경로 정리**: cron은 Blob(원본 아카이브) + `monitor_runs/events`(질의용) 이중 기록. 화면의 `data/public/watch/` 파일은 CLI 산출 유지 — 캐시 전용 원칙 불변.
5. 골드셋 **점수**(라벨 본문 제외)의 DB 기록은 `[팀 결정 대기]` — 현재 stdout 증발 문제만 명세에 기록해 둔다.

## 6. 환경 변수 (DB 도입 PR에서 `.env.example` 반영 의무 — PR 체크 항목)

| 변수 | 없을 때 동작 |
|---|---|
| `DATABASE_URL` (풀러, 런타임 제한 역할) | file mode repository twin으로 완주 |
| `DATABASE_URL_DIRECT` (세션/직결, CLI 전용 RW) | db:* 스크립트가 `not_configured` 정직 종료 |
| `AI_GATEWAY_API_KEY` / `OPENAI_API_KEY` | live evidence 호출 없음; 근거-only·구조화·승인 cache 경로 유지 |
| `LIVE_EVIDENCE_ENABLED` | 기본 false. 외부 전송 고지·동의, 분산 rate limit, 일일 비용상한 전에는 true 금지 |
| `ANTHROPIC_API_KEY`·`SPINE_MODEL`·`VERIFY_EXTRACT_MODEL` | 스파인·추출 fake/기본 모델 (기존 동작) |
| `DART_API_KEY`·`DATA_GO_KR_API_KEY` | 라이브 경로 `not_configured` 정직 응답 (기존) |
| `CRON_SECRET` | cron 503 `not_configured` (기존) |
| `BLOB_READ_WRITE_TOKEN` | 정정 감시 이벤트 미저장 (기존) |

"없으면 죽는다"는 허용되지 않는다 — 모든 변수에 부재 시 동작이 정의돼야 한다.

## 7. 검증

- 계약 테스트: ① provenance 3값 외 거부 ② synthetic 근거로 판정 산출 시도 거부 ③ `rag_documents.source_id` 미등록 id 거부 ④ file 모드 완주(`DATABASE_URL` 없이 `npm test`·`npm run build` 그린) ⑤ synthetic `예시 ` 프리픽스 없는 레코드 거부 ⑥ `db:seed` 로컬 전용 경로(`data/raw/` 등) 원천 즉시 실패.
- `db:export` 산출물은 기존 익명화 게이트 테스트 대상에 자동 포함된다 — DB 유래라고 게이트를 우회하지 않는다. **배포 체크 연동**: CI 없는 수동 배포 구조이므로, `CLAUDE.md` 배포 절에 "직전 `db:export` 실행분이 익명화 게이트를 그린으로 통과했는가"를 체크 항목으로 명기한다(DB 도입 PR에서 반영).
- 스키마 변경은 worklog 4섹션 기록 대상이다 (특히 마스킹·공개 경로에 닿는 변경).

## 구성 결정 (2026-08-29 오너)

| 항목 | 확정값 | 근거 |
|---|---|---|
| DB 호스팅 | **AWS RDS PostgreSQL (ap-northeast-2)** — 2026-08-31 오너 결정으로 Supabase에서 이전 | §2 이전 확정 근거 참조 — 레이턴시 벤치 재현성·icn1 코로케이션. 일시정지 없음(ping 조항 폐기) |

## 팀 결정 대기 (기본값 병기)

| 항목 | 기본값 | 근거 |
|---|---|---|
| 접근 계층 | postgres-js + drizzle-orm, 수기 SQL 자체 migration runner | 타입 안전 쿼리 + append-only SQL 적용 추적. drizzle-kit generate는 드리프트 대조 전용 |
| 임베딩 모델·차원 | 로컬 SQLite overlay와 AWS RDS 목표 열 모두 `text-embedding-3-small` 1536차원 | 로컬 apply 완료; RDS 재적재·골드셋 검증은 후속 단계 |
| 한국어 키워드 검색 보강 | `pg_trgm` 병행 (대안: 적재 시 사전 토큰화) | §4 한계 절 — fake 모드 검색 품질 직결, spike로 비교 후 확정 |
| RAG 도입 범위 | 검색(①④유형)만 — 리포트 서술 생성에는 미사용 | 검증 사실 오염 방지 (06 §3) |
| synthetic 고지 문구 | "예시 데이터로 구성한 화면입니다" 계열 — 문안은 `src/lib/content/` 등재 후 출력 필터 감사 | 04 표현 규칙 |
| 더미 데이터 규모 | 부동산 공모 3건·미술품 공모 3건 + 참조 원장은 실데이터 우선 | 심사 시연 최소 단위 |
