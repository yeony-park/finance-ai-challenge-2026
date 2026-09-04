import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";

export const METHODOLOGY_TAB_COPY = [
  { id: METHODOLOGY_ANCHOR.pipeline, label: "검증 절차" },
  { id: METHODOLOGY_ANCHOR.layers, label: "세 층위" },
  { id: METHODOLOGY_ANCHOR.sources, label: "데이터 출처" },
  { id: METHODOLOGY_ANCHOR.verdicts, label: "판정 3값" },
  { id: METHODOLOGY_ANCHOR.amendment, label: "정정 재검증" },
  { id: METHODOLOGY_ANCHOR.principles, label: "표현 원칙" },
  { id: METHODOLOGY_ANCHOR.limits, label: "한계" },
  { id: "methodology-cattle", label: "한우" },
  { id: "methodology-pig", label: "한돈" },
  { id: "methodology-real-estate", label: "부동산" },
  { id: "methodology-art", label: "미술품" },
] as const;

export type MethodologyTabId = (typeof METHODOLOGY_TAB_COPY)[number]["id"];
