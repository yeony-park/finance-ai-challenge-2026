# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> 위 `@AGENTS.md`는 `next dev`가 자동 재생성하는 Next.js 버전 안내 블록이다. 제거하지 말 것.

## 프로젝트

2026 금융 AI Challenge(마감 9/7 10:00) 참가작 — 조각투자 공시 대조 검증 서비스.
발행사가 DART에 공시한 내용(증권신고서)을 공공 원장(축산물이력제·국토부 실거래가·축평원 경락가)과
대조해 실재성·가격 적정성·이행을 판정한다. LLM의 역할은 비정형 신고서에서 검증 가능한
claim을 추출하는 것으로 한정된다. 현황·계획: `README.md`, `docs/planning/페이즈-계획.md`.
팀 통합 공통 명세(카테고리 계약·어휘·표현 규칙·데이터 정책): `docs/spec/00-overview.md` (v1-draft).

## 명령어

```bash
npm run dev          # 개발 서버 — API 키 없이 fake 모드로 전체 동작
npm test             # vitest run (src/**/*.test.ts, node 환경)
npm test -- judge    # 단일 파일/패턴 실행 (vitest 필터)
npm run lint         # eslint
npm run build        # next build — 로컬 전용 데이터 없어도 통과해야 함
npm run redteam      # 자체 레드팀 → docs/redteam/report.md
npm run verify       # 검증 파이프라인 완주 (fake 모드, 키 불필요)
```

실키 스크립트(`--env-file-if-exists=.env`로 로컬 `.env` 사용):

```bash
npm run verify:live                    # 실키 라이브 재대조
npm run verify:collect -- <rcpNo>      # DART 원문 수집 → data/raw/ (로컬 전용)
npm run replay:actual                  # 실제 정정 계보 리플레이 재생성
npm run reference:collect              # 경락가 월 집계 (일 1,000건 한도 — 캐시 전제)
npm run reference:rtms                 # 국토부 실거래가 수집
npm run track-record                   # 발행사 트랙레코드 (DART 공시검색)
npm run narrative                      # LLM 눈높이 서술 생성
npm run verify:realestate              # 부동산 검증 파이프라인
npm run watch:refresh                  # 정정 감시 상태 파일 재생성 (data/public/watch/ — 커밋·재배포로 화면 반영)
npm run data:manifest                  # data/MANIFEST.md 재생성 (직접 수정 금지)
npm run goldset:prelabel               # 골드셋 선라벨 (산출물 로컬 전용 — PII)
npm run goldset:score                  # 골드셋 채점
```

DB 스크립트(`DATABASE_URL_DIRECT` 필요 — 미설정 시 not_configured 정직 종료. 실 DB 상태 변경은 오너 실행):

```bash
npm run db:migrate   # 수기 SQL 마이그레이션 적용 (자체 러너, _migrations 추적)
npm run db:ingest    # 참조 원장 적재 (커밋 파일 → 경락가·실거래·filing_facts)
npm run db:seed      # 결정적·멱등 synthetic 시드 (+ 플랜 외 synthetic prune)
npm run db:export    # DB → data/public/offerings/index.json (마스킹 게이트 경유)
```

## 아키텍처

- `src/lib/spine/` — 신뢰 스파인(주제 무관 공통 기반): 입력 스크리닝 → LLM(출처 계약 JSON)
  → 출처 강제(미등록 코퍼스면 abstain) → 출력 필터. 레드팀 러너 포함. 상세: `src/lib/spine/README.md`
- `src/lib/verify/` — 검증 엔진. 파이프라인: `dart/`(수집) → `parse/`(신고서 파싱) →
  `claims/`(LLM 추출 + 규칙 교차검증) → `adapters/`(축산물이력제·RTMS·경락가) → `judge/`(3값 판정)
  → `report/`(build → mask → public) → `narrative/`(눈높이 서술). `amend/`(정정 감시·리플레이),
  `track-record/`, `goldset/`은 부속 축. 각 CLI가 npm 스크립트의 진입점
- `src/app/` — App Router 화면(`/` 입문자 홈, `/cattle`·`/pig`·`/art`·`/real-estate`
  카테고리 착지와 각 `/products/[id]` 리포트, `/methodology`) + API
  (`/api/health`, `/api/verify/[id]`, `/api/cron/monitor` — vercel.json cron 주 2회)
- `src/lib/db/` — AWS RDS Postgres 저장 계층(ap-northeast-2, 2026-08-31 이전)(schema.ts=스키마 단일 진실, repositories/ file·DB 트윈,
  seed/·ingest/·export/·cli/, ledger/=검증 실행 이력·원장 관측). 렌더 경로 DB 조회 금지 —
  화면 데이터는 `db:export` 산출물만. 계약: `contracts/storage.md`(R-STO-*), 명세: `docs/spec/09`
- `src/lib/content/` — 홈·체크리스트 문안의 단일 진실. 신규 사용자 대면 문안은 이 모듈에 두고
  출력 필터 감사 테스트(`content/__tests__/home-copy.test.ts`)를 통과해야 한다
- **화면은 캐시만 읽는다** — 모든 수치·문구는 `data/public/{offerId}/report-*.json` 등
  사전 생성 산출물에서 파생. 외부 API를 렌더 경로에서 직접 호출하지 않는다
  (예외: `POST /api/verify/[id]` 라이브 재검증, 실패 시 mode:"snapshot" 정직 폴백)
