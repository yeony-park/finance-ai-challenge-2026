# AI 요약·Copilot 프론트 연결

네 카테고리의 상품 상세는 **상품 헤더 → 분석 탭 → 선택한 탭의 내용** 순서다.
AI 요약은 ‘요약’ 탭의 첫 내용이며, 다른 분석 탭에서는 표시하지 않는다.
본문 폭과 좌우 여백은 페이지 컨테이너가 정한다. `ProductAiSummary`는 부모 폭을 채우고,
탭 아래에 `--ds-content-gap`(24–32px)만 둔다. 다음 섹션도 이 토큰으로 시작 간격을 정하며,
요약 자체의 하단 마진이나 `AiPanel`의 내부 패딩을 더하지 않는다.
`AiPanel`은 테두리·카드 배경 없이 제목과 글자 크기를 공유한다.
Copilot은 오른쪽 아래 버튼으로 여는 별도 패널이다. 모바일에서는 화면 폭에 맞춰 표시한다.

## 연결할 컴포넌트

| 담당 | 파일 | 연결 지점 |
| --- | --- | --- |
| 요약 배치 | `src/components/ai-assistant/ProductAiSummary.tsx` | `children: ReactNode` |
| Copilot 열기·닫기 | `src/components/ai-assistant/ProductCopilot.tsx` | `children: ReactNode`에 기존 `EvidenceQuery` 전달 |
| 요약 표시 | `src/components/ai-summary/AiSummary.tsx` | `summary: AiSummaryDocument \| null`, `status: idle \| loading \| error` |
| 질문·응답 | `src/components/ai-assistant/EvidenceQuery.tsx` | `scope`, `examples`, `lead`, 선택적인 `onAsk` |
| 공통 스타일 | `src/components/ai-assistant/ai-assistant.module.css` | 전역 `--ds-*` 디자인 토큰 |

기존 화면에서는 서버가 `loadAiSummary(categoryId, productId)`로 검증된 캐시를 읽어
`AiSummary`에 전달한다. 이 변경으로 브라우저에서 요약 생성을 요청하지는 않는다.
추후 비동기 연결 시 `status`로 로딩·오류를 표시한다. 요약이 없으면 빈 상태를 표시한다.
근거 발췌와 기준일·외부 원문 링크를 보여주며, JSON 경로·내부 출처 ID는 화면에 노출하지 않는다.
문장과 근거의 매핑은 기존 `AiSummaryDocument`에 보존한다.

## RAG 담당자가 연결할 부분

기본 `requestEvidence`는 기존 `POST /api/evidence/query`를 호출한다.
백엔드가 같은 계약을 유지하면 화면 수정이 필요 없다. 다른 서비스를 붙일 경우
Client Component에서 아래 타입의 함수를 `EvidenceQuery`의 `onAsk`로 전달한다.

```ts
type AskEvidence = (
  scope: EvidenceQueryScope,
  question: string,
  signal: AbortSignal,
) => Promise<EvidenceResult>;
```

`onAsk`는 브라우저에서 실행되는 어댑터다. 인증 키·LLM 키·모델 호출은 서버에 둔다.
Server Component에서 일반 함수를 prop으로 전달하지 말고, Client Component 안에서
어댑터를 선언한다. 네트워크 오류는 throw하고 정상 응답을 `EvidenceResult`로 변환한다.
`fetch`에 전달받은 `signal`을 연결하면 상품 변경·화면 이탈 시 요청을 취소할 수 있다.

| 범위 | 전달값 |
| --- | --- |
| 부동산 시나리오 | `scenarioId`, `offerId` |
| 한우·한돈 공시 | `categoryId`, `productId`, `dataNature: observed`, `namespace: published-offer` |
| 미술품 합성 상품 | `categoryId: art`, `productId`, `dataNature: scenario`, `namespace: common`, `scenarioId` |
| 공통 자료 상세 | 해당 상품의 `categoryId`, `productId`, `dataNature`, `namespace: common`; 시나리오는 `scenarioId` 포함 |

URL의 `round-*`와 공시의 `pig-*`처럼 화면 ID와 자료 ID가 다른 경우 기존 어댑터의
자료 ID를 유지한다. 자료 종류와 승인 범위를 화면에서 임의로 확대하지 않는다.
한우의 최소 공시 범위는 원금 미보장 질문만 제공한다.

응답은 `outcome`, `answer`, `evidence`, `limitations`, `answerSource`를 받는다.
`evidence` 항목에는 `chunkId`, `title`, `page`, `sourceUrl`, `asOf`, `excerpt`가 필요하다.
`structuredSources`와 `responseKind`는 선택값이다. 전체 HTTP 계약은
[서비스 API](../spec/10-service-api.md#9-상품-근거-질문--post-apievidencequery)를 따른다.

## 화면 동작

- Copilot은 HTML Popover로 열고 닫는다. 닫기 버튼·Escape·바깥 클릭으로 닫으며, 본문을 밀지 않는다.
- 패널을 닫아도 질문·답변은 유지한다. 다른 상품으로 이동하면 기존 상품 범위 초기화 규칙을 따른다.
- 최소 공시만 있는 한우 상품에도 요약 탭을 두고, 공시 원문은 공시 근거 탭에 남긴다.
- 탭이 없는 공통 자료 상세는 헤더 아래에 요약을 표시한다.

- 예시 질문을 누르면 바로 조회한다. 직접 입력은 제출 버튼으로 보낸다.
- 요청 중 중복 제출을 막고, 상품 범위가 바뀌면 질문·답변을 초기화한다.
- 오류가 나도 입력은 남으므로 같은 질문을 다시 보낼 수 있다.
- 답변·근거·한계를 구분한다. `evidence_only`와 `abstain`도 정상 결과로 표시한다.
- 긴 원문 인용은 ‘확인 근거’를 펼쳐 읽는다. 답변이 도착할 때 분석 탭이 과도하게 밀리지 않도록 한다.
- 기존 공개 승인·실제 자료/시나리오 구분·생성 게이트는 서버가 계속 관리한다.
- 연결된 자료가 없는 미술품 과거 이력 등은 빈 상태를 표시하며 질문 요청을 보내지 않는다.
- 부동산의 기존 ‘근거 확인’ 탭에 있던 질문 기능은 별도 Copilot 패널로 옮겼다.
  미술품 근거 탭과 한우·한돈 공시 탭에는 기존 원문 자료가 남아 있다.

수동 검증 미술품의 구형 `ArtEvidenceCopilot` 및 `/api/ai/ask-product`는 별도 계약이다.
현재 네 카테고리 상세는 위 공통 `EvidenceQuery`를 사용한다.
