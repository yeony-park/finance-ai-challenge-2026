# 공통 명세 08(API 계약)·09(스택·저장 계층) 초안 (2026-08-23, 커밋 예정)

## 커밋 전 3관점 리뷰 반영 + DB 호스팅 Supabase 확정 (2026-08-29)

**결정과 근거** — 미커밋 초안(08·09·본 워크로그·CLAUDE.md/00 수정분)에 3관점 병렬 리뷰(DB
설계·정합성·보안)를 실행하고 CRITICAL 3건·HIGH 전건·정합성 정정을 문서에 반영했다. 주요 반영:
① DDL 보강 — provenance CHECK 2곳 추가(re_trades·rag_documents), 멱등 시드용 자연키/UNIQUE
신설(rag_documents.source_id UNIQUE·art external_ref·re_trades 복합 자연키), category_id
CHECK, FK ON DELETE CASCADE, created_at 통일, 형식 CHECK(lawd_cd·deal_ym·기간 순서).
② 보안 게이트의 기계 강제 지점 신설 — db:seed 로컬 전용 경로 원천 즉시 실패(R-STO-03a),
synthetic `예시 ` 프리픽스 Zod 강제+블록리스트 대조(R-STO-07a), 자격증명 역할 분리
(R-STO-16, 런타임=rag SELECT 전용), 파라미터 바인딩 의무(R-STO-09a, 접근 계층 선택 무관),
RAG 프롬프트 격리+적재 인젝션 스캔(R-STO-17·18), /api/search query 500자 상한.
③ 정합성 정정 — Zod 의무의 소급 미적용 명시(현행 3종은 allowlist뿐 — validation_error는
예약 코드), RAG 인용 범위를 "코퍼스 등록분만"으로 단일화(08↔R-STO-12 드리프트 해소),
LiveVerifyError 단일 진실 포인터를 revalidate.ts로 정정, 환경 변수 표를 .env.example
전 변수로 확장, 임베딩 근거 정정("스파인 동일 제공자"→"claim 추출 프로덕션 경로 동일").
④ 한국어 검색 리스크 명문화 — tsvector 'simple'은 형태소 미지원, fake 모드 검색 품질
직결이므로 pg_trgm 병행/사전 토큰화를 [팀 결정 대기]로 항목화, websearch_to_tsquery 의무.
⑤ **DB 호스팅 오너 확정 = Supabase** (Neon 기본값 대체). 실측 비교: Neon(자동 기상) vs
Supabase(7일 무활동 일시정지·수동 복구, 대신 팀 대시보드 가시성) vs Oracle Always Free
(관리형 Postgres 없음·idle 회수 — 탈락). 채택 사유는 대시보드 + 챗 개통 후 대화 로그
저장으로 상시 활동 예상. 드라이버는 @neondatabase/serverless → postgres-js로 교체,
Supavisor 풀러(6543)/직결(5432) 2종 연결 문자열 분리.

**트레이드오프** — (a) Supabase 채택으로 일시정지 리스크를 수용: 챗 개통 전 구간은 cron
DB ping으로 방어(명세에 없던 keep-alive 장치 1개 추가 비용). 자동 기상(Neon)을 포기하고
팀 가시성을 샀다. (b) DDL에 CHECK·UNIQUE를 늘려 시드 유연성이 줄었다 — 정직 규약(3값
외 거부·멱등)이 유연성보다 우선. (c) 기계 게이트 조항(R-STO-03a·07a·16~18)은 구현 비용을
선불로 늘리지만, "선언만 있고 게이트 없음"이 리뷰가 지목한 최대 구조 리스크였다.

**검증 영향** — 09 §6 계약 테스트 4종→6종(프리픽스 강제·원천 경로 가드 추가). 배포 전
"db:export 익명화 게이트 그린" 체크를 CLAUDE.md 배포 절에 연동하기로 예약(DB 도입 PR).
챗 게이트 다턴 레드팀에 "RAG 소스 내 인젝션" 시나리오 의무 추가.

**알려진 한계** — drizzle의 vector·generated column·HNSW 지원 범위는 미검증(spike 선행
조항만 존재). pg_trgm의 Supabase 지원과 한국어 정확도 비교도 spike 대기. re_trades 복합
자연키는 근사치(공식 거래 id 확보 시 교체). 현행 3종 라우트의 Zod 소급·health no-store는
후속 과제로 남김. 대화 로그 DB 저장 테이블(30일 TTL)은 챗 개통 결정 시 별도 정의.


## 명세 08·09 신설 — API 계약과 Postgres 더미 원장·RAG 정의 (2026-08-23)

