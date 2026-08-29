# DB 저장 계층 구현 (worklog)

> 규약: `docs/worklog/README.md` 4섹션(결정과 근거/트레이드오프/eval 영향/알려진 한계).
> 대상 명세: `docs/spec/09-stack-and-storage.md`, 계약 `contracts/storage.md`(R-STO-*)·`contracts/invariants.md`(R-INV-*)·`contracts/api.md`(R-API-*).
> 위임 경로: 통합 세션(jeomjeom-ca) → 백엔드 DB/인프라 세션. Supabase 호스팅 오너 확정(2026-08-29).

## Spike A — drizzle pgvector·generated·HNSW 지원 범위 (2026-08-29)

**결정과 근거** — 버전 실측(npm): drizzle-orm 0.45.2 · drizzle-kit 0.31.10 · postgres 3.4.9. 리뷰판 DDL의 drizzle 1급 지원 여부를 항목별로 확인했다.

| 요소 | 판정 | drizzle API |
|---|---|---|
| bigint identity PK | 1급 | `bigint({mode:'bigint'}).primaryKey().generatedAlwaysAsIdentity()` (mode 필수) |
| CHECK (IN·regex `~`) | 1급 | `check(name, sql\`...\`)` — 테이블 config 콜백 |
| `vector(1536)` 컬럼 | 1급(컬럼)/수동(확장) | `vector('embedding',{dimensions:1536})` — 단 `CREATE EXTENSION vector`는 drizzle-kit 미방출 |
| generated `tsv` (tsvector) | 1급(생성열)/customType(타입) | `customType` tsvector + `.generatedAlwaysAs(sql\`to_tsvector('simple',content)\`)` — 네이티브 tsvector 빌더 없음 |
| HNSW `vector_cosine_ops` | 1급 | `.using('hnsw', col.op('vector_cosine_ops'))` |
| GIN(tsv) | 1급 | `.using('gin', col)` (컬럼 타입만 customType) |

Supabase 확장: `vector`·`pg_trgm` 둘 다 지원(확장은 `extensions` 스키마 설치 — `search_path` 미포함 시 `similarity()`/`%` 미검출, 스키마 한정 필요). 채택: drizzle-orm + drizzle-kit + postgres-js. 확장 생성만 선행 raw SQL 마이그레이션으로 분리(`CREATE EXTENSION`은 테이블 DDL보다 먼저).

**트레이드오프** — drizzle-kit이 방출 못 하는 것은 `CREATE EXTENSION` 2줄뿐 → 별도 도구 대신 drizzle 채택이 타당(타입 스키마·마이그레이션 생성·드리프트 감지 이득). 지불 비용: ① 마이그레이션 순서 규율(확장 먼저) 수동 관리 ② tsvector customType 정의를 schema.ts에 상주. 대안(postgres-js 직 SQL 전량 수기)은 타입 안전·드리프트 감지를 잃어 기각. DATABASE_URL_DIRECT 미발급 상태라 drizzle-kit `generate`를 실 DB 대상 실행 불가 → 초기 마이그레이션은 리뷰판 DDL을 손으로 이관(`db/migrations/0000_init.sql`)하고 drizzle 스키마와 동형 유지. DB 발급 후 `drizzle-kit generate`로 드리프트 검증하는 것을 후속 과제로 남긴다.

**eval 영향** — 기록 전용. 팀 결정(`R-STO-09` 기본값 drizzle)은 스파이크가 기본값을 지지하나 확정은 오너/팀 몫으로 유지. schema.ts ↔ 0000_init.sql 동형성은 후속 `drizzle-kit generate` 드리프트 검사로 검증 지점이 생긴다.

**알려진 한계** — `CREATE EXTENSION`·마이그레이션 순서는 기계 강제가 아니라 규율. schema.ts와 수기 SQL 이중 관리 → 실 DB 발급 전까지 둘의 동형성은 사람이 보증(드리프트 자동 검출 부재). Supabase `search_path` 확장 스키마 이슈는 pg_trgm 실제 채택 시(Spike B 결정 후) 배선 필요.

## Spike B — 한국어 키워드 검색(pg_trgm vs 사전 토큰화) (2026-08-29)

