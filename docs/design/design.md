# Design — 메인 페이지 기준

`feat/integration-user-flow` · 홈(`/`) 기준. 화면이 실제로 쓰고 있는 토큰·컴포넌트·상호작용을
코드에서 그대로 옮긴 문서다. 시각 시트: [`styleguide.png`](styleguide.png)

| 문서 | 역할 |
|---|---|
| [`design-system.md`](design-system.md) | **결정** — 어떤 계보를 쓸지, 무엇을 금지할지 (오너·팀 합의 대상) |
| `design.md` (이 문서) | **현황** — 메인 페이지가 지금 어떻게 만들어져 있는지 |
| [`../userflow.md`](../userflow.md) | 화면 전환·분기 |

값의 단일 진실은 `src/styles/tokens.css`다. 이 문서는 값을 요약하되, 충돌 시 코드가 이긴다.

---

## 1. 원칙

이 서비스는 등급도 추천도 내지 않는다. **공시에 적힌 내용이 공공 원장과 일치하는지**만 기록한다.
디자인은 그 성격을 따라간다 — 광고물이 아니라 기록물의 외형을 갖는다.

- **판정은 세 값** — `일치` · `원장 불일치` · `대조 불가`. 근거가 0건이면 판정하지 않는다.
- **모르는 것은 모른다고 표시** — 자리표시 수치를 넣지 않고 "대조 불가" · "선언 대기"로 남긴다.
- **색은 정보** — 노랑은 강조 1색, 판정 3색은 판정 전용. 그 외에 색으로 의미를 만들지 않는다.
- **면보다 선** — 구분은 그림자가 아니라 1px 경계선으로 한다. 그림자는 사진 카드 hover 정도.
- **아이콘 0** (2026-08-22 오너 결정) — 재료는 타이포 · 기하 · 사진 3종.

---

## 2. 토큰

### 색

| 축 | 토큰 | 값 | 쓰임 |
|---|---|---|---|
| 표면 | `--ds-bg` | `#fdfdfc` | 기본 배경 |
| | `--ds-bg-muted` | `#f6f6f2` | 교차 섹션 · 푸터 |
| | `--ds-surface` | `#ffffff` | 카드 · 다이얼로그 |
| 선 | `--ds-line` | `#e4e4de` | 기본 경계 |
| | `--ds-line-strong` | `#c9c9c0` | 강조 경계 · 보조 버튼 |
| 잉크 | `--ds-ink` | `#171717` | 본문 · 제목 |
| | `--ds-ink-muted` | `#5d6062` | 리드 · 설명 |
| | `--ds-ink-faint` | `#858984` | 출처 · 시각 (mono와 함께) |
| | `--ds-ink-invert` | `#fbfbf9` | 어두운 면 글자 |
| 강조 | `--ds-accent` | `#ffe14d` | 하이라이트 밑줄 · 링크 하단선 |
| | `--ds-accent-soft` / `-line` / `-ink` | `#fff6cc` / `#f0cf3c` / `#4a3d00` | 배지 3종 조합 |
| 판정 | `--ds-verdict-match` | `#2f7a5b` | 일치 |
| | `--ds-verdict-miss` | `#b93a32` | 원장 불일치 |
| | `--ds-verdict-unknown` | `#6b7280` | 대조 불가 |
| 히어로 | `--ds-hero-dark` | `#07111d` | 홈 첫 화면 바탕 |

판정 3색에는 각각 `-soft`(면) · `-line`(테두리)이 있다. **색만으로 판정을 전달하지 않는다** —
항상 어휘를 함께 쓴다.

### 타이포

세 서체 모두 `next/font/google`로 셀프 호스팅한다 (`src/app/layout.tsx`).