**결정과 근거** — 팀 작업 일정성을 위해 API 계약(`docs/spec/08-api-contract.md`)과 기술
스택·저장 계층(`docs/spec/09-stack-and-storage.md`)을 v1-draft로 신설했다. 핵심 결정 3개:
① API는 예외 경로 3분류(라이브 재대조·운영 자동화·AI 표면)로 한정하고 화면 내부 소비용
REST를 만들지 않는다 — "화면은 캐시만 읽는다"(00 결정 8)의 API 층 투영. ② 부동산·미술품은
크롤링 금지(05 신호등)로 데이터가 막히므로 Postgres(Neon+pgvector)를 **더미·참조 데이터
원장 + RAG 코퍼스** 용도로만 신설하고, 화면 데이터는 `db:export`가 마스킹 게이트를 거쳐
`data/public/`으로 내보낸다. ③ 성공 응답은 봉투 없이 도메인 바디, 에러는 `{error, message}`
고정 — 현행 `LiveVerifyBody`/`LiveVerifyError` 실구현을 실측 원전으로 삼았다.

**트레이드오프** — (a) ecc 공통 규칙의 "API 응답 봉투" 권고 대신 현행 무봉투를 표준화:
기존 구현 3종과의 일관성 > 신규 규칙 순수성. 이후 외부 공개 시 /api/v1 승격으로 흡수.
(b) DB를 렌더 경로에 못 쓰게 막아 DB 도입 효용이 줄지만, URL 무중단 요건과 fake 완주
원칙(키·DB 없이 빌드·테스트 그린)을 지켰다. (c) synthetic 근거로는 판정을 산출하지
않기로 해 더미 데이터 시연의 화려함을 포기 — 정직 원칙(근거 0건 판정 금지)과 정합.

**검증 영향** — 09 §6에 계약 테스트 4종을 예약: provenance 3값 강제, synthetic 판정
거부, RAG source_id 코퍼스 정합, DATABASE_URL 부재 완주. `db:export` 산출물은 기존
익명화 게이트 대상에 자동 포함. 08 §5에 신규 엔드포인트 PR 체크 6항목 명기.

**알려진 한계** — 두 문서 모두 v1-draft로 팀 결정 대기 항목이 있다(호스팅 Neon vs
Supabase, drizzle vs 직 SQL, 임베딩 모델, 더미 규모). DB·RAG는 코드 미착수 상태의
계약 선행이라 drizzle 스키마가 생기기 전까지 DDL 초안이 임시 단일 진실이다. `/api/search`
는 06의 4게이트(레드팀·전역 한도·킬스위치·강등 리허설) 통과 전 공개 불가 — 형태 계약만
존재한다.

## contracts/ 신설 — AI 집행 계약 층 분리 (2026-08-23)

**결정과 근거** — `docs/spec/`(근거·서사)과 별개로, AI 세션이 코드 작성 직전 읽는 집행
전용 층 `contracts/`를 신설했다: `README.md`(진입점 — 우선순위·작업 유형별 로딩 표),
`invariants.md`(R-INV-01~16, 전 작업 공통), `api.md`(R-API-01~13), `storage.md`
(R-STO-01~15). 규칙마다 안정 ID를 부여해 PR·리뷰에서 인용 가능하게 했고, frontmatter의
`read-when`·`source-of-truth`로 선택적 로딩과 코드 우선 원칙을 기계가 판별할 수 있게
했다. CLAUDE.md 프로젝트 규칙 첫 항목으로 선독 의무를 배선했다.

**트레이드오프** — spec과 contracts의 2중 유지 비용 발생: 같은 규칙이 두 곳에 존재한다.
대신 우선순위 명문화(코드 > contracts > spec)와 "충돌 발견 시 같은 PR에서 정정 제안"
규칙으로 드리프트를 발견-즉시-수리 구조로 흡수했다. 01-category-contract는 증류하지
않고 원문 필독으로 남겼다 — 착수 가이드는 산문 맥락이 손실되면 오히려 위험.

**검증 영향** — 규칙 ID 도입으로 PR 본문의 준수 명기(R-API PR 체크 6항목 등)가 리뷰
가능한 형식이 됐다. 기계 검증은 아직 없음 — 계약 테스트(09 §6)가 구현되면 R-STO-05·12
등이 테스트로 물질화된다.

**알려진 한계** — contracts는 사람 승인 없이 규칙을 늘리기 쉬운 위치다 — 개정은 오너
승인 + worklog 기록 의무로 묶었지만 집행 장치는 리뷰뿐. Codex 등 타 도구 세션은
CLAUDE.md를 읽지 않으므로 AGENTS.md 배선이 비어 있다(next dev 자동 재생성 파일이라
수정 보류 — 별도 진입점 필요 시 팀 결정).