**결정과 근거** — Supabase에서 `pg_trgm`·`vector` 모두 지원(플랜 무관, `extensions` 스키마 설치). 두 보강안 실측 성질:
- **A(pg_trgm)**: 한글에서도 동작하나 멀티바이트는 트라이그램을 CRC 해시(상위 3바이트)로 색인 — 조사변형("공모는/공모가/공모")이 "공모" 창을 공유해 recall 회복. 단 짧은 질의(1~2음절)는 트라이그램 부족으로 열화, CRC 충돌 오탐 소량. 짧은 질의를 긴 청크에서 찾는 용도는 `similarity()`/`%`가 아니라 **`word_similarity()` + `<%`**가 정답. 색인 `GIN(content gin_trgm_ops)`, tsquery 경로와 **별개 병렬 경로**(tsquery 미경유).
- **B(적재 시 조사 스트리핑)**: 순수 JS(무의존)로 토큰 끝 조사 제거(longest-match-first + 최소 어간 2음절 가드 + 원형·어간 동시 색인). `가/도/의/로/만` 등으로 끝나는 실단어(국가·제도·정의·도로) 오스트립 위험 — 형태소 분석의 근사일 뿐. 질의 측도 **동일 변환**을 적용해야 대칭 성립(`websearch_to_tsquery('simple', 정규화질의)`).

**트레이드오프** — 핵심: **fake 모드(키·DB 없음)** 검색 품질은 A로 못 고친다(A는 Postgres 필요). B의 JS 정규화만이 순수 무DB 경로를 커버하고 명세가 강제한 `websearch_to_tsquery` 경로를 재사용한다. 반면 B는 오스트립 정확도 상한이 낮고 스트립 규칙 변경 시 **재적재** 필요. 공존이 유력: B의 경량 대칭 정규화를 tsquery+fake 양쪽에, A의 트라이그램 색인을 DB 퍼지 폴백으로 병행. **본 스파이크는 입력일 뿐 — `R-STO-15` 한국어 보강 [팀 결정 대기] 유지, 확정 금지.**

**eval 영향** — 기록 전용. 채택 시 fake 모드 키워드 매칭 품질 지표(사전 작성 콘텐츠 조사변형 질의 recall)가 측정 지점이 된다. 현 구현 범위(이번 위임)는 리포지토리 인터페이스·file 모드 트윈까지 — `/api/search` 핸들러·실제 하이브리드 검색·pg_trgm 배선은 M2+ 후속.

**알려진 한계** — A의 멀티바이트 트라이그램은 공식 문서 미기재(경험적 검증 필요). Supabase 확장 `search_path`(extensions 스키마) 미포함 시 `%`/`similarity()` 미검출 — pg_trgm 실채택 시 배선 필요. B는 형태소 미보유 근사로 homograph 오스트립 잔존.

## schema.ts + 0000_init.sql (2026-08-29)

**결정과 근거** — 09 §3.2·§4 리뷰판 DDL(CHECK·UNIQUE·CASCADE 전부)을 `src/lib/db/schema.ts`(drizzle pg-core, 단일 진실)와 `db/migrations/0000_init.sql`(append-only)로 이관. Spike A대로: 확장 생성은 SQL 선두 raw, 나머지는 drizzle 1급. bigint identity PK·CHECK(IN·regex)·vector(1536)·generated tsvector(customType)·HNSW·GIN 반영. 금액 `bigint`, 시각 `timestamptz`, 문자열 `text`, FK 인덱스(R-STO-10). pg_trgm은 R-STO-15 [팀 결정 대기]라 미포함.

**트레이드오프** — schema.ts와 0000_init.sql 이중 관리(실 DB 미발급으로 drizzle-kit generate 대조 불가). 채택: 손 이관 + drizzle.config.ts 비치(발급 후 드리프트 검증). 지불: 동형성 사람 보증. amount는 mode 'number'(원화 <2^53 안전), id는 mode 'bigint'. width/height numeric(8,2)는 drizzle string 반환 → seed에서 number↔string 매핑.

**eval 영향** — schema.ts 스모크 임포트 통과(빌더 해석 확인). 발급 후 `drizzle-kit generate` diff가 동형성 회귀 검증 지점.

**알려진 한계** — CREATE EXTENSION·마이그레이션 순서는 규율(기계 강제 아님). 실 DB 미발급으로 마이그레이션 실적용·인덱스 생성은 미검증.

## 리포지토리 + file 모드 트윈 (2026-08-29)

