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
