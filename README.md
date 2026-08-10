# JeomJeom

미술품·부동산·가축(한우·돼지) STO를 원문 근거로 검토하는 AI 플랫폼의 초기 Next.js UI입니다. 각 자산 페이지를 독립 라우트로 나눠 팀원이 병렬로 개발할 수 있도록 구성했습니다.

## 시작하기

Node.js 22와 npm을 권장합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

Docker를 사용하면 로컬 Node.js 버전을 맞추지 않아도 됩니다.

```bash
docker compose up --build
```

## 페이지 담당

| 라우트 | 영역 | 담당 |
| --- | --- | --- |
| `/real-estate` | 부동산 | 문수 |
| `/livestock/cattle` | 가축·한우 | 원준 |
| `/livestock/pig` | 가축·돼지 | 연정 |
| `/art` | 미술품(보조) | 현석 |

각 담당자는 해당 라우트의 `page.tsx`를 중심으로 작업합니다. 공통 UI는 `components/`, 전역 스타일은 `app/globals.css`에 있습니다.

## 검증

```bash
npm run lint
npm run typecheck
npm run build
```

프로젝트 목표와 공모전 맥락은 [`docs/`](./docs) 및 루트의 [`AGENTS.md`](./AGENTS.md)를 먼저 확인합니다. 화면 작업 전에는 [`docs/design-system.md`](./docs/design-system.md)의 타이포와 키 컬러 규칙을 적용합니다.
