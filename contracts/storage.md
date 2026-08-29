---
scope: DB·스키마·시드·RAG·더미 데이터·data/ 산출물
read-when: Postgres 스키마/마이그레이션/시드 작업, RAG 적재·검색, 더미 데이터 생성, db:export
source-of-truth: (도입 후) src/lib/db/schema.ts — 생기기 전까지 docs/spec/09 §3.2·§4 DDL 초안
rationale: docs/spec/09-stack-and-storage.md
---

# 저장 계층 계약 (STO)

## 3층 구조와 접근 경로

| 층 | 저장소 | 화면 접근 |
|---|---|---|
| ① 파일 캐시 (`data/public/`·`data/reference/`·`data/offers/`·승인 scenario/common knowledge index) | 커밋 또는 prebuild 생성 | 서버 컴포넌트·file repository가 읽는 기본 원천 |
| ② Vercel Blob | 정정 감시 이벤트 스토어 | 불가 |
| ③ Postgres (**Supabase** + pgvector — 구성 대상) | 더미·참조 원장 + RAG 코퍼스 | 서버 컴포넌트 직독 불가; repository를 통한 search/evidence API만 |

- **R-STO-01 (MUST)** DB 접근 경로는 둘뿐: ①`DATABASE_URL_DIRECT`를 쓰는 수집·생성·migration/seed/ingest/export CLI ②`DATABASE_URL`을 쓰는 `/api/search`와 published-offer `/api/evidence/query` repository 조회. 렌더 경로·서버 컴포넌트 직조회는 금지한다.
- **R-STO-02 (MUST)** `DATABASE_URL` 미설정 = file 모드. DB 리포지토리마다 `data/` JSON을 읽는 fake 트윈이 같은 인터페이스로 응답해야 하며, DB 없이 빌드·테스트·verify 완주(R-INV-05).
- **R-STO-02a (MUST)** `DATABASE_URL`이 설정됐는데 런타임 DB 조회가 실패하면 file로 조용히 폴백하지 않는다. `DATABASE_URL_DIRECT`는 런타임 repository에서 읽지 않는다.
- **R-STO-03 (MUST)** DB 유래 화면 데이터는 `db:export`, PDF knowledge 화면 데이터는 승인 manifest를 검증하는 `knowledge:index`만 만든다. 두 산출 경로 모두 공개 승인·마스킹/익명화·scope 검증을 통과해야 하며 원천 manifest/PDF와 review candidate는 API·화면에 직접 노출하지 않는다.
- **R-STO-03a (MUST)** `db:seed`는 원천 경로가 `data/raw/`·`data/snapshots/`·`data/reports/`(로컬 전용)이면 즉시 실패 — CLI 진입점 하드코딩. R-STO-04의 유일한 기계 강제 지점.
- **R-STO-04 (MUST)** 마스킹 전·개인정보 포함 데이터는 DB에도 적재 금지 — Supabase는 팀 공유 저장소다. `data/raw/` 로컬 전용 원칙이 DB에 그대로 적용된다.

## 더미(합성) 데이터

- **R-STO-05 (MUST)** 모든 원장 레코드에 `provenance` 필수, 3값만: `public_record | manual_verified | synthetic`. CHECK 제약 + Zod 양쪽에서 강제.
- **R-STO-06 (MUST)** `synthetic` 근거로는 판정(`match` 등)을 산출하지 않는다 — synthetic 근거뿐인 항목은 "대조 불가". synthetic이 오르는 화면 표면에는 "예시 데이터" 고지를 같은 표면에 부착(문안은 `src/lib/content/` 등재 + 필터 감사).
- **R-STO-07 (금지)** 실존 발행사·실존 상품을 흉내 낸 합성 데이터. 가공 명칭만 허용. 크롤링 유래 데이터 적재(R-INV-11).
- **R-STO-07a (MUST)** R-STO-07의 기계 검증: synthetic 표기명은 `예시 ` 프리픽스 Zod 강제 + 시드 CLI가 실존 개체 블록리스트(DART 발행인 + 07 등재 플랫폼·경매사)와 대조, 겹치면 시드 실패.
- **R-STO-08 (MUST)** 시드는 결정적(고정 시드)·멱등(`ON CONFLICT` 처리) — 재실행 시 동일 결과. DB 수동 수정 금지. 수집 자산 메타데이터(`sourceUrl`·`license`·`method`·`retrievedAt`·`sha256`)는 `source_meta` jsonb에 의무 기록.

