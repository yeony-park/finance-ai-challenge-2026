<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git commit convention

- Use `<type>: <한국어 설명>` for every commit message.
- Allowed types are `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, and `data`.
- Do not add a scope. For example, use `fix: 홈 스크롤 이동 개선`, not `fix(home): 홈 스크롤 이동 개선`.

## Pull request and CI guardrails

- Open pull requests against `integration`; do not push directly to `integration`.
- The required verification is the `Verify` job in `.github/workflows/ci.yml`.
- Do not merge when `Verify` is missing, queued, in progress, skipped, cancelled, timed out, action-required, or failing. Merge only after it succeeds.
- Required GitHub approvals remain `0`, but a mergeable state or the absence of a required approval is not authorization to merge. An agent must not invent or submit a human approval; it may merge only after explicit user or team authorization and must record that authorization in the pull request body or a comment before merging.
- Until the repository plan or visibility supports enforced status checks, treat the CI rule above as mandatory project policy. When enforcement becomes available, require the `Verify` check for `integration`.
- See `docs/planning/git-convention.md` and `docs/decisions/ADR-0002-ci-pr-merge-guardrails.md` for the full policy and rationale.
