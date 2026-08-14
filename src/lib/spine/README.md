# 신뢰 스파인 (Trust Spine)

주제와 무관하게 재사용되는 금융 AI 서비스 공통 기반. 설계 배경은 [docs/planning/팀회의-패키지/04-공통-신뢰-스파인.md](../../../docs/planning/팀회의-패키지/04-공통-신뢰-스파인.md) 참조.

도메인 레이어(코퍼스·가드레일 규칙·레드팀 시나리오·고지 문구)는 **조각투자 공시 대조 검증** 기준으로 교체돼 있다.

## 파이프라인

```
요청 → 레이트리밋 → 입력 스크리닝(인젝션·권유 요구·단정 요구·마스킹 해제·개인정보 조회)
     → LLM(출처 계약 JSON) → 출처 강제(등록 코퍼스 밖이면 abstain)
     → 출력 필터(카나리·주민번호 마스킹·단정/권유/보장/중대성 등급 표현) → 응답
```

응답은 `SpineAnswer` 유니언 하나로 수렴: `answer(출처 포함) | abstain(공식 채널 안내) | blocked | pending_action | rate_limited`.

## 디렉토리

| 경로 | 역할 |
|---|---|
| `guardrail/` | 스크리닝 룰 카탈로그, 입력 스크리닝, 출력 필터 |
| `rag/` | 출처 레지스트리(화이트리스트)와 출처 강제 — **미등록 출처 인용 시 abstain 강등** (3세대 RAG 오염 방어) |
| `hitl/` | 실행성 행동의 확인 게이트 (보조수단성 원칙 구현) |
| `ops/` | 슬라이딩 윈도 레이트리밋 (인메모리, KV 교체 가능 인터페이스) |
| `llm/` | LLM 경계 — fake 클라이언트(키 불필요, CI·데모용) / AI SDK 어댑터(AI Gateway 경유) |
| `redteam/` | 공격 시나리오 카탈로그(금보원 레드팀 보고서의 1~4세대 프레임) + 러너 + 리포트 생성 |
| `pipeline.ts` | 전체 조립 |

## 등록 코퍼스

`rag/corpus.ts`는 서비스가 실제로 대조에 쓰는 출처만 등록한다. 여기 없는 출처를 인용하면 답변이 abstain으로 강등된다.

| id | 출처 | 종류 |
|---|---|---|
| `dart-viewer` | 전자공시시스템 DART (증권신고서·정정신고서 원문) | public_record |
| `opendart-filings` | OpenDART 공시검색 API (list.json · document.xml) | public_record |
| `livestock-trace` | 축산물이력제 개체정보 | public_record |
| `ekape-auction-price` | 축산물등급판정정보 소도체 경락가격 | public_record |
| `molit-rtms-nrg-trade` | 국토교통부 상업업무용 부동산 실거래가 | public_record |
| `capital-markets-decree-2026` | 자본시장법 시행령 2026-07-28 시행 개정 | regulation |
| `verification-methodology` | 본 서비스 검증 방법론 (`/methodology`) | service_doc |

`service_doc`은 `officialChannels()`에서 제외된다 — abstain 시 안내하는 채널은 외부 공식 출처여야 한다.

## 표현 원칙 (출력 필터가 강제)

`guardrail/output-filter.ts`가 차단하는 표현 계열. 근거: [주제 정의 §6](../../../docs/planning/주제-정의-조각투자-가치검증.md).

| 규칙 | 차단 대상 |
|---|---|
| `valuation-assertion` | "저평가다" · "고평가입니다" · "가격이 적정합니다" |
| `price-prediction` | "오를 것입니다" · "반드시 오릅니다" |
| `investment-solicitation` | "청약하세요" · "추천합니다" · "매수를 권장합니다" |
| `safety-assertion` | "안전합니다" · "위험이 없습니다" |
| `fraud-assertion` | "사기입니다" · "허위 공시입니다" · "발행사가 속였습니다" |
| `materiality-grade` | "중대한 정정" · "중대성 등급 B" · "심각도는 높습니다" (중대성 등급 없음 원칙) |
| `definitive-verdict` | "확정 판정입니다" · "100% 안전" |
| `guaranteed-return` · `impersonation` · `system-prompt-leak` | 수익 보장 · 기관 사칭 · 카나리 유출 |

부정형("적정한지는 판단하지 않습니다", "중대성 등급을 부여하지 않습니다")은 통과한다 — 고지 문구 자체가 필터를 통과하는지 테스트로 고정돼 있다.

`filterOutput(raw): OutputFilterResult` 시그니처는 `src/lib/verify/narrative/screen.ts`가 소비한다. 서술 레이어는 이 위에 더 엄격한 규칙(자기보고형 금지, 내부 판정 명칭 `불일치` 금지 등)을 얹는다.

## 실행

```bash
npm test          # 스파인 유닛/파이프라인 테스트
npm run redteam   # 레드팀 시나리오 실행 → docs/redteam/report.md 생성
```

- API 키가 없으면 자동으로 **fake 모드**(결정적 모의 응답)로 동작한다 — 팀원 로컬·CI에서 키 불필요.
- 실모델: `AI_GATEWAY_API_KEY`(권장, 모델 폴백 지원) 또는 `ANTHROPIC_API_KEY` 설정. 모델 오버라이드는 `SPINE_MODEL` (기본 `anthropic/claude-sonnet-5`).

## 설계 결정 기록

- **재사용**: 기성 TS 가드레일 라이브러리 대신 얇은 자체 계층 + Vercel AI SDK. 이유: ①TS 생태계에 성숙한 가드레일 표준 부재 ②자체 레드팀 리포트가 대회 차별화 포인트라 내부 동작을 완전히 통제할 필요 ③YAGNI.
- **fake-first**: LLM 경계를 인터페이스로 분리해 키 없이 전체 시스템이 돌게 함 — 테스트 결정성 + 팀 온보딩 비용 제로.
- **인메모리 레이트리밋**: 서버리스 인스턴스별 한계 인지하고 채택 (Fluid Compute 인스턴스 재사용으로 부분 유효). 필요 시 인터페이스 뒤에서 KV로 교체.
- **대화형 진입점 없음**: 자유 대화형 챗봇은 PRD Out of scope(council 2차)라 `/api/chat` 라우트를 제거했다. 파이프라인 전체 경로는 `npm run redteam`이 검증하고, 프로덕션 경로에서 출력 필터를 소비하는 곳은 서술 생성 레이어다.
