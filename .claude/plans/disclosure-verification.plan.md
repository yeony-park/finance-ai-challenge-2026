# Plan: 검증 엔진 완주 (축 A) — Milestone 1

**Source PRD**: `.claude/prds/disclosure-verification.prd.md` (v1.1)
**Selected Milestone**: 1. 검증 엔진 완주 (축 A) — 뱅카우 9호 1건이 신고서 입력→3층위 판정→근거 리포트 자동 완주
**Complexity**: Large (Phase 1 전체, 8/11~8/18)

## Summary

DART에서 뱅카우 9호 증권신고서 원문을 수집·파싱하고, 검증 가능한 주장(claim)을 추출한 뒤, 축산물이력제·경락가 공공 API와 대조해 3값 판정(일치/불일치/확인 불가)과 근거 리포트를 자동 생성하는 엔진을 만든다. 기존 신뢰 스파인(`src/lib/spine`)의 fake-first·불변·근거 강제 패턴을 그대로 계승하고, 8/10 실측 스냅샷(`data/snapshots/2026-08-10-bankcow9-37head-trace.json`)을 fake 모드 픽스처와 회귀 기준으로 사용한다.

## 기술 스택·아키텍처 결정 (2026-08-11 확정 — vercel:nextjs 스킬 검토 반영)

### 확정 스택 (레포 실재 — 변경 없음)

Next.js **16.2.12**(App Router·Turbopack) · React 19.2.4 · TypeScript 5 · zod 4 · Vercel AI SDK 7(`ai`) · vitest · playwright · tsx CLI · next/font(서체 3층위) · 데모 UI는 CSS Modules(목업 v4). 배포는 Vercel(Node.js 런타임 — **Edge 사용 금지**, Fluid Compute 기본).

### 신규 결정

| 영역 | 결정 | 근거 |
|---|---|---|
| **파이프라인 배치** | `src/lib/verify`는 **런타임 무관 순수 TS**. 실행 표면 3개 — ① CLI(`tsx`, 로컬 수집·검증) ② Route Handler `/api/verify`(라이브 재검증) ③ Vercel Cron `/api/cron/monitor`(주기 감시) | spine 구조 동일 패턴. 라이브 재검증은 "External API consumption + 외부 접근 가능해야 함(심사자 검증 절차에 curl 예시 제공)" → 스킬 결정 트리상 Route Handler. UI 내부 mutation이 아니므로 Server Action 아님 |
| **화면 데이터 공급** | 리포트·목록은 **Server Component에서 스냅샷 JSON을 읽어 props로 전달**(기존 DemoApp은 클라이언트 유지). 클라이언트 fetch는 재검증 버튼 1곳(`/api/verify`)만 | 스킬 "Client Component 데이터 = Server에서 전달이 1순위". 워터폴 없음 |
| **스토리지 3계층** | ① 정적 스냅샷·경락가 월집계 = **repo `data/` 커밋**(빌드 번들) ② 런타임 신규 산출(cron이 감지한 정정·재검증 결과) = **Vercel Blob** ③ 임시 = `/tmp` | 서버리스 FS는 읽기 전용 — 런타임 `fs.write` 금지. 심사 기간 코드·데이터 프리즈와 정합(정적 우선). DB 없음 — 대상 수십 건 규모에 과설계 |
| **XML/ZIP 파싱** | `fast-xml-parser` + `fflate` (신규 의존성 2개) | 순수 JS·네이티브 바이너리 없음(서버리스 호환), DART zip→xml·이력제 XML 공용 |
| **LLM 호출** | spine 경유 `ai` v7 **`generateObject` + zod 스키마**(claim 추출 구조화 출력). 모델은 AI Gateway `"provider/model"` 문자열, fake-first 유지 | 기존 spine 계약 재사용 — 환각이 판정에 닿지 않는 구조의 구현부 |
| **크론** | **`vercel.ts` `crons`** → `/api/cron/monitor`. 뱅카우 9호 주 2회 + 정정 감지 | vercel.ts가 현행 권장 설정 방식. 페이즈 계획 8/10 갱신(주 2회 상향)과 일치 |
| **알림(인앱 1종)** | cron이 이벤트 JSON을 Blob에 적재 → UI 로드 시 표시. 외부 채널(메일·푸시) 없음 | MVP 범위 유지 |
| **캐싱** | 라이브 재검증 응답 = `no-store`(신선도가 제품 가치). 경락가 = 월 집계 사전 생성(일 1,000건 쿼터 방어). 리포트 페이지 = 정적+스냅샷 | — |
| **Next 16 유의사항** | `params`/`cookies()`는 **async**(await 필수) · `middleware`→`proxy` 개명 · `page.tsx`와 `route.ts` 동일 폴더 금지 | 스킬 명시 — 코드 작성 시 준수 |

