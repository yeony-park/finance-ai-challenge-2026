# 점점 Git 컨벤션 — 제안

> **상태: 제안 (팀 리뷰 요청)** · 2026-08-31 · 원형: 오멍가멍 `docs/planning/git-convention.md` (2026-08-07)
> 오멍가멍의 3층 구조(main / dev/이름-main / work/…)를 4인 팀·마감(9/7) 임박 상황에 맞게 2층으로 경량화했다. 마감 후 필요해지면 dev 계층을 그때 도입한다.

---

## 1. 브랜치 전략

```
integration                          트렁크 (배포·제출 기준, 직접 push 금지)
 └─ work/<이름>/<type>/<short-description>   실제 작업 브랜치
```

- PR은 1단계: `work/...` → `integration`. **리뷰 요청은 기본, 승인 필수는 아님** — 팀에 비개발자가 있고 마감이 임박해, 강제 승인(required approval)은 리뷰 병목이 될 수 있다. 코드 PR은 가능하면 개발자 교차 리뷰, 문서·데이터 PR은 누구든 리뷰 가능. 제출 후 승인 1명 필수로 승격을 재논의한다.
- `<type>`은 커밋 태그와 동일: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `ci` / `data`.
- 예: `work/viowlet/feat/db-migration-aws`, `work/hyunsuk/fix/art-copilot-guard`.
- `main`은 대회 기간 동결 — 제출 후 `integration`을 `main`으로 승격(fast-forward)하고 트렁크를 `main`으로 전환한다. 지금 트렁크를 갈아타는 것은 배포 습관·문서 참조가 전부 `integration` 기준이라 마감 전 리스크만 얹는다.

### PR 병합 가드레일

- 모든 PR의 base는 `integration`으로 한다.
- required approvals는 `0`으로 유지하지만, GitHub의 mergeable 상태나 필수 승인 부재만으로 병합 권한을 추론하지 않는다.
- 사용자 또는 팀의 명시적인 사전 동의를 받은 뒤에만 병합하고, 동의 근거를 병합 전에 PR 본문이나 댓글에 남긴다.
- `CI` 워크플로의 `Verify`가 없거나 대기·실행 중이거나 성공 외 상태이면 병합하지 않는다. `Verify`가 성공한 경우에만 병합한다.
- 긴급 셀프 머지도 위 조건을 모두 충족해야 하며, PR에 사유를 남기고 사후 리뷰를 요청한다.

### 하지 말 것

- `integration`에 직접 push (이 문서 채택 시점부터)
- 한 브랜치에서 여러 목적 작업
- `package-lock.json` 임의 삭제
- 개인 이름 단독 브랜치(`hyunsuk` 등) 신규 생성 — `work/<이름>/…` 규약으로 통일

### 이어서 작업하는 순서

```bash
git switch integration && git pull
git switch -c work/<이름>/<type>/<다음-작업>
# 작업 → npm run lint / npx tsc --noEmit / npm test / npm run build → 커밋 → push → PR(base: integration)
```

## 2. 커밋 메시지

`AGENTS.md`의 기존 규약 유지: `<type>: <한국어 설명>`, scope 없음, 커밋당 목적 하나.
허용 타입: `feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci` `data`.

## 3. 브랜치 보호 (오너 설정 필요)

레포 Settings → Rules → Rulesets → New branch ruleset:

- 대상: `integration` (제출 후 `main` 전환 시 대상 변경)
- Require a pull request before merging — **required approvals는 `0`** (§1의 리뷰 정책과 일치, 제출 후 `1`로 승격 재논의)
- Require status checks to pass — `CI` 워크플로의 `Verify`. 현재 비공개 저장소 플랜에서는 강제 설정을 사용할 수 없으므로 문서 정책으로 집행하고, Pro 전환 또는 공개 저장소 전환 즉시 ruleset에서 `Verify`를 필수 체크로 선택한다.
- Block force pushes

## 4. 기존 브랜치 정리 — 2026-08-31 1차 실행 완료

기준: 최근 활동(8/23 이후) 브랜치는 유지, 오래된 브랜치는 `archive/<이름>` 태그를 박고 **보류**(브랜치는 소유자 자산 회수 확인 전까지 유지, 태그가 있어 삭제해도 복구 가능).

| 분류 | 브랜치 (최종 커밋일) | 처리 상태 |
|---|---|---|
| 삭제 완료 | `viowlet` (8/15, 머지 완료·소유자 승인) | ✅ 8/31 삭제 |
| 삭제 완료 | `feat/initial-sto-ui` (8/10, 아카이브 태그 보존·소유자 승인) | ✅ 8/31 삭제 — `archive/feat/initial-sto-ui`로 복구 가능 |
| 유지 — 최근 활동 | `feat/integration-user-flow`(8/30), `feat/integration-pig-review`(8/26), `hyonsho/jeomjeom-hybrid-integration`(8/23), `hyunsuk`(8/23) | 소유자 판단에 위임 |
| 아카이브 태그 후 보류 | `Su`(8/15), `docs/pig-sto-research`(8/15), `yeonjeong`(8/8) | ✅ `archive/<이름>` 태그 푸시 완료 — 소유자가 자산 회수 확인해주면 브랜치 삭제 |
| 동결 | `main` (8/23, integration에 포함됨) | 제출 후 승격 시까지 유지 |
| 로컬 워크트리 | `wt-*` (detached 4 포함) | 이식 완료분 `git worktree remove` — 각자 로컬 정리 |

## 변경 이력

| 날짜 | 내용 |
| --- | --- |
| 2026-08-31 | `integration` 대상 PR CI와 병합 가드레일 도입, 상태 체크 강제는 플랜·공개 범위 변경 시 활성화 |
| 2026-08-31 | `feat/initial-sto-ui` 소유자 확인 후 브랜치 삭제, 아카이브 태그 유지 |
| 2026-08-31 | 최초 제안 — 오멍가멍 컨벤션 경량화 이식, 브랜치 정리 계획 포함 |