| 역할 | 서체 | 굵기 | 쓰임 |
|---|---|---|---|
| 본문 | Noto Sans KR | 400 · 500 · 700 · 900 | 전 표면 |
| 인용 | Noto Serif KR | 400 · 600 · 700 | `/methodology` 인용 1곳뿐 |
| 메타 | IBM Plex Mono | 400 · 500 | 출처 · 시각 · rcpNo · 라벨 |

- 본문 기본값 `--ds-text-base` = 17px, 행간 1.62, 자간 -0.015em
- 제목은 전부 자간 -0.03em + 행간 1.22. 히어로 제목만 -0.045em으로 더 조인다
- 제목 스케일은 `clamp()` 반응형 — h1 36→48px, h2 26→34px, h3 22→26px
- 섹션 제목은 `weight-black(900)`, 카드 제목은 `weight-bold(700)`
- 한국어 본문은 전부 `word-break: keep-all`

### 간격 · 형태

- 간격 10단계: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 88px
- 섹션 상하 `--ds-section-y-tight` 44→80px, 좌우 `--ds-gutter` 18→48px
- 컨테이너 `--ds-maxw` 1320px, 산문 폭 62ch
- 모서리: 카드 `lg(12px)` · 검색과 버튼 `pill(999px)` · 검색 결과 패널만 `panel(20px)`
- 그림자 3단계가 있지만 실제로는 거의 안 쓴다 (사진 카드 hover에 `shadow-lg`)

### 모션

| 토큰 | 값 | 쓰임 |
|---|---|---|
| `--ds-duration-fast` | 120ms | 색 전환 · 섹션 다이얼 |
| `--ds-duration-base` | 200ms | 링크 화살표 · 테두리 |
| `--ds-duration-slow` | 380ms | 패널 열림 |
| `--ds-ease` | `cubic-bezier(.2 .7 .3 1)` | CSS 전 구간 |
| `MOTION_RISE` | 14px | Reveal 등장 거리 |
| 스테이지 스냅 | 440ms | 홈 5구간 휠 스냅 |

`prefers-reduced-motion: reduce`면 duration이 전부 1ms로 떨어지고, 휠 스냅과
`scroll-behavior: smooth`도 걸리지 않는다.

---

## 3. 메인 페이지 해부

`src/app/page.tsx`는 다섯 컴포넌트를 순서대로 쌓는다. 휠 스크롤은 이 다섯 구간으로 스냅되고,
우측 세로 다이얼(0.45rem 점 5개)로도 이동할 수 있다.

### ① 히어로 — `HomeHero`

가장 손이 많이 들어간 구간이다. 스크롤 0→120px 동안 세 가지가 동시에 일어난다.

1. 3D 공시 이미지가 전면(100%)에서 최대 528px 프레임으로 축소되며 모서리가 20px까지 둥글어진다
2. 제목이 좌우로 갈라지고(`heroTitlePrefix` / `heroTitleQuestion`) 그 사이에 이미지가 앉는다
3. 배경·헤더·글자색이 `hero-dark`에서 `bg`/`ink`로 `color-mix()` 보간된다

축소가 끝나면 프레임 크기를 고정(`settledFrameRef`)해 재계산 떨림을 막는다.

- **제목**: `heroTitle` — 최대 17ch, `--ds-accent` 그라디언트 밑줄(`.mark`, 높이 0.32em)
- **검색**: `searchInput` — pill, `accent-line-soft` 테두리, 포커스 시 `accent-line`.
  포커스하면 예시 질문 3개가 아래로 뜬다
- **답변 패널**: `panel` — `surface-glass`(88% 흰색) + `blur(16px)` + `radius-panel`
- **스크롤 큐**: 하단 중앙 `↓ SCROLL`, mono + 자간 0.18em

### ② 카테고리별 확인 현황 — `CategoryGrid`

