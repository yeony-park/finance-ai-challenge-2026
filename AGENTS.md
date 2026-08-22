# JeomJeom 에이전트 작업 가이드

## 시작 순서

작업 전에 다음 문서를 순서대로 읽는다.

1. `docs/product-scope.md` — 제품 목표, 팀 역할, AI 경계
2. `docs/competition.md` — 공모전 일정과 제출 조건
3. `docs/development.md` — 실행, 라우트, 검증 방법
4. `docs/design-system.md` — 공통 타이포, 키 컬러, 간격과 컴포넌트 규칙

## 페이지 경계

| 담당 | 페이지 | 기본 작업 파일 |
| --- | --- | --- |
| 문수 | 부동산 | `src/app/real-estate/page.tsx` |
| 원준 | 가축·한우 | `src/app/cattle/page.tsx` |
| 연정 | 가축·돼지 | `src/app/pig/page.tsx` |
| 현석 | 미술품(보조) | `src/app/art/page.tsx` |

- 담당 페이지 구현은 해당 `page.tsx`와 그 페이지 전용 파일에 둔다.
- `src/components/category/CategoryLanding.tsx`, `src/components/site/SiteHeader.tsx`, `src/app/globals.css`는 전 페이지에 영향을 주므로 필요한 경우에만 수정한다.
- 실제 데이터가 연결되지 않은 값은 반드시 `샘플`, `미확인`, `연결 대기`처럼 상태를 표시한다.
- 페이지 문구를 교체할 때 `docs/design-system.md`의 네 가지 타이포 역할과 단일 블루 규칙을 따른다.

## 제품 원칙

- 목표는 STO 투자 추천이 아니라 공시와 외부 근거를 연결하는 검토 지원이다.
- 공시 사실, 외부 대조 결과, AI 설명을 구분한다.
- 모든 핵심 사실값에 출처 URL, 원문 기준일, 수집·검증 상태를 둔다.
- 근거가 부족하거나 오래됐으면 추정하지 않고 판정을 보류한다.
- 매수·매도 추천, 수익률 약속, 공식 감정·법률 검토 대체는 범위 밖이다.
- API 키와 비밀값은 서버 환경변수에만 두며 브라우저, 응답, 로그, URL에 노출하지 않는다.

## 완료 조건

변경 후 다음 명령이 모두 통과해야 한다.

```bash
npm run lint
npm exec tsc -- --noEmit
npm run build
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