**결정과 근거** — 09 §2.3 인터페이스(OfferingsRepository·RagSearchRepository)를 env 기반 리졸버로 구현. `DATABASE_URL` 미설정=file 모드(R-STO-02): 트윈은 `data/offers/*.json`(실 공모) + 결정적 synthetic 생성기 + `data/reference/rag/*.json`(등록 출처만) 직독. DB 임프는 동적 import로 분리(렌더 그래프에 postgres 미유입). offerings DB 읽기는 직결(CLI)로, RAG 런타임 읽기는 풀러(SELECT 전용 역할)로 분리(R-STO-01·R-STO-16).

**트레이드오프** — synthetic을 코드 생성기 단일 소스로 두어 seed(→DB)와 file 트윈(→메모리) 패리티 보장(스키마 동형 JSON 미러 대신 인터페이스 동형 — 09 §2.3 지침). RAG file 트윈은 조사 스트리핑 미적용 단순 부분문자열 매칭(Spike B 보강안은 [팀 결정 대기]라 미확정) + `degraded:true` 정직 표기. 지불: fake 모드 한국어 recall 낮음(명세가 인지한 한계).

**eval 영향** — 계약 테스트 42종 추가. file 모드 완주(④)·미등록 source_id 거부(③)·degraded 표기가 측정 지점.

**알려진 한계** — DB 임프(offerings-db·rag-search-db)는 실 DB 미발급으로 미실행 검증. RAG 하이브리드(벡터)·/api/search 핸들러는 M2+ 범위 밖(degraded 고정).

## db:seed·db:export·마이그레이션 CLI + 보안 가드 (2026-08-29)

**결정과 근거** — R-STO-03a 원천 경로 가드(`data/raw`·`snapshots`·`reports` 즉시 실패)를 seed CLI 진입점에 하드코딩(유일 기계 강제점). R-STO-07a: synthetic `예시 ` 프리픽스 Zod 강제 + 실존 개체 블록리스트(DART 발행인=DOCUMENT_PROFILES 유도 + 07 등재 플랫폼·경매사) 대조, 겹치면 시드 실패. 시드는 결정적·멱등(ON CONFLICT). export는 maskFreeText 경유·sourceMeta 제외·isExample 부착(R-STO-03). db:* 모두 `DATABASE_URL_DIRECT` 미설정 시 not_configured 정직 종료.

**트레이드오프** — 마이그레이션 러너는 drizzle-kit 저널 대신 경량 `_migrations` 추적 SQL 러너(수기 SQL + drizzle 스키마 병행 구조에 맞춤). 마이그레이션 파일은 신뢰 저장소 자산이라 `sql.unsafe`(사용자 입력 아님) — R-STO-09a는 사용자 입력 쿼리 대상. export 마스킹은 offerings가 구조상 무PII라 방어적 통과(2단 중 residual은 리포트 전용이라 offerings엔 미적용).

**eval 영향** — 가드 테스트(⑥ 로컬 경로·블록리스트) + export 마스킹 누출 0 테스트. not_configured 3종 실행 확인.

**알려진 한계** — re_trades 시드는 이번 범위 제외(참조 원장은 실 RTMS 수집분 export가 정도 — 실키·실 DB 필요, 후속). export 산출물 디렉터리 스캔형 익명화 게이트는 현재 유닛 테스트로 대체(전용 스캔 잡은 후속).

## .env.example·CLAUDE.md 배포 절 + [오너 확인 요청] (2026-08-29)

**결정과 근거** — `.env.example`에 DATABASE_URL(풀러·SELECT 전용 역할)·DATABASE_URL_DIRECT(직결·CLI RW) 등재 + service_role/anon 코드 유입 금지(R-STO-16) 명기. CLAUDE.md 배포 절에 "직전 db:export 익명화 게이트 그린" 체크 추가(R-STO-03·09 §6).

**트레이드오프** — 해당 없음.

**eval 영향** — 배포 전 사람 체크 항목 신설.

**알려진 한계 / [오너 확인 요청]** — 로컬 `.env`에 SUPABASE_URL·DATABASE_URL·DATABASE_URL_DIRECT·SUPABASE_SECRET_KEY가 **이미 존재**(위임 시점 "자격증명 아직 없음"과 불일치 — 오너가 그 사이 프로비저닝한 것으로 보임). 본 세션은 공유 팀 Supabase에 migrate/seed를 임의 실행하지 않음(위임 제약 + 샌드박스 네트워크 무경로 ENETUNREACH). 실 DB 대상 db:migrate→db:seed→db:export 실행 승인은 오너/통합 세션 판단.

