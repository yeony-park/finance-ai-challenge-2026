# 점점 Git 컨벤션 — 제안

> **상태: 제안 (팀 리뷰 요청)** · 2026-08-31 · 원형: 오멍가멍 `docs/planning/git-convention.md` (2026-08-07)
> 오멍가멍의 3층 구조(main / dev/이름-main / work/…)를 4인 팀·마감(9/7) 임박 상황에 맞게 2층으로 경량화했다. 마감 후 필요해지면 dev 계층을 그때 도입한다.

---

## 1. 브랜치 전략

```
integration                          트렁크 (배포·제출 기준, 직접 push 금지)
 └─ work/<이름>/<type>/<short-description>   실제 작업 브랜치
```

- PR은 1단계: `work/...` → `integration`, **팀원 1명 이상 승인 후 머지**.
- `<type>`은 커밋 태그와 동일: `feat` / `fix` / `refactor` / `docs` / `test` / `chore` / `perf` / `ci` / `data`.
- 예: `work/viowlet/feat/db-migration-aws`, `work/hyunsuk/fix/art-copilot-guard`.
- `main`은 대회 기간 동결 — 제출 후 `integration`을 `main`으로 승격(fast-forward)하고 트렁크를 `main`으로 전환한다. 지금 트렁크를 갈아타는 것은 배포 습관·문서 참조가 전부 `integration` 기준이라 마감 전 리스크만 얹는다.

### 하지 말 것

- `integration`에 직접 push (이 문서 채택 시점부터)
- 한 브랜치에서 여러 목적 작업
- `package-lock.json` 임의 삭제
- 개인 이름 단독 브랜치(`hyunsuk` 등) 신규 생성 — `work/<이름>/…` 규약으로 통일

### 이어서 작업하는 순서

```bash
git switch integration && git pull
git switch -c work/<이름>/<type>/<다음-작업>
# 작업 → npm test / npm run build → 커밋 → push → PR(base: integration)
```

## 2. 커밋 메시지

`AGENTS.md`의 기존 규약 유지: `<type>: <한국어 설명>`, scope 없음, 커밋당 목적 하나.
허용 타입: `feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci` `data`.

## 3. 브랜치 보호 (오너 설정 필요)

레포 Settings → Rules → Rulesets → New branch ruleset:

- 대상: `integration` (제출 후 `main` 전환 시 대상 변경)
- Require a pull request before merging — approvals `1`, stale approval dismiss
- Block force pushes

## 4. 기존 브랜치 정리 계획 (소유자 확인 후 실행)

2026-08-31 `integration` 기준 실측:

| 분류 | 브랜치 | 처리 제안 |
|---|---|---|
| 머지 완료 | `feat/integration-user-flow`, `viowlet`, `main`(포함됨) | user-flow·viowlet 삭제, main은 동결 유지 |
| 미머지 — 소유자 확인 필요 | `Su`, `docs/pig-sto-research`, `feat/initial-sto-ui`, `feat/integration-pig-review`, `hyonsho/jeomjeom-hybrid-integration`, `hyunsuk`, `yeonjeong` | 회수할 자산 여부를 소유자가 확인 → 회수 완료분은 `archive/<이름>` 태그를 박고 브랜치 삭제 (태그가 남으므로 복구 가능) |
| 로컬 워크트리 | `wt-*` 7종 (detached 4 포함) | 이식 완료분 `git worktree remove` — 각자 로컬 정리 |

## 변경 이력

| 날짜 | 내용 |
| --- | --- |
| 2026-08-31 | 최초 제안 — 오멍가멍 컨벤션 경량화 이식, 브랜치 정리 계획 포함 |