**신규 의존성 합계 3개**: `fast-xml-parser`, `fflate`, `@vercel/blob`(S2 시점). 그 외 추가 없음 — 상태 라이브러리·차트 라이브러리·DB·ORM 불필요(규모 실측 근거).

## E2E 체인 명세 — 수집→정제→파이프라인→API→웹→배포 (2026-08-11 보강)

### 1. 데이터 레이어 (수집·정제 산출물의 물리 구조)

```
data/
├── raw/{rcpNo}/            # 수집기 산출 — DART zip 해제 원문 xml (불변, repo 커밋)
├── normalized/{offerId}/   # 정제 산출 — claims-{rcpNo}.json (버전별 claim 스키마)
├── reports/{offerId}/      # 판정 산출 — report-{ISO시각}.json (버전링 = 리플레이 원료)
├── reference/              # 법정동코드 테이블·경락가 월집계 (사전 생성)
└── snapshots/              # 외부 API 응답 스냅샷 (기존 — fake 모드·회귀 기준)
```

**정제 규칙 명세**: 단위 통일(원, 원/kg, 두수) · 날짜 ISO 변환 · 주소→법정동코드 매핑 · 이력번호 12자리 변환 · **zod 게이트 실패 = 해당 필드 "확인 불가" 강등**(파이프라인 중단 아님) · 동일 rcpNo 재실행은 멱등(같은 입력→같은 산출, 타임스탬프만 갱신).

**수집 운영**: 수집·정제·판정은 **로컬 CLI 실행 → 산출물 repo 커밋 → 배포 번들**이 기본 경로(심사 안정성). 런타임 수집은 라이브 재검증(대상 1건 온디맨드)과 cron(정정 감지)뿐 — 경락가 일 1,000건 쿼터는 사전 집계로 원천 회피.

### 2. 라우트 맵 (웹서비스 — 목업 단일 페이지가 아니라 실제 서비스 구조)

| 경로 | 종류 | 내용 |
|---|---|---|
| `/` | Page (SC) | 랜딩 + 공모 목록 — 스냅샷 로드 후 props 전달 |
| `/offers/[id]` | Page (SC+CC) | 검증 리포트 — 3초 판정→층위→근거 드릴다운 + 알림·리플레이 섹션. **심사자에게 공유 가능한 공모별 URL** |
| `/methodology` | Page (SC) | 검증 방법·데이터 출처·단정 금지 고지 — 기능명세서의 "심사자 검증 절차"와 1:1 대응 |
| `error.tsx` · `not-found.tsx` · `loading.tsx` | 특수 파일 | 에러·404·Suspense 폴백 (Next 컨벤션) |
| `GET /api/health` | RH | 기존 확장 — 데이터 스냅샷 버전·최근 대조 시각 포함 (업타임 핑 대상) |
| `GET /api/offers` · `GET /api/offers/[id]/report` | RH | 목록·리포트 JSON — 심사자 curl 검증용 |
| `POST /api/verify/[id]` | RH | 라이브 재검증 — **spine 레이트리미터 적용**, `no-store` |
| `GET /api/cron/monitor` | RH | Vercel Cron — `CRON_SECRET` Authorization 검증 |

### 3. 목업 → 실서비스 전환 계획