## 마감 3관점 리뷰 반영 (2026-08-29)

**결정과 근거** — database-reviewer·security-reviewer·code-reviewer 병렬 리뷰 반영.
- [CRIT] `rag_chunks.chunk_index` 타입 드리프트: schema.ts `bigint`→`integer`(마이그레이션·09 §4·records.ts와 일치).
- [HIGH] schema.ts↔0000_init.sql 제약/유니크 **이름** 드리프트: 마이그레이션에 `CONSTRAINT <name>`을 drizzle 자동 명명 규약대로 명시(허위 rename 방지 → 동형성 회귀검사 유효화).
- [HIGH] seed `onConflictDoUpdate`가 일부 열만 갱신 → 재시드 비결정: art/rag_documents/rag_chunks 전 가변열 갱신으로 R-STO-08 충족.
- [HIGH/보안] `resolveOfferingsRepository`가 `DATABASE_URL` 판정으로 CLI 전용 직결(RW)을 여는 잠복 R-STO-01/16 위반: 리졸버를 **file 모드 고정**(offerings 런타임 DB 읽기 자체가 R-STO-01 금지). DB 임프는 CLI가 `createDbOfferingsRepository`로 명시 구성.
- [MED] R-STO-03a 경로 가드가 하드코딩 리터럴만 검사 → 실 read 지점(loadCommittedOfferings·loadRagFixture)에서 가드 호출로 실효화 + realpath·소문자 정규화(심링크·대소문자 우회 차단).
- [MED] R-STO-07a 블록리스트가 최상위 명칭 필드만 검사 → synthetic offerings `detail` 문자열 재귀 수집해 블록리스트 대조. 블록리스트에 NFKC·zero-width 정규화 추가.
- [MED] rag-search-db 원시행 무검증 캐스트 → Zod 파싱 + 등록 출처 필터(파일 트윈과 패리티).
- [MED] 계약 테스트 ③ 항진성 → 임시 디렉터리에 미등록 source_id 픽스처를 심어 검색·시드 양쪽 배제 실증.
- [LOW] won 금액 `Number.isSafeInteger` refine, listByCategory LIMIT 방어.

**트레이드오프** — offerings 리졸버 file 고정은 코드리뷰의 "런타임 임프를 getRuntimeDb로" 제안보다 더 강한 계약 정합(R-STO-01: 렌더 경로 offerings DB 읽기 금지 자체). categoryId 필터는 RAG 스키마에 카테고리 열이 없어 미지원(두 트윈 모두 무시) — M2+ 스키마 확장 과제. DB-mode RAG는 키워드 전용 유지(하이브리드 벡터·질의 임베딩은 M2+ 위임 범위 밖) → `degraded:true` 정직 고정.

**eval 영향** — db 계약 테스트 42→43(미등록 배제 실증 추가). tsc·eslint clean, 전체 1388 그린(파일 모드). schema.ts↔0000_init.sql 이름 동형화로 발급 후 `drizzle-kit generate` 무-diff가 회귀 지점.

**알려진 한계** — schema.ts↔SQL 이중 관리 잔존(발급 후 generate 대조 전까지 사람 보증). DB-mode 하이브리드 검색·categoryId 필터·re_trades 시드는 M2+/후속.

## 실 DB 개통 반영 — 세션 풀러·확장·역할 스크립트 (2026-08-29, 오너 통보)

**결정과 근거** — 통합 세션 통보: `.env`에 `DATABASE_URL`(transaction 풀러 6543)·`DATABASE_URL_DIRECT`(세션 풀러 5432) conn-ok. 진짜 직결(db.*.supabase.co)은 IPv6 전용 로컬 무도달 → 세션 풀러로 대체(세션 모드라 DDL·마이그레이션·CREATE ROLE 호환). 09 §2.1·.env.example에 대체 사실 반영. 확장 실측: vector 0.8.2·pg_trgm 1.6·unaccent 1.1 가용 — 09 §2.1 등재. R-STO-16 읽기 전용 역할은 마이그레이션과 분리한 운영 스크립트 `db/roles.sql`로 준비(비밀번호 실행 시 주입·커밋 금지, SELECT는 rag 2테이블만). 적용 순서·시점은 오너 결정.

