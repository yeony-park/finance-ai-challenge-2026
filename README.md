# 2026 금융 AI Challenge

금융보안원 주최 [2026 금융 AI Challenge](https://daker.ai/public/hackathons/2026-finance-ai-challenge) 참가 프로젝트.
AI 기반 금융 현안 해결 웹서비스 MVP를 개발한다. **1차 제출 마감: 2026-09-07(월) 10:00.**

## 주제 — 조각투자 공시 대조 검증

**발행사가 공시한 것과 공공 데이터가 일치하는지 대조하는 독립 검증 레이어.**

실물을 보여주지 않는다 — 발행사가 이미 보여준다. 우리는 **보여준 것이 사실인지 대조한다.**

| 층위 | 검증 질문 | 데이터 |
|---|---|---|
| ① 실재성 | 신고서에 적힌 그 자산이 실제로 있는가 | 축산물이력제 (mtrace.go.kr) |
| ② 가격 적정성 | 공모가·매각가가 시장 대비 어디쯤인가 | 국토부 실거래가 · 축평원 경락가 |
| ③ 이행·조건 | 약속을 지켰나, 불리한 조건이 숨어 있나 | DART 전수 + 플랫폼 공시 |

LLM의 자리는 **비정형 신고서에서 검증 가능한 주장(claim)을 뽑아내는 것**이다. 이게 ①②③의 정량 대조를 성립시키는 전제다.

상세: [`docs/planning/주제-정의-조각투자-가치검증.md`](docs/planning/주제-정의-조각투자-가치검증.md) · 근거: [`docs/research/조각투자-검증리서치-2026-08-08.md`](docs/research/조각투자-검증리서치-2026-08-08.md)

## 현재 상태 (2026-08-10)

- ✅ 도메인 리서치 (`docs/research/`) · 대회 양식 분석 (`docs/competition/`)
- ✅ **신뢰 스파인** — 주제 무관 공통 기반 (`src/lib/spine/`). 테스트 60건 · 레드팀 12/12 통과
- 🔄 **주제 전환** — 금융문서 위험조건 검증 → 조각투자. 이전 산출물은 [`docs/archive/2026-08-08-약관위험조건검증/`](docs/archive/2026-08-08-약관위험조건검증/)에 보관
- ✅ **Phase 0 완료** — 죽는 조건 3건 중 2건 통과, 1건(비교군 충분성) Phase 1 이월
- ✅ **Phase 0 잔여 완료 (8/10)** — 축산물이력제·축평원 경락가 오픈API **자동승인 확보**, 프랩 검증 기능 **미보유 확인**. 게이트 통과 → **2축 그대로 진행** ([확인 기록](docs/research/phase0-잔여확인-2026-08-10.md))
- ✅ **Phase 1 게이트 조기 통과 (8/10)** — DART C005 수집 경로 실증 + 신고서 3사 구조 실측 + **뱅카우 9호 37두 실호출 대조 완료: 36/37 일치, 1두(학산 24호) 불일치 발견** ([실측](docs/research/신고서-구조-실측-2026-08-10.md) · [실호출](docs/research/phase1-게이트-실호출-2026-08-10.md))
- ✅ **리서치·평결 5건 (8/10 오후)** — 마켓 리서치(시장 반론 방어), 실사용자 후기 전수조사, 공시 감시 공백 드릴다운(정정 65%·공모당 2.4회 실측), council 3차(기획서 항목)·4차(정정 재검증) ([`docs/research/`](docs/research/) · [`docs/planning/`](docs/planning/))
- ✅ **PRD v1.2** — 문제 정의를 "감시 공백" 축으로 재구성, 정정 재검증(중대성 등급 없음) 편입 ([`.claude/prds/disclosure-verification.prd.md`](.claude/prds/disclosure-verification.prd.md))
- ✅ **데모 목업 v4** — 조각투자 핀테크 프로덕트 룩 전면 재구성 (뮤직카우·프랩 실물 레퍼런스 실측 기반)
- ⏳ **Phase 1 본작업 (8/11~8/18)** — DART 수집기·파서·어댑터 구현 (어댑터 구현 계약 10건은 실호출 문서에 확정, 플랜: [`.claude/plans/disclosure-verification.plan.md`](.claude/plans/disclosure-verification.plan.md))
- ⏳ 스파인 도메인 레이어(코퍼스·레드팀 시나리오·고지 문구)는 아직 약관 주제 기준 — Phase 2에서 교체

**데모 2축**: 뱅카우 한우 9호(청약 8/27~9/10, 심사 기간과 겹침) 라이브 검증 + 카사 10개 건물 사후 검증

계획: [`docs/planning/페이즈-계획.md`](docs/planning/페이즈-계획.md)

## 빠른 시작

```bash
npm install
npm run dev       # API 키 없이 fake 모드로 동작
npm test          # 스파인 유닛/파이프라인 테스트
npm run redteam   # 자체 레드팀 실행 → docs/redteam/report.md
npm run verify    # 검증 파이프라인 완주 (fake 모드 — 키 없이 동작)
```

경락가 월 집계는 **사전 수집 후 커밋**한다 — 축평원 등급판정정보 개발계정이 일 1,000건이라
판정·화면·재검증은 캐시(`data/reference/auction-price/`)만 읽는다.

```bash
npm run reference:collect   # 실키 전용 · 호출 수 = 월 수 × 성별 수 (기본 4×3 = 12건)
```

실모델 연결은 `.env.example` 참조 (`AI_GATEWAY_API_KEY` 권장).

> `npm run dev`는 서비스 화면을 띄운다 — 랜딩(`/`), 검증 방법(`/methodology`), 검증 리포트 상세(`/offers/[id]`).
> 화면에 찍히는 수치·문구는 전부 검증 엔진 산출 리포트(`data/public/{offerId}/report-*.json`)에서 파생되며 익명화가 적용된 상태다.

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/spine/` | 신뢰 스파인: 인젝션 가드레일 · 출처 강제 RAG · HITL · 레이트리밋 · 레드팀 러너 ([README](src/lib/spine/README.md)) |
| `src/app/` | Next.js App Router — `/api/chat`, `/api/health` |
| `docs/competition/` | 대회 규정·양식 분석 |
| `docs/research/` | 리서치 스트림 1~4 + 종합 보고서 (주제 무관) |
| `docs/planning/` | 주제 정의, 페이즈 계획, IDI 로그, council 평결, 팀 회의 패키지 |
| `docs/archive/` | 이전 주제 산출물 백업 (복구 절차 포함) |