S0은 목업 v4에 실데이터를 바인딩한 단일 페이지(설득 데모)로 충분하지만, **제출물은 "데모 화면 목업" 캡션이 붙은 페이지여선 안 된다.** S3에서 전환: 라우트 분리(`/offers/[id]`) → 목업 캡션·데모 프레임 제거 → `generateMetadata`(공모별 타이틀) → error/loading 경계 → 320~1440 반응형·키보드 접근성 점검. 목업의 CSS Module·컴포넌트는 그대로 이관(재작성 아님).

### 4. 배포 케이던스 (변경 — S4 일괄 배포 폐기)

| 시점 | 배포 행위 |
|---|---|
| **S0.0 (8/11, 최우선)** | **Vercel 프로젝트 연결 + 첫 배포** — 현 목업 그대로. env(DART·데이터포털·AI Gateway 키, `CRON_SECRET`) 설정. 이후 **매 푸시 = 자동 배포** |
| S0 완료 (8/13) | 설득 데모를 로컬이 아니라 **배포 URL로 팀 공유** — "접속해서 눌러봐"가 설득의 형식 |
| S2 | Blob 프로비저닝 + `vercel.ts` crons 활성화 |
| S3 | 실서비스 라우트 전환 배포 — 이 시점부터 URL이 제출 후보 |
| S4 | 부하 테스트·외부 업타임 핑 연결·코드/데이터 프리즈만 수행 (배포는 이미 일상) |

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| Naming | `src/lib/spine/ops/rate-limit.ts`, `guardrail/input-screen.ts` | kebab-case 파일, 도메인 하위 디렉토리 분할 |
| 타입·불변성 | `src/lib/spine/types.ts:1-5` | 전 필드 `readonly`, 단계마다 새 객체 반환, 유니언 `kind` 분기 (`SpineAnswer` 패턴 → `Verdict`에 이식) |
| LLM 경계 | `src/lib/spine/llm/client.ts` + `ai-sdk-client.ts` | 인터페이스 분리 + fake 클라이언트(키 불필요, CI·데모 결정성) |
| 근거 불변식 | `src/lib/spine/rag/` (출처 강제 — 미등록 출처 abstain) | "근거 0건이면 판정 없음" 불변식을 판정 엔진에 동일 원리로 |
| Tests | `src/lib/spine/__tests__/*.test.ts` | vitest, `__tests__/` 동거 배치, `npm test` |
| CLI | `src/lib/spine/redteam/cli.ts` + package.json `redteam` 스크립트 | tsx 기반 CLI 러너 → `verify` 스크립트 동일 패턴 |
| 스냅샷 | `data/snapshots/2026-08-10-bankcow9-37head-trace.json` | traceNo 포맷(`002`+9자리), infoType 1/2/5/7 응답 구조가 어댑터 계약의 사실 기준 |

⚠️ Next.js 16.2 — UI·라우트 작업 전 `node_modules/next/dist/docs/` 필독 (AGENTS.md). 이 마일스톤은 `src/lib/` + CLI 중심이라 노출면 최소.

## Files to Change