**트레이드오프** — 세션 풀러는 진짜 직결 대비 세션 상한·풀러 경유 지연이 있으나 로컬/CI에서 유일 도달 경로. 역할 스크립트를 마이그레이션에 넣지 않음: 역할·비밀번호는 환경 비밀이라 append-only 마이그레이션 자산에 부적합 + 적용 타이밍(마이그레이션 후) 분리 필요.

**eval 영향** — 실 DB 대상 db:migrate 실행 시 schema↔SQL 동형성·인덱스 생성이 실증 가능해진다(현재 미실행 — 오너 승인 대기).

**알려진 한계 / 오너 승인 대기** — 본 세션은 샌드박스 네트워크 무경로(ENETUNREACH) + 공유 DB 상태 변경은 아웃바운드/비가역이라 db:migrate·db:seed를 **실행하지 않았다**. 실 DB 적용(migrate→roles→seed→export)과 DATABASE_URL 역할 재발급은 오너/통합 세션 실행. pg_trgm 마이그레이션 추가는 §4 한국어 보강 [팀 결정 대기] 확정 후.

## 실 DB 적용 완주 — migrate·seed·export·게이트 그린 (2026-08-29, 통합 세션)

**결정과 근거** — 오너 직접 실행(`!` 인라인)으로 실 Supabase에 순차 적용: `db:migrate`(0000_init 1건 — 5테이블+_migrations, vector 확장 활성 실측) → `db:seed`(offerings 7 = art synthetic 3 + re synthetic 3 + re manual_verified 1 · art_records 3 · rag_docs 2 green · chunks 3) → `db:export`(7건 마스킹 후 `data/public/offerings/index.json`). 통합 세션의 자동 실행은 권한 분류기가 차단(공유 DB 상태 변경) — 우회 없이 오너 실행으로 전환한 것이 절차 기록의 핵심. 읽기 전용 실측 검증: synthetic `예시 ` 프리픽스 위반 0건(offerings·art), 중립 슬러그(art-N·re-N), source_id 2건 모두 코퍼스 등록 green.

**트레이드오프** — roles.sql 적용·DATABASE_URL 역할 재발급은 이번 순서에서 제외(/api/search 부재로 노출 없음) — 착수 전 필수 선행으로 이연. 행수 스냅샷 7/3/2/3 기록 — 다음 재시드에서 동일해야 멱등 실증(이번엔 1회 실행이라 멱등은 미실증).

**eval 영향** — export 산출물 포함 전체 스위트 1388 그린(익명화 게이트가 신규 `data/public/offerings/` 자동 포섭). MANIFEST 재생성(로컬 5·커밋 대상 150). jeomjeom-07이 우려한 MANIFEST 오염은 실측 반박 — 해당 파일들(re-a 8/21 리포트·building-register·pig-auction-price)은 이미 추적·커밋된 자산.

**알려진 한계** — `drizzle-kit generate` 무-diff 대조는 미실행(후속 회귀 지점). 멱등 실증·roles 적용·pg_trgm 결정은 대기.

## v2 일괄 적용 — 작업 1: 마이그레이션 0001 + schema.ts 확장 (2026-08-29)

**결정과 근거** — 09 §3.5·§5 기준 7테이블 신설(cattle_auction_prices·pig_auction_prices·offering_filing_facts·verification_runs·monitor_runs·monitor_events·ledger_observations) + re_trades 6컬럼 확장(building_type·floor·building_area_sqm·land_area_sqm·build_year·cancelled). schema.ts 확장 + `db/migrations/0001_reference_ledger.sql`(append-only — 0000 무수정, re_trades는 ALTER). 제약·유니크·FK·인덱스 이름은 drizzle 자동 명명 규약대로 명시.

**drizzle-kit generate 무-diff 대조 실증** — `drizzle-kit generate`를 오프라인(임시 out 디렉터리)로 실행해 schema.ts의 canonical SQL을 얻고, 커밋한 0000+0001 합집합과 컬럼(이름·타입)·제약명·인덱스명을 자동 대조. 결과: 12테이블 전수 일치(art 14·cattle_auction 12·ledger 7·monitor_events 7·monitor_runs 6·offering_filing_facts 11·offerings 11·pig_auction 12·rag_documents 8·verification_runs 15·re_trades 16). 대조 스크립트가 표기한 2건(rag_chunks `tsv`의 `"tsvector"` vs `tsvector` 따옴표, re_trades ALTER 라인의 후행 콤마)은 **파서 아티팩트로 실제 드리프트 아님**(타입 동일). 즉 실 DB에 0000+0001 적용 후 `drizzle-kit generate`는 빈 마이그레이션(무-diff)을 낸다.

