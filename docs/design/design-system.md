# JeomJeom 디자인 시스템 (단일 기준: 검증 리포트 계보)

> 2026-08-16 오너 결정: 전 표면을 **검증 리포트 UI/UX(`--ds-*` 토큰)** 기준으로 통일한다.
> 근거 — 리포트가 곧 제품이며(홈은 리포트로 가는 입구), 42커밋에 걸쳐 검증된 실전 체계이고,
> "제3자 검증 기록"이라는 차별성 서사에 문서·기록물 미학이 정합한다.
> main 계보 `docs/design-system.md`(#024ad8 단일 블루)는 검토 후 미채택 — M2 초기 구현에
> 잠정 적용했다가 이 결정으로 대체했다(worklog `integration-m2.md` 재스킨 항목).
> `[팀 결정 대기]` — 기본값 변경이므로 `docs/spec/00-overview.md` 결정 표에 반영, 팀 합의 대상.

## 토큰 단일 진실

`src/styles/tokens.css`의 `--ds-*`가 유일한 토큰 원천이다 — 이 문서에 값을 중복 기재하지
않는다(문서-코드 불일치 방지). 새 표면이 색·크기·간격 숫자를 직접 쓰는 것을 금지한다.

## 두 밀도 정책 (같은 토큰, 다른 밀도)

| 표면 | 밀도 | 특징 |
|---|---|---|
| 검증 리포트·목록 (`/offers`, `/offers/[id]`, `/methodology`) | 문서 밀도 | 판정 숫자·개체 표·mono 메타데이터 촘촘히 |
| 홈(`/`)·카테고리 착지(`/cattle` 등) | 안내 밀도 | 같은 토큰으로 여백·행간을 넉넉하게, 카드·질문 중심 |

## 핵심 어휘 (관례로 굳은 사용법)

- **노랑 강조(`--ds-accent`)**: 하이라이트 밑줄(`.mark` — background-image 그라디언트 트릭),
  중요 배지(`accent-soft` 면 + `accent-line` 테두리 + `accent-ink` 글자), 링크 밑줄(2px).
  큰 면을 노랑으로 채우지 않는다.
- **판정 상태색(`--ds-verdict-*`)**: 판정 3값 전용(일치 초록·원장 불일치 빨강·대조 불가 회색).
  브랜드 장식·상태 아닌 정보에 쓰지 않고, 색만으로 의미를 전달하지 않는다.
- **CTA·버튼**: ink 면 + `ink-invert` 글자 + pill 모서리(쉬운 설명 토글·검색 버튼 계열).
  보조 버튼은 `line-strong` 테두리 pill(관심 등록 토글 계열).
- **칩·배지**: pill 또는 `radius-sm`, 선택 상태는 accent 3종 조합(`aria-pressed` 연동).
- **카드**: `line` 테두리 + `radius-lg` + `surface` 면 + `shadow-sm`, hover 시
  `line-strong`+`shadow-md` (offerCard 관례).
- **메타데이터**: `--ds-font-mono` + `text-2xs` + `ink-faint` (출처·시각·모드 표기).
- **섹션 리듬**: `bg`(흰) ↔ `bg-muted`(종이톤, `border-block: line`) 교차, 끝은 ink 푸터.
- **타이포**: 제목 `weight-black` + `tracking-tight`, 본문 `leading-relaxed`,
  한국어 개행은 `word-break: keep-all`. display는 홈 hero 전용.

## 페이지 작성 규칙 (카테고리 담당자)

- 착지 페이지는 공통 셸(`CategoryLanding`)의 계약 슬롯 5종을 유지하고, `custom` 슬롯 안에서만
  자유 구성한다 (`docs/spec/01-category-contract.md`).
- 실데이터 연결 전 상태는 "선언 대기"·"연결 대기"류로 정직 표기 — 자리표시 수치 금지.
- 개별 자산의 색상 테마를 추가하지 않는다. 공통 토큰 변경은 팀 공유 후 진행한다.
- 화면 문안은 `docs/spec/04-expression-rules.md`를 따르고, 신규 문안은
  `src/lib/content/` 모듈 + 출력 필터 감사 테스트를 거친다.

## 참조 구현

- 문서 밀도: `src/components/report/` + `src/components/landing/landing.module.css`
- 안내 밀도: `src/components/home/home.module.css` + `src/components/category/category.module.css`
- 사이트 셸: `src/components/site/shell.module.css`