| File | Action | Why |
|---|---|---|
| `src/lib/verify/types.ts` | CREATE | Claim·Evidence·Verdict(3값 유니언)·VerifyReport 공통 타입 — spine types 스타일 |
| `src/lib/verify/dart/collector.ts` | CREATE | 공시검색 C005·C010 목록 → 접수번호 → `document.xml` 취득 (7/28 기점 C010→C005 이동 처리) |
| `src/lib/verify/dart/fake-fixtures/` | CREATE | 뱅카우 9호 원문 고정본 — 키·네트워크 없이 전체 파이프라인 구동 |
| `src/lib/verify/parse/report-parser.ts` | CREATE | 원문 XML → 항목 구조 보존 텍스트화, 문서 좌표(항목·오프셋) 부여 |
| `src/lib/verify/claims/schema.ts` | CREATE | claim 스키마 v1 — 이력번호/주소/공모가/수량/자금용도/사업기간 + 문서 좌표, zod 검증 |
| `src/lib/verify/claims/extract-rules.ts` | CREATE | 규칙 파서(이력번호 정규식 `002`+9자리 등) — LLM 교차검증 상대 |
| `src/lib/verify/claims/extract-llm.ts` | CREATE | LLM 추출 — spine llm 클라이언트 경유(fake-first), 4종 태깅 준수 |
| `src/lib/verify/adapters/livestock-trace.ts` | CREATE | 이력번호→개체 실재·이력 (15058923). traceNo 12자리 변환, 스냅샷 회귀 기준 |
| `src/lib/verify/adapters/auction-price.ts` | CREATE | 경락가 (15058822) — 월 단위 집계 캐싱(일 1,000건 쿼터 방어) |
| `src/lib/verify/judge/engine.ts` | CREATE | claim 종류별 어댑터 라우팅 → 3값 판정. **근거 0건 = 판정 없음 불변식** + 자료 부족 ≠ 부정 판정 |
| `src/lib/verify/report/build.ts` | CREATE | 3층위 근거 리포트 — 원문 좌표↔대조 출처 병치, `[확인된 사실]/[발행사 주장]/[계산]/[AI 해석]` 태깅 |
| `src/lib/verify/cli.ts` | CREATE | `npm run verify -- --rcpNo 20260806000159` 완주 러너 |
| `src/lib/verify/__tests__/*.test.ts` | CREATE | 파서·추출·어댑터·판정·리포트 단위 + 37두 완주 통합 테스트 |
| `package.json` | UPDATE | `verify` 스크립트 추가 (tsx) + `fast-xml-parser`·`fflate` 의존성 |
| `src/app/api/verify/route.ts` | CREATE (S1) | 라이브 재검증 Route Handler — Node 런타임, `no-store`, 심사자 curl 가능 |
| `src/app/api/cron/monitor/route.ts` | CREATE (S2) | Vercel Cron 감시 — 정정 감지→재검증→Blob 이벤트 적재 |
| `vercel.ts` | CREATE (S2) | crons 설정 (주 2회 모니터링) |
| `.env.example` | CREATE/UPDATE | `DART_API_KEY`, `DATA_GO_KR_KEY` 문서화 — 하드코딩 금지 |

## Phase & Wave 분해 — 1인 구현 · E2E 우선 재구성 (2026-08-10 확정)

> **전제**: 구현은 1인(+AI 페어). 목표는 "움직이는 E2E로 팀을 설득"하는 것.
> **원칙**: 수평 레이어(엔진 완성→화면)가 아니라 **수직 슬라이스** — 최소 E2E를 최대한 빨리 관통하고, 매 슬라이스가 끝날 때마다 **팀에게 보여줄 수 있는 것**이 하나씩 늘어난다. 웨이브는 병렬 분배 단위가 아니라 1인 작업의 순서·완결 단위.

### S0 — 설득용 수직 슬라이스: 최소 E2E 관통 (8/11~8/13) 🎯

| 순서 | 작업 | 왜 이 순서인가 |
|---|---|---|
| S0.0 | **Vercel 연결·첫 배포·env 설정** — 이후 매 푸시 자동 배포 | 첫날부터 URL 존재 — 설득·공유·심사 리허설의 기반 |
| S0.1 | 타입·판정 계약(Verdict 3값·근거 불변식·문서 버전 축) | 모든 것의 계약 — 반나절 |
| S0.2 | fake 픽스처 파이프라인: 뱅카우 9호 원문(확보됨)+실측 스냅샷 → **규칙 추출만으로**(정형 표라 LLM 불필요) 이력번호·취득가 추출 | LLM 없이 시작 — 불확실성 최소 경로 |
| S0.3 | 이력제 어댑터(스냅샷 재현) → 판정 엔진 → 37두 판정 산출 | 실측 36/37과 일치 = 즉시 검증 |
| S0.4 | **목업 v4 화면에 실데이터 바인딩** — data.ts 하드코딩을 엔진 산출 JSON으로 교체 + `npm run verify` CLI | 화면은 이미 있다(목업 v4) — 와이어 설계 별도 작업 불필요 |
| **산출** | **클릭 가능한 실데이터 E2E** (공모 선택→3초 판정→24호 드릴다운→근거 카드) — **8/13 팀 설득 데모** | 설득 자산 #1 |