- `sectionHead`는 2열 그리드(제목 0.92fr / 리드 1.08fr) + 상단 1px 경계선
- 카드 4장(미술품 · 한우 · 한돈 · 부동산), 각각 사진 + 번호(`01`~`04`) + 설명 2줄 + 링크
- hover 시 사진만 `scale(1.075)`, 프레임에 `shadow-lg`
- 온보딩에서 고른 카테고리에는 `checkTag` 배지(accent 3종 조합)가 붙는다

### ③ 조각투자 첫걸음 — `IntroBand`

- 유일하게 `bg-muted` 바탕인 구간 — 섹션 리듬의 대비를 만든다
- 카드 5장(첫걸음 4 + 검증 방법 1)이 가로로 놓이고, 활성 카드만 본문·출처·링크를 편다
- 30초 자동 전환. 번호 링(`roadNo`, 48px SVG)이 남은 시간을 그린다
- 980px 이하에서는 가로 스크롤 + `scroll-snap-align: center`로 바뀐다

### ④ 관심 공모 정정 감시 — `WatchBand`

- `gongsi.watchlist.v1`에 등록된 공모가 하나도 없으면 **섹션 자체가 렌더되지 않는다**
- 행마다 공모명(bold) · 정정 건수와 최근 대조 시각(muted) · 노랑 밑줄 링크

### ⑤ 확인 질문 8가지 — `ChecklistBand`

- `details`/`summary` 아코디언. 경계선만 있고 면이 없다
- 열리면 제목에 노랑 밑줄이 깔린다(`.mark`와 같은 그라디언트 트릭, 0.28em)
- 온보딩에서 고른 관심사 항목이 맨 위로 정렬되고 `관심사` 배지가 붙는다
- 각 항목 안에 공적 출처 링크(mono)와 최신 공모 리포트 챕터 링크가 함께 있다

### 사이트 셸

- 헤더 64px 고정. 홈에서는 스크롤 진행률에 따라 배경·글자색이 보간된다
- 현재 페이지 네비에 노랑 2px 언더바
- 워드마크의 `Jeom` 절반에 노랑 밑줄, hover 시 100%까지 늘어난다
- 첫 요소는 `본문으로 건너뛰기` 스킵 링크 (포커스 시에만 나타남)

---

## 4. 컴포넌트 인벤토리

| 클래스 | 형태 | 토큰 |
|---|---|---|
| `.chip` | 밑줄형 버튼, 최소 높이 2.25rem | 선택 시 `accent-line` 2px, `aria-pressed` 연동 |
| `.checkTag` | 작은 배지 | `accent-soft` 면 + `accent-line` 선 + `accent-ink` 글자, mono |
| `.searchInput` | pill 입력 | `accent-line-soft` → 포커스 `accent-line` |
| `.panel` | 유리면 패널 | `surface-glass` + `blur(16px)` + `radius-panel` |
| `.panelLink` `.categoryReportLink` `.bandLink` `.watchLink` | 강조 링크 | 노랑 2px 밑줄, hover 시 화살표 간격 0.65rem |
| `.sourceList` | 출처 목록 | mono + `text-2xs` + `ink-faint` |
| `.checkItem` | 아코디언 | 하단 1px 선, 열리면 제목에 노랑 밑줄 |
| `.watchRow` | 감시 행 | 하단 1px 선, 3단 텍스트 위계 |
| `.roadStep` | 로드맵 카드 | `radius 1.75~2.75rem`, `bg-muted` 면 |
| `.obDialog` | 온보딩 | `min(38rem,100%)`, `radius-lg`, `shadow-md` |
| `.navLink` | 네비 | 현재 페이지에 노랑 2px 언더바 |

버튼은 두 종류뿐이다 — **주** ink 면 + `ink-invert` 글자 + pill, **보조** `line-strong` 테두리 + pill.

---

## 5. 반응형

