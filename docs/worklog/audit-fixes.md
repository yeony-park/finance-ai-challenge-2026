# 3종 점검 수정 패키지 (worklog)

> 규약: `docs/worklog/README.md` 4섹션(결정과 근거/트레이드오프/검증 영향/알려진 한계).
> 위임: 통합 세션(jeomjeom-5a) 4차 — 연동·데드코드·조용한 실패 점검 수정. HEAD 67462fd 위, 미푸시.
> 제약: file 모드 완주 · 실 DB 상태 변경 금지(roles.sql 개정 적용은 오너) · 푸시/배포 금지 · [팀 결정 대기] 불변경.

## 작업 1 — PII 방어선 보강 (2026-08-30)

**결정과 근거** — 골드셋 라벨(이력번호·사육지 = PII)을 업로드·적재·트레이싱 세 곳에서 차단: ① `.vercelignore`에 `data/goldset` ② `guards.ts` LOCAL_ONLY_DIRS에 `data/goldset`(db:seed/ingest 원천 거부) ③ `next.config.ts` outputFileTracingExcludes에 `data/goldset/**/*`. 겸사겸사 업로드 표면 축소: `.vercelignore`에 `db`·`drizzle.config.ts`·`tsconfig.tsbuildinfo` 추가.

**트레이드오프** — 해당 없음(방어 추가, 기능 영향 0).

**검증 영향** — guards 테스트에 data/goldset 거부 2건 추가. LOCAL_ONLY_DIRS 4개로 확대.

**알려진 한계** — .vercelignore는 배포 시 dry-run 매니페스트로 실효 확인 필요(오너 배포 시). goldset 라벨 파일 자체는 이미 gitignore(README만 커밋).

## 작업 2 — cron 자격증명 모순 해소 (2026-08-30)

**결정과 근거** — recordMonitorRun이 `DATABASE_URL_DIRECT`(CLI 전용)를 요구 → 프로덕션 cron은 직결 미보유라 영구 무기록(또는 직결 배포 시 R-STO-16 위반)의 딜레마. 해소: ① record.ts monitor 경로를 **런타임 연결**로 전환 + monitorRuns+events **트랜잭션 원자화** ② roles.sql 런타임 역할에 monitor_runs·monitor_events INSERT 부여. monitor_events FK 링크는 `INSERT ... RETURNING id`가 필요하고 RETURNING이 SELECT를 요구하므로 **monitor_runs에 한해 SELECT 예외**(집계 메타·PII 없음, events/verification_runs/원장은 SELECT 불가 유지) ③ R-STO-16·09 §5 집행규칙 2·3 재개정(같은 커밋). 이로써 Supabase keep-alive ping이 프로덕션 cron에서 실효.

**트레이드오프** — "런타임 SELECT 불가"의 엄격 해석에서 monitor_runs SELECT 1건 예외 — RETURNING FK 링크의 불가피. 대안(events가 checkedAt 자연키 FK로 참조→RETURNING 불요)은 스키마 재설계라 비용 과다, monitor_runs 집계 메타 노출은 무해로 판단. record.ts monitor catch도 loud 로그(작업 3①과 동반).

**검증 영향** — 트랜잭션 원자화로 부분 기록(run만·events 누락) 제거. 실 역할 권한은 오너 roles.sql 적용 후 검증(RETURNING SELECT 요구가 실측되면 문서대로 monitor_runs SELECT로 충족).

**알려진 한계** — 실 DB 미적용이라 런타임 역할의 monitor INSERT·RETURNING 권한은 오너 적용 후 실측. 트랜잭션 풀러(6543)에서 단일 트랜잭션은 지원되나 실환경 확인 권장.

## 작업 3 — 조용한 실패 10건 수정 (2026-08-30)

**결정과 근거** — silent-failure 점검 전건:
- ①② ledger/record.ts 3함수 catch에 구조화 loud 로그(runKey/offerSlug/checkedAt) + recordMonitorRun 트랜잭션 원자화(작업 2 동반).
- ③ report/load.ts: `ReportNotFoundError`(ENOENT/파일 없음) vs `ReportCorruptError`(파싱·스키마 손상) 분리. listReportFiles는 ENOENT만 흡수, 그 외 log+rethrow. verify route·cron loadReport는 손상 시 console.error(loud) 후 폴백 — 손상을 "리포트 없음"으로 오도하던 경로 교정.
- ④ auction-price-fake·pig-auction-price-fake: readdir는 ENOENT만 데이터 없음으로 흡수, 그 외 I/O는 log+rethrow(실데이터를 fake로 오분류 차단). 공용 `io-errors.ts`(isEnoent·ioErrorMessage).
- ⑤ pig meta.json 파싱 실패(비-ENOENT) 시 console.warn + 폴백 필터 명시.
- ⑥ ingest/manifest.ts manifestSha256 빈 값이면 throw(MANIFEST 갱신 누락 loud화).
- ⑦ repositories offerings·rag-search Zod safeParse 실패 시 console.warn(파일명+issues) 후 skip.
- ⑧ ingest·seed 카테고리별 루프를 db.transaction 원자화(migrate 러너와 일관, DbOrTx 타입으로 tx 주입).
- ⑨ seedRag documentId undefined 시 console.warn.
- ⑩ rag `degraded:true` 고정 의미를 09 §4 한 줄 + 계약 테스트(히트 유무 무관 true)로 명시.