### S1 — 엔진 정식화 (8/14~8/16, 게이트 8/16)

파서 일반화(항목 구조 보존) → LLM 추출+규칙 교차검증(불일치=확인 불가 강등) → 경락가 어댑터+② 가격 층위 → 근거 리포트 JSON 정식화(4종 태깅). **게이트(≒MS1, 이틀 앞당김)**: fake/실키 양 모드 완주+스냅샷 회귀. 산출: 라이브 재검증 가능한 엔진 — 설득 자산 #2 ("버튼 누르면 지금 다시 대조").

### S2 — 축 B + 정정 재검증 (8/17~8/22)

실거래가 어댑터+비교군 실측(부족 시 ② 축소 판단) → 백분위+예상vs실제 → 정정 계보 수집+**정정 재검증**(버전 diff→재실행→판정 유지/변동, 등급 없음). **트랙레코드는 요약 카드 수준으로 축소**(1인 범위 조정 — 상세 집계는 로드맵). 산출: 2축+감시가 도는 제품 골격 — 설득 자산 #3.

### S3 — 제품화 (8/23~8/29)

화면 정식 구현(드릴다운 동선 다듬기·재검증 버튼 E2·알림+리플레이 E4·스냅샷 폴백 E5) → 눈높이 2프리셋 사전 생성 → 스파인 도메인 교체+레드팀 재실행. 기존 Phase 3(8/27 시작·6일)보다 **4일 일찍 시작** — 1인 구현에서 화면·통합이 최대 변수이므로 버퍼를 여기에 배치.

### S4 — 검증·제출 (8/30~9/5)

5인 사용성 테스트(팀원+외부)→수정 → 골드셋 F1(10건으로 축소 측정) → Vercel 배포·부하·레이트리미터 부채 → 기획서 hwpx 전사·기능명세서(심사자 검증 절차) → **9/5 제출**→프리즈→9/7~11 무중단.

### 1인 구현 리스크 스위치 (미리 정해두는 축소 순서)

일정 압박 시 다음 순서로 자른다(전 단계 산출물은 유지됨): ① 트랙레코드 상세→요약 카드(이미 반영) ② 골드셋 F1 표본 축소(20→10) ③ 눈높이 프리셋 1종으로 ④ 축 B 백분위→비교군 수만 표시 ⑤ 최후: 축 B 전체를 사후 검증 1건 스냅샷으로. **어떤 경우에도 S0~S1(축 A E2E + 라이브 재검증)은 자르지 않는다** — 이것이 설득과 심사의 최소 성립 조건.

## Tasks

### Task 1: 타입·판정 계약 확정 (TDD 시작점) — W1.1ⓐ
- **Action**: `Verdict = match | mismatch | unverifiable` 유니언 + Claim·Evidence 타입. 근거 0건 판정 생성이 타입/런타임 양쪽에서 불가능하게. **Claim에 문서 버전 축(rcpNo·제출일) 포함** — 같은 공모의 정정신고서를 동일 스키마로 추출해 버전 간 필드 diff가 기계적으로 나오게 (council 4차: 정정 재검증의 스키마 훅. 중대성 등급 필드는 두지 않는다)
- **Mirror**: `SpineAnswer` 유니언, readonly 불변
- **Validate**: `npm test` — 판정 불변식 테스트 RED→GREEN + 두 버전 claim 비교 시 변경 필드 목록 산출 테스트

### Task 2: DART 수집기 + fake 픽스처
- **Action**: C005·C010 목록 조회→원문 취득. 뱅카우 9호(rcpNo 20260806000159) 원문을 픽스처로 고정
- **Validate**: `npm run verify -- --list 2026` 이 8건 목록 출력 (실키), fake 모드에서 픽스처 로드