- LLM 경계: 키 없으면 fake 클라이언트로 완주. claim 추출은 `AI_GATEWAY_API_KEY` 또는
  `OPENAI_API_KEY` 직결(현 프로덕션은 OpenAI 직결). `.env.example` 참조

## 데이터 정책 (위반 금지)

- 개인정보 포함 원천(`data/raw/`·`data/snapshots/`·`data/reports/`)은 **로컬 전용**(gitignore).
  커밋 대상은 마스킹 완료 `data/public/`, 시장 통계 `data/reference/`, `data/offers/`,
  자동 생성 `data/MANIFEST.md`뿐
- 공개 산출물 생성은 반드시 마스킹(`report/mask.ts`·`residual.ts`)을 거치고, 익명화 게이트
  테스트(브랜드·실명·주소 누출 0건)를 통과해야 한다. 공개 슬러그는 중립 id(`livestock-N`)
- fake 모드 `verify`는 `--publish` 없이는 `data/scratch-fake/`에만 쓴다 — `data/public/` 오염
  사고 2회 후 도입된 격리 가드. 우회하지 말 것

## 프로젝트 규칙

- **집행 계약 선독**: 코드·데이터 작업 전 `contracts/README.md`의 로딩 규칙을 따라 해당 계약
  파일(`invariants.md`는 항상, API 작업 시 `api.md`, DB·데이터 작업 시 `storage.md`)을 읽는다.
  규칙 ID(`R-INV-*` 등)로 준수 여부를 PR 본문에 명기한다. 아래 항목들은 계약의 요약이다
- **판정 어휘**: match="일치", mismatch="원장 불일치", unverifiable="대조 불가"("미확인"은
  unverifiable 전용). 근거 0건이면 판정하지 않는다. 성별 수→거세는 예상된 상태 전이로 match
- **UI 자기보고형 금지 (리포트 표면 한정)**: 검증 리포트·공모 목록 화면 문장의 주어는
  공모·자산이지 서비스가 아니다. 설득 서사는 `/methodology`와 기획서 담당. 홈·입문·카테고리
  표면의 서비스 서술은 `docs/spec/04-expression-rules.md`(시작 촉구·집계 점수 금지, 검증 범위
  한정, 고정 고지 세트)를 따른다
- **산문 주석 금지**: 코드 주석은 기능성 프래그마만 허용. 서브에이전트 위임 시 프롬프트에 명시
- **에이전트 위임 시 `git restore`/`git checkout` 금지** 조항 필수(미커밋 작업 파괴 사고 이력).
  CSS·시각 검증 없이 스타일 파일 대량 수정을 완료 처리하지 말 것(0바이트 module.css도 빌드는 통과)
- **worklog 병행 기록**: 판정 규칙·마스킹·공개 경로 변경과 사고는 `docs/worklog/`에
  결정·트레이드오프·검증 영향·한계 4섹션으로 기록 (규약: `docs/worklog/README.md`)
- 커밋은 conventional commits(feat/fix/data/docs/…) + 한국어 설명

## 배포

**배포 전 체크** (PR CI + 수동 배포 구조 — CI는 검증만 수행하고 배포는 사람이 실행):
- [ ] PR의 `Verify` 체크 그린 (`npm run lint`·`npx tsc --noEmit`·`npm test`·`npm run build`). PR을 거치지 않는 긴급 배포라면 같은 명령을 로컬에서 완주 (키·DB 없이 통과 — R-INV-05)
- [ ] DB에서 화면 데이터를 새로 뽑았다면, **직전 `npm run db:export` 산출물이 익명화 게이트 테스트를 그린으로 통과**했는가 (R-STO-03 — DB 유래라고 마스킹 게이트 우회 금지). export는 `DATABASE_URL_DIRECT` 전용, 미설정이면 not_configured로 정직 종료하며 화면 데이터를 만들지 않는다.

**심사 중 긴급 차단(재배포 불필요)**: Upstash 콘솔에서 KV 키 `ai:kill-switch`에 `1`을 넣으면 검색 플래너·근거 질의·Copilot live 호출이 즉시 정적 경로로 강등된다(해제는 키 삭제 또는 `0`). 전역 일일 AI 호출 예산은 `AI_DAILY_REQUEST_BUDGET`(기본 100), IP 분당 한도는 `RATE_LIMIT_MAX_REQUESTS`(10). 사이트 전체 봇 차단은 Vercel 대시보드 Firewall → Attack Challenge Mode.

Vercel CLI 수동 배포 — git 연동 없음(푸시는 배포를 트리거하지 않는다):
`npx -y vercel@58.9.2 deploy --prod --scope viowlet`
(58.9.4는 "Not authorized" 회귀. `--scope` 생략 시에도 같은 "Not authorized"로 실패한 사례 있음 — 항상 명시. 팀 슬러그는 2026-08-31 lostarkofzephyr → viowlet으로 변경 — 구 슬러그는 실패한다).
Vercel CLI는 gitignore를 무시하므로 `.vercelignore`가 PII·env 차단을 담당한다 — 수정 시 dry-run 검증.
프로덕션: https://jeom-jeom.vercel.app 단일 (구 도메인 finance-hackathon-black.vercel.app은
2026-08-23 오너 지시로 alias 제거. `jeomjeom.vercel.app`은 제3자 선점으로 사용 불가.
Standard Deployment Protection이 켜져 있어 수동 `vercel alias set`은 SSO 벽에 막힌다 — 도메인 추가는
대시보드 Settings→Domains에서만. `alias rm`은 CLI로 가능).
