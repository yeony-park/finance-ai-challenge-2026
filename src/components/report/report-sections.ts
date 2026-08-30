import {
  FILING_HEADING_ID,
  HISTORY_HEADING_ID,
  PRICE_HEADING_ID,
  REALITY_HEADING_ID,
  VERDICT_HEADING_ID,
  WATCH_HEADING_ID,
} from "./ids";

export type ReportSectionKey =
  | "verdict"
  | "filing"
  | "watch"
  | "history"
  | "reality"
  | "price";

export interface ReportSection {
  readonly key: ReportSectionKey;
  readonly id: string;
  readonly label: string;
  readonly requiresFilingFacts?: boolean;
}

const REPORT_SECTIONS: readonly ReportSection[] = [
  { key: "verdict", id: VERDICT_HEADING_ID, label: "요약" },
  {
    key: "filing",
    id: FILING_HEADING_ID,
    label: "신고서 정보",
    requiresFilingFacts: true,
  },
  { key: "watch", id: WATCH_HEADING_ID, label: "정정 이력" },
  { key: "history", id: HISTORY_HEADING_ID, label: "이행 이력" },
  { key: "reality", id: REALITY_HEADING_ID, label: "실재 확인" },
  { key: "price", id: PRICE_HEADING_ID, label: "가격 위치" },
];

export const reportSectionsFor = ({
  hasFilingFacts,
}: {
  readonly hasFilingFacts: boolean;
}): readonly ReportSection[] =>
  REPORT_SECTIONS.filter(
    (section) => !section.requiresFilingFacts || hasFilingFacts,
  );
