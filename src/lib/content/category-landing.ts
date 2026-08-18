import type { VerificationLayer } from "@/lib/verify/contract/category";

export const OFFERS_SECTION_TITLE = "공모별 확인 현황";

export const OFFERS_SECTION_LEAD =
  "검증 가능한 공개 데이터가 있는 공모 전수를 공시 접수일순으로 보여줍니다 — 선별·추천 정렬이 아닙니다.";

export const ACTIVE_GROUP_TITLE = "청약 예정·진행 중";

export const CLOSED_GROUP_TITLE = "청약 종료 · 사후 검증";

export const ACTIVE_GROUP_EMPTY =
  "지금 청약 예정이거나 진행 중인 공모가 없습니다.";

export const VERDICT_SECTION_TITLE = "지금까지의 대조 결과";

export const verdictTotalsLead = (
  offerCount: number,
  itemCount: number,
): string =>
  `공모 ${offerCount}건에서 공시된 기재 ${itemCount.toLocaleString("ko-KR")}건을 공적 원장과 하나씩 대조한 누적 결과입니다.`;

export const LAYERS_SECTION_TITLE = "무엇을 어디까지 대조하나";

export const LAYERS_SECTION_LEAD =
  "데이터 깊이의 차이를 숨기지 않습니다 — 확인 질문마다 어떤 공공 데이터로 어디까지 대조하는지 그대로 적습니다.";

export const LAYER_EASY_QUESTIONS: Readonly<Record<VerificationLayer, string>> = {
  existence: "실물이 정말 있는가",
  price: "가격이 시장 어디쯤인가",
  performance: "공시한 대로 진행되고 있는가",
};

export const FACT_STRIP_TITLE = "신고서 요약";

export const FACT_STRIP_LINK = "신고서 정보 전체 보기 →";

export const ISSUER_SLOT_TITLE = "발행사의 과거 기록";

export const REPORT_OPEN_LABEL = "리포트 열기 →";
