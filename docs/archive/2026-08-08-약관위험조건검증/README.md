# 백업 — 금융문서 위험조건 검증 (약관 주제)

> 2026-08-08 주제 전환으로 보관. 전환 후 주제: **조각투자 가치검증**(후보 F) — `docs/planning/주제-정의-조각투자-가치검증.md`

이 디렉토리는 **삭제하지 않은 이전 주제의 산출물 전체**다. 되돌리려면 `code/` 아래 경로를 원위치로 옮기면 그대로 복원된다.

## 왜 보관하는가

1. 주제 전환이 번복될 경우 즉시 복구 가능해야 한다 (이 프로젝트는 git 저장소가 아니라 파일 이동이 유일한 되돌림 수단이다)
2. 산타 리뷰·레드팀 리포트는 **주제와 무관하게 "검증 프로세스를 돌렸다"는 증빙**으로 제출물 부록에 재활용할 수 있다
3. 리서치 stream5~8의 방법론(데이터 실재성 확인 → 경쟁지형 → UX → 법적 리스크)은 새 주제에서 같은 틀로 반복한다

## 내용물

| 경로 | 내용 | 재활용 가치 |
|---|---|---|
| `planning/기획서-초안.md` | 첨부1 양식 매핑 원고 v1 | **높음** — 양식 항목별 서술 구조를 새 주제에 그대로 복사 |
| `planning/페이즈-계획.md` | 마감 역산 5단계 계획 | **높음** — 게이트 설계·리스크 보드 형식 재사용 |
| `planning/MVP-작업-브리핑.html` | 팀 발표용 브리핑 (디자인 원본) | **높음** — 시각 언어·섹션 구성 그대로 승계 |
| `design/디자인-방향.md` | 데모 UI 디자인 토큰·레퍼런스 | **높음** — 토큰은 `src/app/globals.css`에 이미 반영돼 유지 중 |
| `research/stream5~8` | 약관 주제 검증 리서치 4종 | 방법론만 (내용은 주제 종속) |
| `reviews/santa-리뷰-MVP-스켈레톤.md` | 독립 리뷰어 2인 × 3라운드 수렴 로그 | **높음** — 프로세스 증빙 |
| `redteam/report.md` | 레드팀 12/12 통과 리포트 | 중간 — 도메인 공격 3종은 재작성 필요 |
| `code/src/lib/analysis/` | 약관 분석 코어 (조항 분할·편차·법유형·등급) | 구조만 — 등급 불변식 설계는 새 코어에 이식 |
| `code/src/app/page.tsx` | 3탭 데모 UI | **높음** — "조항 카드" 좌우 분할 레이아웃을 공모 검증 카드로 전용 |
| `code/src/app/api/analyze/` | 분석 API 라우트 | 구조만 |
| `code/scripts/` | ingest(코퍼스 생성) · capture-demo | 구조만 |
| `code/data/raw/` | 시연용 가상 약관 4건 | 없음 |

## 되돌리는 법

```bash
ARC="docs/archive/2026-08-08-약관위험조건검증"
mv "$ARC/code/src/lib/analysis" src/lib/
mv "$ARC/code/src/app/api/analyze" src/app/api/
mv "$ARC/code/src/app/page.tsx" src/app/page.tsx   # 현재 임시 화면을 덮어씀 — 먼저 백업할 것
mv "$ARC/code/scripts/"* scripts/                   # scripts/ 디렉토리 재생성 필요
mv "$ARC/code/data/raw" data/
```

## 이 백업에 **들어 있지 않은** 것 (제자리 유지)

주제와 무관해 그대로 쓰는 자산이다.

- `src/lib/spine/` — 신뢰 스파인 전체 (가드레일 · 출처 강제 RAG · HITL · 레이트리밋 · 레드팀 러너)
- `src/app/globals.css` — 디자인 토큰
- `docs/competition/` — 대회 양식·규정 분석
- `docs/research/00-종합 + stream1~4` — 대회 성격·정책 동향·수상 패턴·공개 데이터 지형
- `docs/planning/` — IDI 로그, council 평결, 팀회의 패키지(후보 원페이저 5종)

## 이월된 부채 — 새 주제에서도 유효

산타 리뷰 이월 항목 중 주제와 무관하게 남는 것:

1. 레이트리미터 `hits` Map 무한 증가(만료 키 미회수) — **배포 전 필수**
2. 정규식 출력 필터의 패러프레이즈 한계 — 실모델 연결 시 LLM 2차 필터 검토
3. live 모드 GET 레이트리밋 미적용

주제 종속이라 폐기되는 이월 항목: 데모 코퍼스 '주의' 등급 예시, 실약관 도입 시 snippet 마스킹, company-defined-basis 프록시 기준선 재설계.