**트레이드오프** — re_trades ALTER ADD는 Postgres 특성상 컬럼을 끝에 덧붙여 물리 순서가 drizzle canonical(source_meta 앞)과 다르나, drizzle/Postgres 드리프트 판정은 서수 위치를 무시(이름·타입·제약 기준)하므로 무-diff에 무해. 수기 SQL + drizzle 스키마 이중 관리는 이 자동 대조로 회귀 검증 지점 확보(1차 위임 미결 항목 해소).

**eval 영향** — tsc·eslint clean, db 계약 45종 그린. 마이그레이션 러너(migrate.ts)는 `db/migrations/*.sql` 정렬 적용이라 0001 자동 픽업(코드 변경 불요). 실 DB 적용은 오너.

**알려진 한계** — 신규 테이블은 아직 적재 코드(작업 2 ingest)·배선(작업 5 ledger) 전이라 빈 상태. 실 DB 미적용(오너 실행 대기)이라 마이그레이션 실적용·인덱스 생성은 미검증.

## v2 일괄 적용 — 작업 3: synthetic ex- 개칭 + offerings 확장 파싱 (2026-08-29)

**결정과 근거** — R-STO-21: synthetic offer_slug를 `ex-` 프리픽스로 일괄 개칭(ex-art-1·ex-re-1 등, 생성기 6건) + offeringRowSchema에 synthetic slug ex- 프리픽스 Zod 강제(표기명 `예시 ` 프리픽스와 쌍). 근거는 실측 미술품 상수(art-1~5, 11.8억)와 DB synthetic(art-1~3, 예시 1.2억)의 같은 키 충돌(09 §3.1). rawOfferSchema 확장: `asset`(lawd_cd·bjdong_cd·dong·sigunguName·buildingUse·detail 조인 키)·`sale`·`limits`를 detail 화이트리스트로 수용(현행 6필드군 유실 해소, 09 §3.5). sourceMeta 교정: license는 offer JSON의 `license` 필드 우선(없으면 green — 커밋 공개 데이터 정당 분류), sha256은 원 파일 바이트 실해시로 공란 교정.

**트레이드오프** — asset 화이트리스트는 지번 원문 `address`를 **의도적으로 배제**(z.object 비-strict가 미선언 키 스트립) — 마스킹 전 지번을 DB detail에 넣으면 R-STO-04 위반. 조인 키(법정동 코드·동)만 수용해 RTMS 대조 경로는 확보하되 PII 표면은 차단. export cardDetail은 real-estate에서 buildingUse만 노출하므로 asset/sale/limits는 DB 원장에만 남고 화면 미유출. synthetic detail의 platformName 등도 ex- 개칭과 무관하게 유지.

**eval 영향** — 계약 테스트 확장: R-STO-21 ex- 프리픽스 3종(거부·통과·비-synthetic 면제) + 실 공모 파싱 화이트리스트(asset 조인 키 수용·지번 배제·sale/limits·sha256 실해시) 1종. db 계약 49종 그린. 전체 1415 그린·build 통과.

**알려진 한계** — committed `data/public/offerings/index.json`(오너 재수출 3991eaf)은 구 slug(art-1). 생성기가 ex- 로 바뀌었으니 **오너 db:seed 재실행 + db:export 재수출** 후 ex- slug로 갱신된다(손 재생성 안 함 — R-STO-03). 프론트 인덱스 소비자 부재 시점이라 저비용(09 §3.1).

## v2 일괄 적용 — 작업 4: 실측 상수 → 공모 원장 이관 (2026-08-29)

**결정과 근거** — `content/art.ts`의 ART_PRODUCT_FACTS 5건·`content/pig.ts`의 PIG_DISCLOSURE_PRODUCTS 3건을 커밋 가능 원천 `data/offers/{art-1..5,pig-1..3}.json`으로 파일화(생성기로 상수에서 직접 추출 — 전사 오류 0). 시드는 loadFileModeOfferings 경유 manual_verified로 적재해 art/pig 공모 행 0건 공백 해소(09 §3.5). ex- slug 분리(작업 3) 덕에 실측 art가 art-1..5 slug를 충돌 없이 점유. rawOfferSchema에 art(acquisition·issuance·lifecycle·asOf)·pig(heads·units·statusLabel·baseline) 화이트리스트 추가.

