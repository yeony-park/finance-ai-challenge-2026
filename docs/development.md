# 개발 환경과 협업 가이드

## 기술 기준

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- CSS Modules 없이 현재는 작은 초기 골격을 위해 `app/globals.css` 한 파일 사용
- Node.js 22

Next.js는 2026-08-10 설치 시점의 npm 보안 권고 수정 버전인 `16.3.0`으로 고정했다. 초기 검토한 16.2.11은 PostCSS·sharp 경유 취약점이 보고되어 사용하지 않았다.

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인한다.

## Docker 실행

```bash
docker compose up --build
```

개발 컨테이너는 다음을 제공한다.

- Node.js 22 고정
- 소스 코드 bind mount와 Fast Refresh
- macOS Docker 파일 변경 감지를 위한 polling
- 컨테이너 전용 `node_modules` volume

종료:

```bash
docker compose down
```

프로덕션 이미지 검증이 필요하면 다음을 사용한다.

```bash
docker build --target runner -t sto-scope .
docker run --rm -p 3000:3000 sto-scope
```

Docker는 팀원의 로컬 환경 차이를 줄이고 배포 이미지가 만들어지는지 확인하는 용도다. 일상 개발은 로컬 `npm run dev`를 사용해도 된다.

## 라우트와 담당 파일

| URL | 파일 | 담당 |
| --- | --- | --- |
| `/` | `app/page.tsx` | 공통 |
| `/real-estate` | `app/real-estate/page.tsx` | 문수 |
| `/livestock/cattle` | `app/livestock/cattle/page.tsx` | 원준 |
| `/livestock/pig` | `app/livestock/pig/page.tsx` | 연정 |
| `/art` | `app/art/page.tsx` | 현석 |

공통 파일:

- `components/asset-page.tsx`: 자산 페이지 공통 화면 구조와 타입
- `components/copilot-demo.tsx`: 돼지 페이지 전용 Copilot 데모 상호작용
- `components/site-header.tsx`: 전역 탐색
- `components/icons.tsx`: 외부 라이브러리 없는 SVG 아이콘
- `app/globals.css`: 공통 디자인 토큰과 반응형 스타일

타이포 크기, 키 컬러, 간격과 카드·버튼 형태는 [`design-system.md`](./design-system.md)를 기준으로 한다. 자산 페이지의 `여기에 … 넣어주세요.` 문구는 각 담당자가 자신의 `page.tsx`에서 교체한다.

## 병렬 작업 규칙

1. 각자 `main`의 공통 골격을 받은 뒤 자기 기능 브랜치를 만든다.
2. 기본 브랜치 형식은 `feat/<english-kebab-case>`다.
3. 우선 자기 담당 `page.tsx`와 전용 컴포넌트만 수정한다.
4. 공통 컴포넌트·전역 CSS 변경이 필요하면 팀에 먼저 공유한다.
5. 샘플 UI를 실제 데이터로 바꿀 때 출처, 기준일, 검증 상태를 함께 구현한다.
6. API 키는 `.env.local`에 두며 Git에 커밋하지 않는다.

권장 예시:

- `feat/real-estate-verification`
- `feat/cattle-disclosure-check`
- `feat/pig-risk-copilot`
- `feat/art-disclosure-verification`

## 검증

```bash
npm run lint
npm run typecheck
npm run build
```

UI 변경은 다음 화면 너비에서 확인한다.

- 데스크톱: 1440 × 900
- 모바일: 390 × 844

최소 확인 항목:

- 모든 라우트가 직접 열리는가?
- 키보드로 주요 링크·버튼·입력에 접근 가능한가?
- 가로 스크롤이나 텍스트 잘림이 없는가?
- 실제 데이터가 아닌 값이 샘플로 명확히 표시되는가?
- 돼지 Copilot이 근거 없는 투자 결론을 표현하지 않는가?