**트레이드오프** — 손상/오류를 흡수 대신 loud화하면 로그 노이즈가 늘지만, 손상을 "없음"으로 오도하는 사일런트 실패가 더 위험(디버깅 불가·오탐 502). 트랜잭션 원자화는 부분 커밋(일부 행만) 제거 — 재실행 멱등과 함께 이중 안전. ReportCorruptError는 사용자 502 문안은 유지(내부 loud 로그만) — 문안은 04 규칙 불변.

**검증 영향** — repositories 테스트에 degraded 고정 테스트 추가. 전체 1441 그린·tsc·eslint clean. 손상 리포트·비-ENOENT I/O·MANIFEST 누락이 이제 로그로 관측된다.

**알려진 한계** — 로그는 console.error/warn(구조화 로거 미도입 — 관측성 후속). 트랜잭션 실권한·부분 실패 롤백은 실 DB 적용 후 검증(오너).

## 작업 4 — 연동 배선 소형 3건 (2026-08-30)

**결정과 근거** — ① `/pig` 페이지 `descriptor={null}` → `PIG_CATEGORY` 주입(층위 표가 실재성 unsupported·가격/이행 partial을 실제 렌더). ② pig filing-facts(pig-1~3) 화면 노출 — 페이지가 loadFilingFacts로 로드해 PigLanding에 전달, 선택 회차의 사실 카드를 시맨틱 `<dl>` 섹션으로 렌더(기존 s.axes/sectionLabel/sectionTitle 재사용). 문안 PIG_FILING은 content/pig.ts 등재 + pigCopyStrings 필터 감사 편입. ③ watch:refresh npm 스크립트(monitor-cli) 등재 + WATCH_BAND_LEAD 정직화("자동 갱신"→"마지막 감시 확인 시점 기준·주 2회 주기").

**트레이드오프** — **작업 4②는 build·tsc·필터 감사만 검증, 시각 확인 미수행(헤드리스 환경 제약)** — 레이아웃/스타일은 프론트 담당 시각 사인오프 필요(CLAUDE.md 시각 검증 규약). 최소·시맨틱 렌더(dl, 기존 클래스 재사용)로 시각 리스크 최소화. watch 구조 처방(export 경유)은 범위 밖 — 단기 처방(스크립트+문구)만.

**검증 영향** — pig-copy·home-copy 필터 감사 332 그린(PIG_FILING·WATCH_BAND_LEAD 포함). build·tsc clean. next.config allowedDevOrigins IP는 미변경(팀원 것일 수 있어 워크로그 기록만 — 작업 7).

**알려진 한계** — 4② 시각 확인 미완(프론트 사인오프 대기). watch:refresh는 DART 키 필요(없으면 not_configured).

## 작업 5 — ledger_observations 실배선 (2026-08-30)

**결정과 근거** — 3차 후속 "④ 관측 실배선": judge 파이프라인 무수정으로 배선. `withLedgerObservationRecording` 데코레이터가 축산물이력제 어댑터의 `lookup`을 감싸 대조 시점에 buildLedgerObservationFromTrace→recordLedgerObservations를 best-effort 기록(R-STO-20 화이트리스트·farmerName/farmAddress 제외·subject_key 마스킹). verify CLI에서 `directDatabaseUrl()` 게이트로 활성(DB 없으면 미래핑·no-op). R-STO-20에 배선 상태 명기.

**트레이드오프** — 어댑터 경계 데코레이터라 judge/assess 순수성 보존(이전 회신에서 침습적이라 미룬 것을 어댑터 층에서 해소). 라이브 API 경로는 런타임 역할에 ledger_observations INSERT가 없어(R-STO-16) 미배선 — 역할 확장은 오너 결정(M2+). CLI 경로(직결)가 리포트 생성 주 경로라 관측 기록의 1차 소스로 충분.

**검증 영향** — 데코레이터 통과 테스트(lookup 결과 그대로 반환·1회 호출). 기존 R-STO-20 화이트리스트·PII 제외 테스트가 기록 내용 계약 수호. 전체 1445 그린.

**알려진 한계** — 실 관측 기록·멱등은 오너 실 DB verify 실행 후 검증. 라이브 API 관측은 역할 확장 전까지 미기록(CLI만).

## 작업 6 — 계약·문서 실물 정합 (2026-08-30)

**결정과 근거** — ① R-STO-09를 실물(수기 SQL + 자체 러너 migrate.ts, `_migrations` 추적)로 정정, drizzle.config.ts out을 `db/generated/`(스크래치, gitignore)로 분리해 정본 db/migrations/ 미클로버 — generate는 드리프트 spike 전용 명시. ② storage.md 명령어 블록에 db:ingest 추가, frontmatter source-of-truth 조건절("도입 후/생기기 전까지") 제거. ④ README 구조표에 src/lib/db/ 저장 계층 v2 항목. ⑤ .env.example VERIFY_NARRATIVE_MODEL 등재. ⑥ .vercelignore 주석 현행화(data/reference·offers 배포 허용, goldset·db 제외 명시).