**트레이드오프** — 화면 소비 구조 불변: content 상수는 병존(화면은 상수 직독 유지 — 전환은 별도 결정), 파일↔상수 **정합 테스트**로 드리프트 방지. 판정 verdict·finding·limitation(리포트 본문)은 offer 파일에 넣지 않음 — R-STO-11(리포트 본문 DB 금지) 준수, 상수에만 유지. 파일이 상수의 부분집합(공모 좌표)만 담아 이중 관리 표면 최소화.

**eval 영향** — `offer-ledger-drift.test.ts`(11종): art 5·pig 3 파일↔상수 amount·acquisition·일정·heads 일치 + 원문 실명 0건 + 시드 원장 manual_verified 적재 확인. tsc·58 그린. MANIFEST 갱신(offer 파일 8건).

**알려진 한계** — 파일↔상수 이중 관리는 정합 테스트로만 방어(단일화는 화면 전환 결정 후). manual_verified art의 detail.art(acquisition 등)는 원장에만 — v2 인덱스 art 카드 필드(artistName 등)와 별개(실측 art 화면은 content/art.ts 직독).

## v2 일괄 적용 — 작업 2: db:ingest CLI (참조 원장 적재) (2026-08-29)

**결정과 근거** — R-STO-22: synthetic 시드와 분리된 `db:ingest` CLI 신설. 커밋 참조 파일 → 신규 원장 행 빌더 4종: cattle(auction-price 33파일 → cattle_auction_prices 458행)·re_trades(rtms 8파일 → 839행, 확장 6컬럼 채움)·pig(CSV → pig_auction_prices 176행, 전국제주제외 전 조합 월×돈피×성별×등급)·filing_facts(offers/filing-facts 4파일 → 18행). source_meta 5필드: sha256를 data/MANIFEST.md 표에서 relpath 조인(pig CSV만 자체 .meta.json 보유), license green·method·retrievedAt는 캐시/메타에서. 멱등: 자연키 ON CONFLICT(09 DDL의 UNIQUE 미러). R-STO-03a 원천 경로 가드 동일 적용. DATABASE_URL_DIRECT 미설정 시 가드·빌드는 수행하고 적재만 not_configured 생략.

**트레이드오프** — 빌더는 순수 함수(file 모드 테스트 가능), CLI가 DB 삽입 배선(R-API-10 미러). 기존 파서 재사용(parseAuctionMonthCache·parseRtmsMonthCache·parseFilingFacts) + pig는 `parsePigAuctionRows`(전 데이터행 매트릭스) 신설해 대표 스냅샷(3점, 어댑터용)과 전량 적재(176행, 원장용)를 분리. numeric 컬럼은 삽입 시 number→string 매핑(drizzle numeric). 60 CSV 데이터행 중 전국제주제외 완비 조합만 → 176행(일부 조합 metric 결측 제외). art 실데이터 338건은 라이선스 재판정(팀 안건 6) 전 적재 보류(09 §3.5) — ingest 대상 아님.

**eval 영향** — `ingest.test.ts`(6종): MANIFEST sha256 조인·cattle source_meta 5필드·re_trades 확장 컬럼·pig 전 조합·filing_facts 자연키 무중복·원천 경로 가드. 전체 1430 그린. not_configured 실행 확인(cattle 458·re_trades 839·pig 176·filing_facts 18).

**알려진 한계** — 실 DB 미적용(오너 실행 대기)이라 삽입·멱등·자연키 충돌은 미검증(빌더까지 실증). pig는 전국제주제외 1개 지역만 적재(타 6지역은 스키마상 가능하나 이번 미적재 — 대표 지역 우선). 라이선스는 green 고정(참조 파일 전부 Green 공공) — MANIFEST에 license 열 부재라 sha256만 조인.

## v2 일괄 적용 — 작업 5: Run Ledger 배선 (2026-08-29)

