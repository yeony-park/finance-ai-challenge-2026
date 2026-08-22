# OpenDART AI 실사 구현

## 목적

OpenDART 원문에서 상품 필드 후보를 찾고, 검증된 근거와 위험 규칙을 사용해 정정공시 변화와 남은 위험을 설명한다. AI 출력은 검증 후보 또는 설명이며 상품 원값과 최종 판정을 직접 변경하지 않는다.

## AI가 사용되는 위치

1. **공시 필드 후보 추출**: 검증된 ZIP/XML의 제한된 chunk에서 허용 필드와 정확한 원문 quote를 연결한다.
2. **정정·위험 설명**: 확정 Fact, CorrectionDiff, RiskSignal ID만 인용해 쉬운 설명을 만든다.
3. **상품 Q&A**: 공개된 상품별 fact block만 검색 범위로 사용하고 답변 block마다 정확한 quote를 인용한다.

금액·날짜·단위 파싱, 상품/시리즈 식별, Evidence ID 발급, 정정 계보 승인, 계산과 위험등급은 결정적 애플리케이션 코드가 담당한다.

## 실행 경계

- `lib/art/dart/`: OpenDART transport, ZIP/XML 안전성, immutable artifact와 hash
- `lib/art/ai/`: 도구 없는 Responses API 호출, Structured Output, grounding 검증
- `lib/art/risk/`: 승인된 사실과 정정만 사용하는 순수 위험 규칙
- `lib/art/review/`: 상품별 fact adapter, AI preview와 공개 projection

`AI_MODE=live`이고 서버 키가 있을 때만 모델을 호출한다. 실패하거나 demo 모드이면 검증된 저장 사실과 결정적 fallback을 유지한다.

## 공개 정책

- AI 추출 결과는 기본적으로 `candidate_only`, `published: false`다.
- 원문 XML, prompt, API key, provider 오류는 API 응답에 넣지 않는다.
- 존재하지 않는 ID, 인용 불일치, field/value의 가장 가까운 선행 문맥 불일치, 지원되지 않는 숫자, 상품/버전 불일치는 응답 전체를 폐기한다.
- 현재 Q&A와 정정·위험 문구는 의미 모순과 숫자-필드 바꿔치기를 막기 위해 전체 fact block을 그대로 선택하는 extractive 모드다. 의미 entailment 검증기 없이 AI paraphrase를 공개하지 않는다.
- 핵심 정보가 결측·충돌·만료 상태면 `decisionStatus: not_assessed`, `verdict: null`을 유지한다.
- 전체 원문은 저장하지 않고 hash, member 경로, 허용된 quote와 검증 결과만 공개한다.

## 현재 공개 범위

- 하종현 상품의 final/correction/result receipt를 manifest로 연결했다. 문서 역할과 계보는 `unreviewed`이며 자동 게시를 금지한다.
- 검토되지 않은 correction 문서가 있으면 결정적 위험 입력에 pending 계보 항목을 추가해 `unapproved_correction` blocker와 `not_assessed`를 유지한다. 이는 금액 변경을 추정하거나 승인한다는 뜻이 아니다.
- API는 제한된 JSON body, 상품별 동시 실행 차단과 cooldown, timeout, 1회 안전 재시도, `Cache-Control: no-store`를 사용한다. 현재 rate guard는 단일 서버 프로세스 범위이므로 다중 인스턴스 배포 전 공유 rate limiter가 필요하다.
