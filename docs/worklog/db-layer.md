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