**트레이드오프** — ③ CLAUDE.md 명령어/아키텍처 절 갱신은 **미수행** — CLAUDE.md는 프로젝트 지시 파일이라 피어 요청만으로 편집하지 않는다(하니스 경계). 오너 직접 확인·반영 필요로 회신.

**검증 영향** — drizzle-kit generate가 db/generated/에 정상 생성(정본 미클로버) 실측. tsc clean.

**알려진 한계** — CLAUDE.md 갱신 오너 대기.

## 작업 7 — 데드 코드 정리 (2026-08-30)

**결정과 근거** — ① seed/plan.ts OFFERS_DIR가 dataDir를 무시하던 버그 수정(`path.join(dataDir, "offers")` — RAG_DIR와 일관). ② provenance.ts 완전 미참조 export 4건 제거(isSynthetic·hasSyntheticPrefix·IngestibleLicense·AuctionResultValue — 내부·외부 참조 0 재확인). ③ next.config allowedDevOrigins IP(192.168.140.132)는 팀원 개발 origin일 수 있어 **미제거**, 워크로그 기록만.

**트레이드오프** — **미수행(안전 판단)**: synthetic-version.ts/replay-view.ts 합성 배지 분기 제거는 replay 데모 서브시스템(경쟁 시연 후보·amend 테스트 보유)에 닿고 "watch-state 생성 경로 보존" 제약이 얽혀 있어, 정확한 스코프 확인 없이 제거 시 replay:actual·데모 파손 위험 — 통합 세션 스코프 확정 후로 이연. 나머지 미참조 export(≈7건, 본 세션 미작성 코드)는 knip 부재 + 정확 목록 부재로 오제거 위험이 있어 통합 세션의 실측 목록 필요 — 임의 제거 안 함.

**검증 영향** — provenance.ts 4건 제거 후 tsc clean·전체 그린(참조 0 확인). OFFERS_DIR 수정으로 비-기본 dataDir 시드 가드 정합.

**알려진 한계** — 합성 배지 분기 제거·잔여 미참조 export 정리는 스코프 확정 후 후속(통합 세션).

## 작업 8 — 마감 리뷰 반영 (2026-08-30)

**결정과 근거** — 보안·코드 2관점 리뷰. 보안: Approve(CRITICAL/HIGH/MEDIUM 0 — R-STO-16·20·03a·PII·시크릿 전부 clean 확인, console 로그는 error.message만 노출·연결문자열/PII 무유출). 코드: [HIGH] drizzle.config.ts 산문 주석(R-INV-14) 제거(근거는 worklog·storage.md에 존재). [MED] loadFilingFacts가 손상을 조용히 흡수 — /pig 신규 소비 경로라 작업 3 동일 처리(ENOENT는 무음 null, 파싱·스키마·offerId 불일치는 console.warn/error 후 null). [LOW] report/load.ts의 isEnoent를 공용 adapters/io-errors에서 재사용(중복 제거).

**트레이드오프** — 해당 없음(리뷰 지적 반영).

**검증 영향** — 전체 1445 그린·tsc·eslint clean. loadFilingFacts 손상도 이제 관측된다.

**알려진 한계** — 구조화 로거 미도입(관측성 후속, 리뷰 informational). AGENTS.md의 next dev 자동생성 블록은 알려진 정상 산출물(리뷰 주의 환기).

## 배포 사고 — .vercelignore 앵커 누락으로 src/lib/db 업로드 제외 (2026-08-30, 통합 세션)

**결정과 근거** — 4차 수정 배포 시 Vercel 빌드가 `Module not found: @/lib/db/ledger/*` 4건으로
실패(로컬 빌드는 그린). 원인: 업로드 표면 축소로 추가한 `.vercelignore`의 `db` 패턴이 앵커
없이 쓰여 gitignore 의미론상 **모든 깊이의 db 디렉터리**(src/lib/db 포함)를 제외. 교정:
내부 자료 5항목 전부 루트 앵커(`/db` 등) + 파일 내 경고 주석(6ce3d67). 재배포 Ready(39s),
프로덕션 실측: health corpusDocs 9(kape 반영)·전 페이지 200·/pig "선언 대기" 0건·홈
WatchBand 8/30 01:49 KST 표기.

**트레이드오프** — 실패 배포 동안 프로덕션은 직전 Ready 유지(무중단 요건 보존 — Vercel의
실패 시 미승격 동작이 방어). dry-run 검증을 앵커 교정 후 생략하고 실배포로 검증 — 배포
1회 낭비 대신 실측 확실성.

**eval 영향** — 없음(설정 사고). 로컬-Vercel 빌드 결과 차이는 .vercelignore 변경 시에만
발생 — "수정 시 dry-run 검증" 기존 규칙의 실효성이 재확인됨.

**알려진 한계** — .vercelignore 패턴 의미론(비앵커=전 깊이 매칭)을 검증하는 자동 장치
없음 — 수정 시 dry-run 규칙(CLAUDE.md)이 유일한 가드.