| 폭 | 바뀌는 것 |
|---|---|
| 1100px | 카테고리 그리드 4열 → 2열 |
| 1024px | 히어로 이미지가 제목 사이가 아니라 위아래로 쌓임 (`HERO_FRAME_BREAKPOINT`) |
| 980px | 로드맵이 가로 스크롤 + 스냅으로 전환 |
| 760px | 섹션 헤드 2열 → 1열, 네비 가로 스크롤 |
| 640px | 카테고리 그리드 1열 |
| 460px | 네비 최대 폭 60vw로 축소 |

터치 타겟 최소값은 `--ds-tap-min` 2.75rem이다.

---

## 6. 접근성

- 포커스 링은 전역 `--ds-focus-ring`(바탕 2px + ink 2px) 하나로 통일 — 컴포넌트별로 다르지 않다
- 모든 섹션이 `aria-labelledby`로 제목과 묶여 있고, 다이얼·칩·토글에 `aria-label` / `aria-pressed`
- 검색 결과는 `aria-live="polite"` 영역에 들어간다
- 선택 색(`::selection`)도 노랑 accent
- 판정은 색 + 어휘를 항상 함께 쓴다 (색맹 대응)

---

## 7. 알려진 드리프트

문서와 코드가 어긋난 지점. 손대기 전에 확인할 것.

1. **홈 히어로가 조각 클러스터가 아니다.** `design-system.md`는 마름모 조각 클러스터를
   홈 히어로 문법으로 규정하지만, 현재 `HomeHero`는 3D 이미지(`/sto-disclosure-hero-v2.png`)
   축소 연출을 쓴다. `HeroShards.tsx`는 파일만 남고 **어디서도 import되지 않는다** —
   퇴역시키거나 문서를 갱신해야 한다.
2. **아이콘 0 규칙의 예외 1건.** 검색 버튼에 인라인 SVG 돋보기가 남아 있다
   (`HomeHero`의 `searchIcon`). 기능 아이콘으로 허용할지 정리 필요.
3. **한국어 서브셋이 preload되지 않는다.** `layout.tsx`의 세 폰트가 모두
   `subsets: ["latin"]`이라, 빌드 산출물에는 한글 슬라이스가 포함되지만(`.next` CSS의
   `@font-face` 881개 중 한글 커버 블록 존재) `preload` 대상은 라틴 4개뿐이다.
   결과적으로 한글은 CSS 파싱 후 지연 로드되어 첫 페인트에서 폴백
   (`Apple SD Gothic Neo`)이 잠깐 보일 수 있다. `"korean"`을 서브셋에 추가하면
   preload되지만 슬라이스 수가 많아 초기 요청이 늘어난다 — 트레이드오프 판단 필요.

---

## 8. 규칙

**이렇게**

- 색·크기·간격은 반드시 `--ds-*` 토큰에서 가져온다
- 강조는 노랑 1색 — 밑줄, 배지, 링크 하단선까지만
- 판정색은 항상 어휘와 함께 쓴다
- 메타데이터(출처 · 시각 · rcpNo)는 mono + `text-2xs` + `ink-faint`
- 한국어 본문에는 `word-break: keep-all`
- 구분은 그림자보다 1px 경계선으로

**이렇게는 안 됨**

- 카테고리마다 고유 색 테마를 추가하는 것
- 큰 면을 노랑으로 채우는 것
- 장식·식별 아이콘 추가
- 판정 3색을 브랜드 장식이나 상태 아닌 정보에 쓰는 것
- 데이터 연결 전 자리표시 수치를 넣는 것 — "선언 대기"로 남긴다
- 화면에 하드코딩된 hex · px 값

화면 문안은 `docs/spec/04-expression-rules.md`를 따르고, 신규 문안은 `src/lib/content/`
모듈 + 출력 필터 감사 테스트를 거친다.

---

## 참조 구현

- 토큰: `src/styles/tokens.css` · 전역: `src/app/globals.css`
- 홈: `src/components/home/` (`home.module.css` 1,854줄)
- 셸: `src/components/site/shell.module.css`
- 모션: `src/components/motion/tokens.ts`