## 스키마·마이그레이션

- **R-STO-09 (기본값)** 접근 계층: postgres-js(`postgres`) + drizzle-orm. 스키마 = `src/lib/db/schema.ts`, 마이그레이션 = drizzle-kit → `db/migrations/` 커밋, append-only(배포된 파일 수정 금지 — 정정은 새 마이그레이션). drizzle-kit은 `DATABASE_URL_DIRECT`(직결) 사용.
- **R-STO-09a (MUST, 접근 계층 선택 무관)** 사용자 입력이 개입하는 모든 쿼리는 파라미터 바인딩 강제 — drizzle은 쿼리 빌더 API만(원시 `sql` 템플릿에 문자열 보간 금지), 직 SQL은 postgres-js 태그드 템플릿만. 문자열 결합·보간으로 사용자 값을 SQL에 삽입하는 패턴은 계약 위반.
- **R-STO-10 (MUST)** 타입 규약: 금액 = 원화 정수 `bigint`, 시각 = `timestamptz`, 문자열 = `text`(varchar(n) 금지), id = `bigint identity` + 공개 슬러그 별도 열. 외래키에 인덱스 필수.
- **R-STO-11 (MUST, 2026-08-29 개정)** 판정·리포트 **본문**(판정 문장·근거 서술·화면이 읽는 것)을 DB에 넣지 않는다 — 리포트의 진실은 파이프라인 산출 JSON(①층). 단 **실행 이력 메타·판정 건수 집계·구조화 원장 관측치는 DB 기록 대상**(09 §5 — verification_runs·monitor_runs/events·ledger_observations). 테이블 구성은 `docs/spec/09` §3.2·§3.5·§4·§5 기준(offerings·art_auction_records·re_trades[확장]·cattle_auction_prices·pig_auction_prices·offering_filing_facts·rag_documents·rag_chunks·verification_runs·monitor_runs·monitor_events·ledger_observations).

## RAG

- **R-STO-12 (MUST)** generic `rag_documents.source_id`는 스파인 코퍼스(`spine/rag/corpus.ts`) 등록 id만 허용한다. product 문서는 대신 exact scope, manifest/public 승인, 출처 URL, 기준일, hash와 상태를 필수 provenance로 가진다. RAG 적재 자체가 generic 출처 등록을 뜻하지 않는다.
- **R-STO-13 (MUST)** `license`는 `green | yellow_confirmed`만 적재 가능. red·yellow 미확인 금지.
- **R-STO-14 (MUST)** generic RAG는 일반 개념 질문에만 사용하고 `scope_kind='generic'`으로 제한한다. 상품 근거는 exact `category_id+product_id+data_nature+scenario_id`와 `scope_kind='product'`, public/ready 문서·청크만 조회하며 다른 상품·generic corpus로 보충하지 않는다. 대화 입력 로그를 RAG 테이블에 혼입 금지.
- **R-STO-15 (현재 구현)** 통합 RAG 아키텍처 MVP는 file lexical 검색과 DB `websearch_to_tsquery('simple', ...)` FTS만 사용한다. 응답은 `semantic:false`와 keyword 전략을 명시한다. vector/embedding 생성·검색 및 실제 Supabase 연결은 구현 완료로 간주하지 않는다.
- **R-STO-16 (MUST, 2026-08-30 개정)** 자격증명 역할 분리: 런타임 `DATABASE_URL` 역할은 `rag_documents`·`rag_chunks` SELECT, `offerings`의 공개 9열(`offer_slug,category_id,provenance,title_public,amount_won,opens_on,closes_on,detail,source_meta`) SELECT, 기존 `verification_runs` INSERT만 갖는다. 원장 쓰기·마이그레이션은 CLI 전용 `DATABASE_URL_DIRECT`에만 둔다. Supabase `service_role`·`anon` 키는 코드에 들여오지 않는다(PostgREST 미사용).
- **R-STO-17 (MUST)** RAG 청크는 프롬프트 조립 시 고정 구분자 데이터 블록으로만 삽입 — 사용자 지시 채널에 원문 이어붙이기 금지(06 §6의 RAG 집행 조항).
- **R-STO-18 (MUST)** RAG 적재 CLI는 인젝션 휴리스틱 스캔 통과분만 등록 — 실패분은 license 등급 무관 보류. 챗 게이트 다턴 레드팀에 "RAG 소스 내 인젝션" 시나리오 포함.
- **R-STO-18a (MUST)** `0004_rag_product_scope.sql`은 generic/product scope, `ingest_owner`, product provenance, public/ready 상태, external-AI 승인과 PII 검토 상태, document/chunk scope FK를 추가한다. file knowledge ETL은 고정 owner 범위만 upsert하고 같은 owner의 사라진 문서·청크를 transaction 안에서 `revoked` 처리하며 다른 owner와 generic 행은 보존한다. 외부 AI 승인은 PII 검토 `passed` 없이는 활성화할 수 없다.

