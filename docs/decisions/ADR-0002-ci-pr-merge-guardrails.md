# ADR-0002: CI 기반 PR 병합 가드레일

- **Status:** Accepted
- **Decision date:** 2026-08-31
- **Supersedes:** None
- **Superseded by:** None

## Context

저장소에는 PR 대상·리뷰 정책과 로컬 검증 명령을 설명하는 문서가 있지만 GitHub Actions 워크플로가 없었다. 따라서 PR #1은 자동 체크 없이 병합 가능한 상태였고, LLM이나 사람이 문서를 읽지 않으면 검증 전 병합을 막을 장치가 없었다. 또한 현재 비공개 저장소 플랜에서는 GitHub branch protection과 required status check를 강제할 수 없다.

## Decision

`integration` 대상 pull request마다 Node.js 22 환경에서 `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`를 순서대로 실행하는 `CI` 워크플로를 둔다. `Verify`가 없거나 대기·실행 중이거나 성공 외 상태이면 병합하지 않고, 성공한 뒤 사용자 또는 팀의 명시적 병합 동의가 확인된 경우에만 병합한다. 동의 사실은 PR에 남긴다.

GitHub 필수 승인 수는 현재 정책대로 `0`을 유지한다. 저장소 플랜 또는 공개 범위가 required status check를 지원하게 되면 `integration`에 `Verify`를 필수 체크로 설정한다.

### Decision basis

- **User-confirmed:** 사용자가 `integration` 대상 PR에 Node.js 22 기반 lint·타입 검사·테스트·빌드 CI를 추가하고, CI 진행 중이거나 실패하면 병합하지 않도록 `AGENTS.md`에 명시하라고 요청했다.
- **User-confirmed:** 사용자가 팀원의 사전 동의를 받은 경우 그 사실을 PR에 기록한 뒤 병합하라고 요청했다.
- **Inferred:** 문서 지침을 읽는 LLM뿐 아니라 사람이 만든 PR에도 동일한 검증 증거를 제공하려는 의도다. 근거는 문서 가드레일만으로 충분한지와 CI 필요성을 함께 확인한 대화다.

## Alternatives considered

| Alternative | Benefits | Costs / risks | Why not selected |
| --- | --- | --- | --- |
| 문서 가드레일만 유지 | 설정과 실행 비용이 없음 | 문서를 읽지 않으면 검증 누락을 발견하기 어렵고 PR에 기계적 증거가 남지 않음 | 사용자 요청과 검증 목적을 충족하지 못함 |
| 필수 승인 1명 적용 | 사람 검토를 강제할 수 있음 | 비개발 팀원의 병목과 마감 지연 가능성이 있고 현재 플랜에서 강제 설정 불가 | 기존 required approvals 0 정책 유지 |
| 플랜 변경까지 CI 도입 보류 | 완전한 강제 설정과 함께 시작 가능 | 그 전까지 모든 PR이 자동 검증 없이 병합 가능 | CI 실행 자체는 지금도 가능하므로 보류하지 않음 |

## Rationale

문서는 LLM과 팀의 행동 기준을 제공하지만 실행 결과를 자동으로 증명하지 않는다. CI는 동일한 명령을 격리된 환경에서 반복해 PR에 결과를 남긴다. 현재는 GitHub 설정으로 실패 병합을 차단할 수 없으므로 `AGENTS.md`의 병합 금지 규칙을 함께 적용한다.

## Consequences

### Positive

- `integration`에 들어가는 변경은 동일한 lint·타입·테스트·빌드 검증을 거친다.
- PR 화면에서 검증 상태와 실패 지점을 확인할 수 있다.
- LLM과 사람이 같은 병합 기준을 공유한다.

### Negative / tradeoffs

- PR마다 의존성 설치와 전체 빌드 시간이 추가되고 GitHub Actions 사용량을 소비한다.
- 현재 플랜에서는 CI 실패를 시스템적으로 차단할 수 없어 문서 정책 준수가 필요하다.
- 레지스트리 장애나 네이티브 패키지 설치 문제처럼 코드와 무관한 환경 실패가 병합을 지연시킬 수 있다.
- 빌드가 사용하는 외부 폰트 다운로드 장애가 일시적인 실패를 만들 수 있다.
- PR에서 워크플로 자체를 변경할 수 있으므로 required status check가 없는 동안에는 변경 내용도 함께 검토해야 한다.

## Guardrails

- 워크플로는 `integration` 대상 pull request에서만 실행한다.
- 최소 권한은 `contents: read`로 제한한다.
- `pull_request_target`을 사용하지 않고 checkout 자격증명을 유지하지 않는다.
- 외부 GitHub Actions는 검증한 릴리스의 전체 커밋 SHA로 고정한다.
- 같은 PR의 이전 실행은 취소하고 최신 커밋만 검증한다.
- 체크 이름 `Verify`를 안정적으로 유지하고, 체크가 없거나 성공하기 전에는 병합하지 않는다.
- 에이전트는 사람의 승인을 만들어내거나 대신 제출하지 않으며, 명시적 병합 동의와 근거를 PR에 기록한다.
- required status check가 지원되면 `integration` ruleset에 `Verify`를 추가한다.

## Validation

- PR #1의 최신 커밋에서 `CI` 워크플로의 `Verify` 체크가 생성되고 성공해야 한다.
- `Verify` 로그에 `npm ci`, lint, TypeScript, Vitest, Next.js build가 모두 exit 0으로 기록돼야 한다.
- CI가 대기·실패·취소 상태일 때 병합하지 않았음을 PR 타임라인으로 확인한다.
- 병합 후 `origin/integration`이 PR의 병합 결과를 포함하고 워크플로·가드레일 문서가 존재해야 한다.

## Revisit triggers

- 저장소가 public으로 전환되거나 GitHub Pro 이상 플랜을 사용하게 될 때.
- 제출 이후 required approvals를 1명으로 올릴지 재논의할 때.
- CI 실행 시간이 병목이 되거나 Actions 사용량 제한에 도달할 때.
- Node.js 또는 Next.js 지원 버전이 변경될 때.
- 테스트를 빠른 필수 체크와 느린 선택 체크로 분리할 필요가 생길 때.

## Sources

- Current conversation (no durable link).
- [Git 컨벤션](../planning/git-convention.md)
- [에이전트 가드레일](../../AGENTS.md)
- [Claude Code 가이드](../../CLAUDE.md)
- [CI 워크플로](../../.github/workflows/ci.yml)
- [PR #1](https://github.com/yeony-park/finance-ai-challenge-2026/pull/1)

## Amendments

- 2026-08-31: GitHub-hosted runner의 Node.js 20 action 런타임 중단 경고를 해소하기 위해 `actions/checkout` v7.0.1과 `actions/setup-node` v7.0.0을 전체 커밋 SHA로 고정했다.
