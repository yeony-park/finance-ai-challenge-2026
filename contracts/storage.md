---
scope: DB·스키마·시드·RAG·더미 데이터·data/ 산출물
read-when: Postgres 스키마/마이그레이션/시드 작업, RAG 적재·검색, 더미 데이터 생성, db:export
source-of-truth: (도입 후) src/lib/db/schema.ts — 생기기 전까지 docs/spec/09 §3.2 DDL 초안
rationale: docs/spec/09-stack-and-storage.md
---

# 저장 계층 계약 (STO)

## 3층 구조와 접근 경로

| 층 | 저장소 | 화면 접근 |
|---|---|---|
| ① 파일 캐시 (`data/public/`·`data/reference/`·`data/offers/`) | 커밋 | 서버 컴포넌트 직독 — 유일한 화면 원천 |
| ② Vercel Blob | 정정 감시 이벤트 스토어 | 불가 |
| ③ Postgres (Neon + pgvector) | 더미·참조 원장 + RAG 코퍼스 | **불가** |

- **R-STO-01 (MUST)** DB 접근 경로는 둘뿐: ①수집·생성 CLI(적재 후 `db:export`로 파일 캐시에 내보냄) ②`POST /api/search` RAG 검색(M2+). 렌더 경로·서버 컴포넌트에서 DB 조회 금지.
- **R-STO-02 (MUST)** `DATABASE_URL` 미설정 = file 모드. DB 리포지토리마다 `data/` JSON을 읽는 fake 트윈이 같은 인터페이스로 응답해야 하며, DB 없이 빌드·테스트·verify 완주(R-INV-05).
- **R-STO-03 (MUST)** `db:export`만이 화면 데이터를 만든다. export 산출물은 마스킹 2단 + 익명화 게이트(R-INV-03)를 동일 통과. DB에서 화면 JSON으로 가는 다른 경로 금지.
- **R-STO-04 (MUST)** 마스킹 전·개인정보 포함 데이터는 DB에도 적재 금지 — Neon은 팀 공유 저장소다. `data/raw/` 로컬 전용 원칙이 DB에 그대로 적용된다.

## 더미(합성) 데이터

- **R-STO-05 (MUST)** 모든 원장 레코드에 `provenance` 필수, 3값만: `public_record | manual_verified | synthetic`. CHECK 제약 + Zod 양쪽에서 강제.
- **R-STO-06 (MUST)** `synthetic` 근거로는 판정(`match` 등)을 산출하지 않는다 — synthetic 근거뿐인 항목은 "대조 불가". synthetic이 오르는 화면 표면에는 "예시 데이터" 고지를 같은 표면에 부착(문안은 `src/lib/content/` 등재 + 필터 감사).
- **R-STO-07 (금지)** 실존 발행사·실존 상품을 흉내 낸 합성 데이터. 가공 명칭만 허용. 크롤링 유래 데이터 적재(R-INV-11).
- **R-STO-08 (MUST)** 시드는 결정적(고정 시드)·멱등(`ON CONFLICT` 처리) — 재실행 시 동일 결과. DB 수동 수정 금지. 수집 자산 메타데이터(`sourceUrl`·`license`·`method`·`retrievedAt`·`sha256`)는 `source_meta` jsonb에 의무 기록.

## 스키마·마이그레이션

- **R-STO-09 (기본값)** 접근 계층: `@neondatabase/serverless` + drizzle-orm. 스키마 = `src/lib/db/schema.ts`, 마이그레이션 = drizzle-kit → `db/migrations/` 커밋, append-only(배포된 파일 수정 금지 — 정정은 새 마이그레이션).
- **R-STO-10 (MUST)** 타입 규약: 금액 = 원화 정수 `bigint`, 시각 = `timestamptz`, 문자열 = `text`(varchar(n) 금지), id = `bigint identity` + 공개 슬러그 별도 열. 외래키에 인덱스 필수.
- **R-STO-11 (MUST)** 판정·리포트를 DB에 넣지 않는다 — 리포트의 진실은 파이프라인 산출 JSON(①층). DB는 대조용 참조 원장까지만. 테이블 구성은 `docs/spec/09` §3.2(offerings·art_auction_records·re_trades·rag_documents·rag_chunks) 기준.

## RAG

- **R-STO-12 (MUST)** `rag_documents.source_id`는 스파인 코퍼스(`spine/rag/corpus.ts`) 등록 id와 1:1. RAG 적재 ≠ 출처 등록 — 등록은 오너 일괄(R-INV-13). 미등록 id 적재는 계약 테스트가 거부한다.
- **R-STO-13 (MUST)** `license`는 `green | yellow_confirmed`만 적재 가능. red·yellow 미확인 금지.
- **R-STO-14 (MUST)** RAG 용도는 검색(교육·범위 밖 판별)만 — 검증 사실·수치의 원천은 리포트 캐시(R-API-11). 문서 임베딩은 적재 CLI에서 1회, 런타임은 질의 임베딩 1회만. 대화 입력 로그를 RAG 테이블에 혼입 금지.
- **R-STO-15 (기본값)** 임베딩 text-embedding-3-small(1536) + 하이브리드 검색(tsvector + vector cosine, HNSW). fake 모드는 임베딩 생략, 사전 작성 콘텐츠 키워드 매칭으로 열화.

## 명령어 (도입 시 package.json 등재)

```bash
npm run db:migrate   # drizzle-kit 적용
npm run db:seed      # 결정적·멱등 시드
npm run db:export    # DB → data/public/·data/reference/ (마스킹 게이트 경유)
```

## 환경 변수 부재 시 동작 (전 변수 정의 의무)

| 변수 | 없을 때 |
|---|---|
| `DATABASE_URL` | file 모드 (R-STO-02) |
| `AI_GATEWAY_API_KEY`/`OPENAI_API_KEY` | LLM·임베딩 fake |
| `DART_API_KEY`·`DATA_GO_KR_API_KEY` | 라이브 경로 `not_configured` 정직 응답 |
