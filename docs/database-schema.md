# JeomJeom 데이터베이스 명세

기준일: 2026-09-06
정본: `src/lib/db/schema.ts`, `db/migrations/*.sql`

## 현재 적용 상태

- 코드에는 AWS RDS PostgreSQL 18과 pgvector용 스키마·마이그레이션·repository가 준비돼 있다.
- 상품 원장과 RAG 전체본문의 최종 RDS 적재는 아직 실행하지 않았다.
- 로컬 SQLite 임베딩을 해시 검증 후 RDS로 이전하는 `db:embedding:sync`와 DB 모드 pgvector 검색 경로는 구현돼 있다.
- `DATABASE_URL`이 없으면 애플리케이션은 파일 및 로컬 SQLite 벡터 색인을 사용한다.
- 실제 RDS의 현재 행 수와 적용된 마이그레이션은 운영 접속 전까지 미확인이다.

## 관계 요약

```text
offerings (상품 1건당 1행)
    └─ product_id로 논리적 연결
       rag_documents (PDF·XML·JSON 원문 1건당 1행)
           └─ document_id 외래키
              rag_chunks (원문을 나눈 검색 단위 N행)
                  ├─ content + tsv: 키워드 검색
                  └─ embedding vector(1536): 의미 검색
```

`offerings`는 원문 DB가 아니다. 화면과 구조화 검색에 필요한 상품명·공모금액·일정·상세 필드를 저장한다. `rag_documents`는 해당 상품에 연결된 공시 원본·정정본·외부자료의 출처와 승인 상태를 관리하고, 실제 검색 본문은 `rag_chunks`에 저장한다. 한 상품에는 여러 문서가 연결될 수 있다.

## 테이블과 목적

| 테이블 | 목적 |
|---|---|
| `offerings` | 상품 기본정보, 공모금액, 일정, 상품별 상세 JSON 저장 |
| `rag_documents` | PDF·XML·JSON 원문별 출처, 기준일, 해시, 범위와 승인 상태 관리 |
| `rag_chunks` | 문서 본문을 검색 단위로 저장하고 키워드·임베딩 검색 제공 |
| `art_auction_records` | 미술품 경매·낙찰 이력 저장 |
| `real_estate_trades` | 부동산 실거래 관측값 저장 |
| `cattle_auction_prices` | 한우 월별 경매가격·등급·표본 저장 |
| `pig_auction_prices` | 돼지 월별 경매가격·등급·지역 저장 |
| `offering_filing_facts` | DART 공시에서 추출한 구조화 사실 저장 |
| `verification_runs` | 상품 검증 실행 상태와 산출물 해시 기록 |
| `monitor_runs` | 정정공시 감시 실행 단위 기록 |
| `monitor_events` | 상품별 정정공시 발견·실패 결과 기록 |
| `ledger_observations` | 외부 원장·API 대상의 존재 여부와 관측 필드 기록 |

`runtime_public_offerings`는 테이블이 아니라 `offerings`에서 런타임 공개가 허용된 필드만 제공하는 보안 뷰다.

## 핵심 테이블 컬럼

### `offerings`

| 컬럼 | 설명 |
|---|---|
| `offer_slug` | 공개 상품 ID |
| `category_id` | `cattle`, `pig`, `art`, `real-estate` |
| `provenance` | 공개자료·수기검증·합성 구분 |
| `title_public` | 공개 상품명 |
| `amount_won` | 공모금액 |
| `opens_on`, `closes_on` | 모집 시작·종료일 |
| `detail` | 상품별 구조화 상세 JSON |
| `source_meta` | 출처 URL·수집 방법·해시 등 |

### `rag_documents`

| 컬럼 묶음 | 컬럼 | 설명 |
|---|---|---|
| 식별 | `source_id`, `canonical_document_id`, `title` | DB 적재 자연키, corpus의 정식 문서 ID, 제목 |
| 범위 | `scope_kind`, `category_id`, `product_id`, `scenario_id`, `data_nature` | 일반지식 또는 정확한 상품 범위 |
| 출처 | `source_kind`, `source_url`, `as_of`, `source_hash` | 자료 성격, 공개 URL, 기준일, 원문 SHA-256 |
| 승인 | `approved_for_public`, `approved_for_external_ai`, `pii_review_status`, `status` | 공개·외부 AI 전송·PII 검토·처리 상태 |
| 운영 | `ingest_owner`, `limitations`, `scope_key`, `created_at` | 적재 소유자, 한계, 범위 무결성, 생성 시각 |

### `rag_chunks`

`rag_documents`의 범위·출처·승인 컬럼을 함께 보존하고 다음 검색 컬럼이 추가된다.

| 컬럼 | 설명 |
|---|---|
| `document_id` | 소속 `rag_documents.id` |
| `canonical_chunk_id` | corpus의 정식 청크 ID |
| `chunk_index` | 문서 내 청크 순서 |
| `content` | 검색과 답변에 사용하는 본문 |
| `canonical_text` | 정규화된 원문 |
| `page` | PDF 페이지 또는 XML 논리 섹션 |
| `chunk_hash` | 청크 SHA-256 |
| `embedding` | `text-embedding-3-small`용 1,536차원 벡터 |
| `tsv` | PostgreSQL 키워드 검색용 자동 생성 벡터 |

문서와 청크에 범위·승인 컬럼이 일부 중복되는 것은 의도적 비정규화다. 검색 시 상품 범위를 빠르게 제한하고, RLS가 승인되지 않은 청크를 직접 차단하며, 문서와 청크의 범위가 달라지는 오류를 복합 외래키로 막는다.

## 인덱스와 접근 제어

- `rag_chunks_embedding_hnsw`: 코사인 유사도 기반 pgvector 검색
- `rag_chunks_tsv_gin`: PostgreSQL 키워드 검색
- 상품 범위 인덱스: `category_id + product_id + data_nature + scenario_id`
- RLS: 공개 승인, PII 검토 통과, 준비 상태인 문서·청크만 런타임 조회 허용
- `DATABASE_URL`: 제한된 런타임 역할
- `DATABASE_URL_DIRECT`: migration·seed·ingest 전용 관리자 역할

## 구축 순서

1. `DATABASE_URL_DIRECT`로 `npm run db:migrate`를 실행해 구조를 만든다.
2. `db/roles.sql`로 제한 런타임 역할을 만든다.
3. 상품·외부 관측 데이터를 seed/ingest한다.
4. 문서와 청크를 `rag_documents`, `rag_chunks`에 적재한다.
5. `npm run db:embedding:sync -- --check`로 로컬 임베딩과 canonical corpus가 일치하는지 검사한다.
6. `npm run db:embedding:sync`로 청크 임베딩을 `rag_chunks.embedding`에 저장한다.
7. DB repository의 pgvector 검색과 로컬 SQLite 결과를 비교한다.
8. `DATABASE_URL`에는 제한 역할 접속 문자열만 배포한다.

접속 문자열 형식:

```env
DATABASE_URL=postgresql://runtime_user:password@endpoint:5432/database_name?sslmode=require
DATABASE_URL_DIRECT=postgresql://admin_user:password@endpoint:5432/database_name?sslmode=require
```

비밀번호는 문서·Git·메신저에 기록하지 않고 로컬 `.env` 또는 배포 환경변수에만 저장한다.

## 코드 위치

- 스키마: `src/lib/db/schema.ts`
- 마이그레이션: `db/migrations/`
- 런타임 역할: `db/roles.sql`
- 상품·문서 적재: `src/lib/db/ingest/`
- DB repository: `src/lib/db/repositories/`