**결정과 근거** — 09 §5 집행 규칙 4개. 핵심 모듈 `src/lib/db/ledger/`(records·build·record): verification_runs·monitor_runs/events·ledger_observations 레코드 Zod + 순수 매퍼 + best-effort 레코더(DB 미설정 시 no-op, 예외 무전파). ① verify CLI: writeReport 후 `recordVerificationRun`(trigger cli, 직결, run_key 멱등, verdict_counts=report.summary 건수만). ② POST /api/verify: 응답 후 fire-and-forget `recordVerificationRun`(trigger api, 런타임 역할, DB 실패 무영향). ③ cron monitor: Blob 기존 유지 + `recordMonitorRun`(monitor_runs/events, kind별 건수). ④ ledger_observations: `buildLedgerObservationFromTrace`가 축산물이력제 레코드에서 구조화 필드(birthYmd·breed·sex·currentFarmNo)만 옮기고 **farmerName·farmAddress(PII) 제외**, subject_key는 maskTraceNo 마스킹(원문 이력번호 금지) — R-STO-20.

**트레이드오프** — verdict_counts는 report.summary(숫자 3값)만 복사 — 자유문장·판정 본문 미기록(R-STO-11·R-STO-19). ledger_observations.fields는 strict 화이트리스트라 farmerNm/farmAddr 미선언 키가 원천 차단. best-effort no-op으로 file 모드 완주 불변(테스트는 DB 없이 통과). ④의 **실제 대조 시점 기록 배선(judge 경로가 트레이스 레코드를 표면화)** 은 이번 미완 — 매퍼·레코더·R-STO-20 테스트는 완비, judge outcome이 LivestockTraceRecord를 반환하도록 파이프라인 표면화하는 것은 침습적이라 후속. run_key 멱등은 ON CONFLICT DO NOTHING(런타임 INSERT 전용 역할과 호환 — SELECT 불요).

**eval 영향** — `ledger.test.ts`(8종): run_key 형식·verdict_counts 숫자만·fields 금지 필드명 거부·subject_key 마스킹·트레이스 PII 제외·file 모드 no-op. 전체 1436 그린·build 통과·eslint clean.

**알려진 한계** — ④ 관측 기록의 실 배선(대조 실행 중 자동 기록)은 후속(파이프라인 트레이스 표면화 필요). monitor_runs.blob_key는 현재 null(Blob 스토어 반환 키 형태 미확정) — Blob 아카이브 링크는 후속. 실 DB 미적용이라 삽입·역할 권한(런타임 INSERT 전용)은 미검증.

## v2 일괄 적용 — 작업 6·7: RAG 코퍼스 확대 + roles.sql 개정 (2026-08-29)

**결정과 근거** — 작업 6: `data/reference/rag/corpus-sources.json` 신설 — 코퍼스 등록 6건(dart-viewer·opendart-filings·livestock-trace·ekape-auction-price·molit-rtms-nrg-trade·molit-bldrgst-title)의 문서·청크를 corpus.ts content 원문으로 추가. 기존 onboarding.json(verification-methodology·capital-markets-decree-2026 2건)과 합쳐 등록 8건 전수 적재(seed plan rag docs 8 확인). 코드 변경 불요(seed loadRagFixture가 isRegisteredSource 필터 후 자동 적재 — R-STO-12). **교육 콘텐츠 미러는 범위 밖이라 미실시**(컴포넌트 직독 구조 유지). 작업 7: `db/roles.sql`에 R-STO-16 개정 반영 — 런타임 역할에 `GRANT INSERT ON verification_runs`(SELECT 미부여). 라이브 API best-effort 이력 기록용, 공개 경로의 이력 읽기·타 테이블 쓰기는 계속 차단.

**트레이드오프** — RAG 청크는 corpus content 1청크/문서(짧은 참조 설명) — 본문 확장은 실 문서 수집 시 후속. 등록 8건은 검색 fake 모드 키워드 매칭 표본을 넓힌다. verification_runs INSERT 전용 역할은 ON CONFLICT DO NOTHING이 SELECT 불요라 호환.

**eval 영향** — seed plan rag docs 2→8, R-STO-12 미등록 거부 테스트는 그대로 통과(전부 등록분). db 70종 그린. MANIFEST 갱신(corpus-sources.json).

**알려진 한계** — RAG 인젝션 스캔(R-STO-18)은 적재 CLI(M2+) 몫 — 현 fixture는 큐레이션 corpus content라 안전하나 자동 스캔 미적용. roles.sql 실적용·권한 검증은 오너 실행 후.