### Task 3: 파서 + claim 스키마 + 이중 추출(규칙↔LLM)
- **Action**: 항목 구조 보존 파싱 → zod 스키마 → 규칙·LLM 병렬 추출 후 교차검증(불일치 필드는 확인 불가 처리)
- **Mirror**: spine llm fake-first, guardrail 룰 카탈로그 구조
- **Validate**: 뱅카우 9호 37개 이력번호 + 공모가·자금용도 수동 대조(신고서 구조 실측 문서 기준), 골드셋 선라벨 5건 EM 측정

### Task 4: 축산물이력제·경락가 어댑터
- **Action**: traceNo 12자리 변환·XML 파싱·infoType 1/2/5/7 정규화. 경락가 월 집계 캐시(파일 기반)
- **Mirror**: 스냅샷 JSON의 실측 응답 구조가 계약
- **Validate**: 스냅샷 37두 회귀 테스트 — 실호출 결과(36 일치·학산 24호 이상)와 동일 판정 재현

### Task 5: 판정 엔진 + 근거 리포트
- **Action**: claim→어댑터 라우팅→Evidence 수집→3값 판정→리포트(JSON). 출력 필터(단정 표현) 스파인 경유
- **Validate**: `npm run verify -- --rcpNo 20260806000159` 완주 → 37두 전 판정 + 근거 카드 데이터 생성, `npm test` 전체 통과

### Task 6: 완주 게이트 검증 (Milestone 1 완료 조건)
- **Action**: fake 모드(키 없음)와 실키 모드 각각 완주. 판정 근거 부착률 100% 확인
- **Validate**: 통합 테스트 + CLI 실행 산출물을 `data/reports/`에 저장, 스냅샷 대비 diff 없음

## Validation

```bash
npm test                                        # 기존 26개 + 신규 verify 테스트
npm run verify -- --rcpNo 20260806000159        # 축 A 완주 (fake: 키 없이도 동작)
npm run redteam                                 # 단정 표현 유출 0건 재확인
npm run lint && npm run build
```

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| 신고서 XML 항목 구조가 발행사마다 상이 | 중 | 뱅카우 9호 우선, 파서는 항목 매핑 테이블로 분리(2023~25 26건은 Phase 2 확장) |
| LLM 추출 품질 미달 | 중 | 규칙 파서 교차검증 + 실패 필드 확인 불가 정직 표시 (PRD 리스크 승계) |
| 경락가 일 1,000건 쿼터 | 중 | 월 집계 캐시 선행 구축, CI는 fake 고정 |
| API 키 미설정 팀원 온보딩 | 낮 | fake-first — 키 없이 전체 완주 (spine 패턴) |

## Acceptance

- [ ] `npm run verify` 1회로 뱅카우 9호: 신고서 입력→claim 추출→3층위 대조→판정→근거 리포트 완주
- [ ] 스냅샷 실측(36/37·학산 24호)과 동일 판정 재현 (회귀 고정)
- [ ] 판정 근거 부착률 100% — 근거 0건 판정이 타입·테스트로 차단됨
- [ ] fake 모드 완주 (키·네트워크 불필요) — 팀원·CI 동작
- [ ] 기존 spine 테스트·레드팀 무회귀

## 후속 마일스톤 연결 (참고)

- MS2(축 B): `adapters/rtms.ts`(실거래가)만 추가 — 공통 엔진·타입 재사용이 이 플랜의 설계 제약
- MS3(3초 판정 화면): 이 플랜의 `VerifyReport` JSON이 화면 계약 — **4단 동선 와이어를 Phase 1 중 병행 확정** (council 3차)
- MS4(정정 재검증+알림, council 4차 재정의): 정정신고서를 **이 엔진의 새 입력**으로 재실행 — 신규 파이프라인 없음. 스냅샷 저장 구조(`data/reports/` 버전링)가 diff 재생의 기반. 알림은 변경 claim 나열+판정 유지/변동만(등급 없음)
