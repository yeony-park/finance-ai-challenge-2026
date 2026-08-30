---
scope: 전 작업 공통
read-when: 항상 (이 레포에서 코드·문안·데이터를 만지는 모든 세션)
source-of-truth: src/lib/verify/types.ts · report/mask.ts · docs/spec/02·04·05
---

# 공통 불변식 (INV)

## 데이터 흐름

- **R-INV-01 (MUST)** 화면의 모든 수치·문구는 사전 생성 캐시(`data/public/`·`data/reference/`·`data/offers/`·`src/lib/content/`)에서만 파생한다. 렌더 경로에서 외부 API·DB 호출 금지. 유일 예외: `POST /api/verify/[id]` 라이브 재대조, (M2+) `POST /api/search`.
- **R-INV-02 (MUST)** 개인정보 포함 원천(`data/raw/`·`data/snapshots/`·`data/reports/`)은 로컬 전용. 커밋 대상은 마스킹 완료 `data/public/`, `data/reference/`, `data/offers/`, 자동 생성 `data/MANIFEST.md`뿐. `data/MANIFEST.md` 직접 수정 금지 — `npm run data:manifest`.
- **R-INV-03 (MUST)** 공개 산출물 생성은 마스킹 2단(`report/mask.ts` → `residual.ts`) + 익명화 게이트 테스트(브랜드·실명·주소 누출 0건) 통과 후에만. DB·스크립트 유래라고 우회 불가.
- **R-INV-04 (MUST)** fake 모드 `verify`는 `--publish` 없이 `data/scratch-fake/`에만 쓴다. `data/public/` 직접 쓰기 금지 (오염 사고 2회 이력).
- **R-INV-05 (MUST)** 키·DB 없이 `npm run build`·`npm test`·`npm run verify`가 완주해야 한다. 새 외부 의존에는 fake 트윈 또는 부재 시 동작 정의가 필수.

## 판정·표현

- **R-INV-06 (MUST)** 판정은 3값뿐: `match`="일치", `mismatch`="원장 불일치", `unverifiable`="대조 불가". "미확인"은 unverifiable 전용 표기. 투자 등급·점수·배지·게이지·비율 표시 금지 — 건수 나열만 허용.
- **R-INV-07 (MUST)** 근거 0건이면 판정하지 않는다(`createJudgement` 타입 강제 — 우회 금지). LLM 단독 추출은 절대 판정에 이르지 못한다(교차검증 agreed만 신뢰).
- **R-INV-08 (MUST)** 검증 리포트·공모 목록 화면 문장의 주어는 공모·자산이다 — 서비스 자기보고("저희가 검증했습니다" 류) 금지. 시작 촉구·권유 문안 금지. 서비스 서술은 `/methodology`와 홈 한정, `docs/spec/04` 준수.
- **R-INV-09 (MUST)** 신규 사용자 대면 문안은 `src/lib/content/`에 두고 출력 필터 감사 테스트를 통과시킨다. 컴포넌트에 문안 하드코딩 금지.
- **R-INV-10 (MUST)** 실명은 `05-data-policy.md` 예외 목록(법정 공시 법인 발행인명 등)만. 자연인 비공시 정보는 화면·외부 AI 모델 어디에도 금지. 공개 슬러그는 중립 id(`cattle-N`·`art-N` 형식).
- **R-INV-11 (금지)** 크롤링·스크린 스크래핑 수집(신호등 Red), Yellow 미확인분의 화면 재표시, 제3자 호스팅 이미지 렌더링(핫링크 포함), 외부 페이지 iframe. 단, [ADR-0001](../docs/decisions/ADR-0001-temporary-art-image-exception.md)에 기록된 미술품 4건의 정확한 URL은 사용자 승인에 따른 임시 데모 예외이며 다른 호스트·경로로 확장하지 않는다.

## AI 경계

- **R-INV-12 (MUST)** 모든 AI 표면은 스파인 전 경로(레이트리밋 → 입력 스크리닝 → LLM → 출처 강제 → 출력 필터)를 통과한다. 출력 필터만 떼어 쓰기 금지. 인용은 코퍼스(`spine/rag/corpus.ts`) 등록분만 — 미등록이면 abstain.
- **R-INV-13 (MUST)** 코퍼스·ClaimKind 신규 등록은 오너 일괄 반영 — 담당자는 디스크립터의 `proposedSources`·`proposedClaimKinds`로 선언만 한다. 기존 파일 무수정 원칙.

## 작업 방식

- **R-INV-14 (MUST)** 코드 주석은 기능성 프래그마만(산문 주석 금지). 서브에이전트 위임 프롬프트에 이 조항과 `git restore`/`git checkout` 금지를 명시한다.
- **R-INV-15 (MUST)** 판정 규칙·마스킹·공개 경로·스키마 변경과 사고는 `docs/worklog/`에 4섹션(결정과 근거/트레이드오프/검증 영향/알려진 한계)으로 병행 기록.
- **R-INV-16 (MUST)** 커밋은 conventional commits(feat/fix/data/docs/…) + 한국어 설명. 스타일 파일 대량 수정은 시각 검증 없이 완료 처리 금지.
