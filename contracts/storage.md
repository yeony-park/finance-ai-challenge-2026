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
| ① 파일 캐시 (`data/public/`·`data/reference/`·`data/offers/`) | 커밋 | 서버 컴포넌트 직독 — 유일한 화면 원천 |
| ② Vercel Blob | 정정 감시 이벤트 스토어 | 불가 |
| ③ Postgres (**Supabase** + pgvector — 2026-08-29 오너 확정) | 더미·참조 원장 + RAG 코퍼스 | **불가** |

- **R-STO-01 (MUST)** DB 접근 경로는 둘뿐: ①수집·생성 CLI(적재 후 `db:export`로 파일 캐시에 내보냄) ②`POST /api/search` RAG 검색(M2+). 렌더 경로·서버 컴포넌트에서 DB 조회 금지.
- **R-STO-02 (MUST)** `DATABASE_URL` 미설정 = file 모드. DB 리포지토리마다 `data/` JSON을 읽는 fake 트윈이 같은 인터페이스로 응답해야 하며, DB 없이 빌드·테스트·verify 완주(R-INV-05).
- **R-STO-03 (MUST)** `db:export`만이 화면 데이터를 만든다. export 산출물은 마스킹 2단 + 익명화 게이트(R-INV-03)를 동일 통과. DB에서 화면 JSON으로 가는 다른 경로 금지.
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

- **R-STO-12 (MUST)** `rag_documents.source_id`는 스파인 코퍼스(`spine/rag/corpus.ts`) 등록 id와 1:1. RAG 적재 ≠ 출처 등록 — 등록은 오너 일괄(R-INV-13). 미등록 id 적재는 계약 테스트가 거부한다.
- **R-STO-13 (MUST)** `license`는 `green | yellow_confirmed`만 적재 가능. red·yellow 미확인 금지.
- **R-STO-14 (MUST)** RAG 용도는 검색(교육·범위 밖 판별)만 — 검증 사실·수치의 원천은 리포트 캐시(R-API-11). 문서 임베딩은 적재 CLI에서 1회, 런타임은 질의 임베딩 1회만. 대화 입력 로그를 RAG 테이블에 혼입 금지.
- **R-STO-15 (기본값)** 임베딩 text-embedding-3-small(1536) + 하이브리드 검색(tsvector + vector cosine, HNSW). fake 모드는 임베딩 생략, 사전 작성 콘텐츠 키워드 매칭으로 열화. 키워드 질의는 `websearch_to_tsquery`만(`to_tsquery` 금지). `simple` 설정은 한국어 형태소 미지원 — `pg_trgm` 병행 등 보강은 09 §4 [팀 결정 대기].
- **R-STO-16 (MUST, 2026-08-30 재개정)** 자격증명 역할 분리: 런타임 `DATABASE_URL`은 ①rag 2테이블 SELECT ②`verification_runs`·`monitor_runs`·`monitor_events` INSERT 역할. 이력 읽기는 불가하되, `monitor_events`가 `monitor_runs.id` FK를 링크하려면 `INSERT ... RETURNING id`가 필요하고 RETURNING은 SELECT 권한을 요구하므로 **`monitor_runs`에 한해 SELECT 예외**(집계 메타·PII 없음). `monitor_events`·`verification_runs`·원장 테이블은 SELECT 불가 유지. **근거**: 라이브 API(`POST /api/verify`)와 cron(`GET /api/cron/monitor`)은 프로덕션에서 런타임 자격증명만 갖는다(직결은 CLI 전용, 배포 안 함) — 직결을 요구하면 cron 이력이 영구 무기록되므로 런타임 역할로 기록한다. 원장 쓰기·마이그레이션은 여전히 `DATABASE_URL_DIRECT`에만. Supabase `service_role`·`anon` 키는 코드에 들여오지 않는다(PostgREST 미사용).
- **R-STO-17 (MUST)** RAG 청크는 프롬프트 조립 시 고정 구분자 데이터 블록으로만 삽입 — 사용자 지시 채널에 원문 이어붙이기 금지(06 §6의 RAG 집행 조항).
- **R-STO-18 (MUST)** RAG 적재 CLI는 인젝션 휴리스틱 스캔 통과분만 등록 — 실패분은 license 등급 무관 보류. 챗 게이트 다턴 레드팀에 "RAG 소스 내 인젝션" 시나리오 포함.

## 실행 이력·원장 관측 (09 §5)

- **R-STO-19 (MUST)** 모든 검증 실행(cli·cron·api)은 `verification_runs`에 기록한다 — run_key 멱등, 판정은 건수 집계(jsonb)만. 라이브 API 경로는 best-effort 비동기(DB 실패가 응답을 실패시키지 않는다). DB 미설정(file 모드) 시 기록 생략이 정직한 동작.
- **R-STO-20 (MUST)** `ledger_observations.fields`는 Zod strict 화이트리스트만 — `Evidence.observed` 자유문장 복사 금지, `farmerNm`·`farmAddr` 계열 필드명 리터럴 금지, `subject_key`는 공개 마스킹 규칙과 동일(원문 이력번호 금지). **배선(2026-08-30)**: 축산물이력제 어댑터에 `withLedgerObservationRecording` 데코레이터를 씌워 대조 시점(trace.lookup)에 best-effort 기록한다 — judge 파이프라인 무수정. CLI(직결)에서 활성, DB 미설정 시 no-op. 라이브 API 경로 기록은 런타임 역할에 `ledger_observations` INSERT가 없어(R-STO-16) 미배선 — 필요 시 역할 확장은 오너 결정(M2+).
- **R-STO-21 (MUST)** synthetic 레코드의 `offer_slug`는 `ex-` 프리픽스 의무 — 실측 데이터 slug 공간과 네임스페이스 분리(09 §3.1). 표기명 `예시 ` 프리픽스(R-STO-07a)와 쌍.
- **R-STO-22 (MUST)** 파일→DB 참조 원장 적재는 `db:seed`(synthetic)와 분리된 `db:ingest` 계열 CLI로 — 원천은 커밋 가능 경로(`data/reference/`·`data/offers/`)만(R-STO-03a 가드 동일 적용).

## 명령어 (도입 시 package.json 등재)

```bash
npm run db:migrate   # drizzle-kit 적용
npm run db:seed      # 결정적·멱등 시드
npm run db:export    # DB → data/public/·data/reference/ (마스킹 게이트 경유)
```

## 환경 변수 부재 시 동작 (전 변수 정의 의무)

| 변수 | 없을 때 |
|---|---|
| `DATABASE_URL` (풀러·읽기 전용 역할) | file 모드 (R-STO-02) |
| `DATABASE_URL_DIRECT` (직결·CLI 전용 RW) | db:* 스크립트 `not_configured` 정직 종료 |
| `AI_GATEWAY_API_KEY`/`OPENAI_API_KEY` | LLM·임베딩 fake |
| `ANTHROPIC_API_KEY`·`SPINE_MODEL`·`VERIFY_EXTRACT_MODEL` | 스파인·추출 fake/기본 모델 |
| `DART_API_KEY`·`DATA_GO_KR_API_KEY` | 라이브 경로 `not_configured` 정직 응답 |
| `CRON_SECRET` | cron 503 `not_configured` |
| `BLOB_READ_WRITE_TOKEN` | 정정 감시 이벤트 미저장 |
