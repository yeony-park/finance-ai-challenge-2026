# 신뢰 스파인 (Trust Spine)

주제와 무관하게 재사용되는 금융 AI 서비스 공통 기반. 설계 배경은 [docs/planning/팀회의-패키지/04-공통-신뢰-스파인.md](../../../docs/planning/팀회의-패키지/04-공통-신뢰-스파인.md) 참조.

## 파이프라인

```
요청 → 레이트리밋 → 입력 스크리닝(인젝션 룰) → LLM(출처 계약 JSON)
     → 출처 강제(등록 코퍼스 밖이면 abstain) → 출력 필터(카나리·마스킹·금지 주장) → 응답
```

응답은 `SpineAnswer` 유니언 하나로 수렴: `answer(출처 포함) | abstain(공식 채널 안내) | blocked | pending_action | rate_limited`.

## 디렉토리

| 경로 | 역할 |
|---|---|
| `guardrail/` | 인젝션 룰 카탈로그, 입력 스크리닝, 출력 필터(카나리 유출·주민번호 마스킹·금지 주장) |
| `rag/` | 출처 레지스트리(화이트리스트)와 출처 강제 — **미등록 출처 인용 시 abstain 강등** (3세대 RAG 오염 방어) |
| `hitl/` | 실행성 행동의 확인 게이트 (보조수단성 원칙 구현) |
| `ops/` | 슬라이딩 윈도 레이트리밋 (인메모리, KV 교체 가능 인터페이스) |
| `llm/` | LLM 경계 — fake 클라이언트(키 불필요, CI·데모용) / AI SDK 어댑터(AI Gateway 경유) |
| `redteam/` | 공격 시나리오 카탈로그(금보원 레드팀 보고서의 1~4세대 프레임) + 러너 + 리포트 생성 |
| `pipeline.ts` | 전체 조립 |

## 실행

```bash
npm test          # 26개 유닛/파이프라인 테스트
npm run redteam   # 레드팀 시나리오 실행 → docs/redteam/report.md 생성
npm run dev       # 데모 UI (http://localhost:3000)
```

- API 키가 없으면 자동으로 **fake 모드**(결정적 모의 응답)로 동작한다 — 팀원 로컬·CI에서 키 불필요.
- 실모델: `AI_GATEWAY_API_KEY`(권장, 모델 폴백 지원) 또는 `ANTHROPIC_API_KEY` 설정. 모델 오버라이드는 `SPINE_MODEL` (기본 `anthropic/claude-sonnet-5`).

## 주제 확정 후 할 일

1. `rag/corpus.ts`의 샘플 코퍼스를 실제 도메인 문서로 교체 (인터페이스 유지)
2. `llm/client.ts`의 fake 응답을 도메인 시나리오로 갱신
3. `redteam/scenarios.ts`에 도메인 특화 공격 추가 (예: 비자 오정보 유도, 지급정지 오안내 유도)
4. `hitl/actions.ts`에 실제 실행성 액션(서류 초안 확정 등) 핸들러 등록
5. 레이트리밋을 KV 백엔드로 교체 검토 (심사 기간 다중 인스턴스 대비)

## 설계 결정 기록

- **재사용**: 기성 TS 가드레일 라이브러리 대신 얇은 자체 계층 + Vercel AI SDK. 이유: ①TS 생태계에 성숙한 가드레일 표준 부재 ②자체 레드팀 리포트가 대회 차별화 포인트라 내부 동작을 완전히 통제할 필요 ③YAGNI.
- **fake-first**: LLM 경계를 인터페이스로 분리해 키 없이 전체 시스템이 돌게 함 — 테스트 결정성 + 팀 온보딩 비용 제로.
- **인메모리 레이트리밋**: 서버리스 인스턴스별 한계 인지하고 채택 (Fluid Compute 인스턴스 재사용으로 부분 유효). 필요 시 인터페이스 뒤에서 KV로 교체.
