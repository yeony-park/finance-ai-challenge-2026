# 합성 미술 기능 인계서

## 한 줄 요약

`synthetic-feature-restore` 브랜치 전체가 한 덩어리 인계본입니다. 이 브랜치에는 아래 세 가지가 함께 있습니다.

- 가짜(합성) JSON: `data/synthetic/art-investment.json`
- 공개 합성 이미지 327개: `public/synthetic-art/` (현재 9개 + 과거 이력 318개)
- 위 JSON과 이미지를 연결한 미술 웹 화면과 API

따라서 **전체 화면·설계 인계(Full-design handoff)**에는 파일을 따로 골라 복사하지 말고 Git 브랜치 전체를 받습니다. 이 문서는 공개 배포를 만들었다는 뜻이 아닙니다.

## 받는 방법: 별도 worktree

작업 중인 폴더와 섞이지 않도록, 기존 저장소 폴더에서 아래 명령을 순서대로 실행합니다. 마지막 경로인 `../finance-ai-challenge-2026-synthetic-art`는 비어 있거나 아직 없는 경로여야 합니다.

```bash
cd /path/to/finance-ai-challenge-2026
git fetch origin synthetic-feature-restore
git worktree add --detach ../finance-ai-challenge-2026-synthetic-art origin/synthetic-feature-restore
cd ../finance-ai-challenge-2026-synthetic-art
git status --short --branch
```

`--detach`는 원래 폴더의 브랜치를 바꾸지 않고 받은 커밋만 별도 폴더에서 보는 안전한 방법입니다. `git fetch`가 받는 기준은 정확히 `origin/synthetic-feature-restore`입니다.

### 절대 하지 않을 일

- `main` 또는 `integration`에 이 내용을 **merge하지 않습니다**.
- `main` 또는 `integration`에 **push하지 않습니다**.
- 이 인계 작업에서는 commit이나 push를 하지 않습니다.

## 설치와 로컬 실행

별도 worktree 폴더에서 실행합니다. Node.js 22를 사용합니다.

```bash
node --version
npm ci
cp .env.example .env.local
npm run dev
```

브라우저에서 아래 주소를 확인합니다.

- 미술 전체 화면: `http://localhost:3000/art`
- 상품 화면: `http://localhost:3000/products`
- 작가 화면: `http://localhost:3000/artists`
- 플랫폼 화면: `http://localhost:3000/platforms`

`.env.local`에는 실제 키를 넣지 않아도 합성 화면을 볼 수 있습니다. 실제 키가 필요하면 로컬에서만 넣고 Git이나 Vercel에 올리지 않습니다.

## 확인 명령

worktree의 프로젝트 루트에서 아래 명령을 실행합니다.

```bash
python3 -m unittest tests.test_synthetic_art_handoff
git diff --check
npm run check:synthetic-source
python3 -m unittest tests.test_synthetic_data
npm run lint
npm run typecheck
```

더 넓은 미술 기능 테스트가 필요하면 아래도 실행합니다.

```bash
npm run test:art
```

`npm run check:synthetic-source`가 합성 경계를 확인합니다. 핵심 원본은 `data/synthetic/art-investment.json`이고, 이미지 원본 폴더는 `public/synthetic-art`입니다. 서버에 허용된 OpenDART 제어 입력은 `data/art/dart-filing-manifest.json` 하나입니다.

## 배포 전 제외 규칙 확인

이 인계 작업에서는 Vercel에 배포하지 않았습니다. 이 환경에는 Vercel CLI도 없어 dry-run 또는 inspect 결과를 만들지 않았습니다. Vercel에 올릴 때 적용되는 파일 제외 규칙은 프로젝트 루트의 `.vercelignore`에 있으며, Git ignore 형식으로 처리됩니다.

`.env.example`, 필요한 소스(`app/`, `components/`, `lib/`), `data/synthetic/`, `public/synthetic-art/`, `data/art/dart-filing-manifest.json`은 올립니다. 실제 환경 파일, demo/raw/report/snapshot/temp/tmp/internal/docs/workspace/deliverables 자료와 `.codex/`, `.vscode/`, `.claude/`, `.git/`, `AGENTS.md`, `CODEX_GOAL.md`, `PROJECT_STATUS.md`, 이 인계서는 올리지 않습니다. CLI를 사용한 Preview 배포나 업로드 확인은 별도 승인 없이는 실행하지 않습니다.

## 데이터만 받는 경우

**Data-only 경로**는 전체 설계 인계와 다릅니다. 화면을 연결하지 않고 합성 데이터만 읽어야 할 때에만 다음 두 경로를 따로 가져갑니다.

- `data/synthetic/art-investment.json`
- `public/synthetic-art/`

이 두 경로만 복사하면 327개 이미지와 JSON은 얻지만, 연결된 art 웹 UI, API, 화면 설계는 얻지 못합니다. 화면까지 필요하면 위의 **전체 화면·설계 인계**처럼 `synthetic-feature-restore` Git 브랜치 전체를 별도 worktree로 받습니다.