## 실행 이력·원장 관측 (09 §5)

- **R-STO-19 (MUST)** 모든 검증 실행(cli·cron·api)은 `verification_runs`에 기록한다 — run_key 멱등, 판정은 건수 집계(jsonb)만. 라이브 API 경로는 best-effort 비동기(DB 실패가 응답을 실패시키지 않는다). DB 미설정(file 모드) 시 기록 생략이 정직한 동작.
- **R-STO-20 (MUST)** `ledger_observations.fields`는 Zod strict 화이트리스트만 — `Evidence.observed` 자유문장 복사 금지, `farmerNm`·`farmAddr` 계열 필드명 리터럴 금지, `subject_key`는 공개 마스킹 규칙과 동일(원문 이력번호 금지).
- **R-STO-21 (MUST)** synthetic 레코드의 `offer_slug`는 `ex-` 프리픽스 의무 — 실측 데이터 slug 공간과 네임스페이스 분리(09 §3.1). 표기명 `예시 ` 프리픽스(R-STO-07a)와 쌍.
- **R-STO-22 (MUST)** 파일→DB 참조 원장 적재는 `db:seed`(synthetic)와 분리된 `db:ingest` 계열 CLI로 — 원천은 커밋 가능 경로(`data/reference/`·`data/offers/`)만(R-STO-03a 가드 동일 적용).

## 명령어 (도입 시 package.json 등재)

```bash
npm run db:migrate   # drizzle-kit 적용
npm run db:seed      # 결정적·멱등 시드
npm run db:ingest    # 승인 file knowledge snapshot → DB product scope
npm run db:export    # DB → data/public/·data/reference/ (마스킹 게이트 경유)
```

## 환경 변수 부재 시 동작 (전 변수 정의 의무)

| 변수 | 없을 때 |
|---|---|
| `DATABASE_URL` (풀러·읽기 전용 역할) | file 모드 (R-STO-02) |
| `DATABASE_URL_DIRECT` (직결·CLI 전용 RW) | db:* 스크립트 `not_configured` 정직 종료 |
| `AI_GATEWAY_API_KEY`/`OPENAI_API_KEY` | live evidence 호출 없음; deterministic/근거-only 경로 유지 |
| `LIVE_EVIDENCE_ENABLED` | 기본 false; 외부 전송 고지·동의와 분산 제한·비용상한 전에는 활성화 금지 |
| `ANTHROPIC_API_KEY`·`SPINE_MODEL`·`VERIFY_EXTRACT_MODEL` | 스파인·추출 fake/기본 모델 |
| `DART_API_KEY`·`DATA_GO_KR_API_KEY` | 라이브 경로 `not_configured` 정직 응답 |
| `CRON_SECRET` | cron 503 `not_configured` |
| `BLOB_READ_WRITE_TOKEN` | 정정 감시 이벤트 미저장 |
