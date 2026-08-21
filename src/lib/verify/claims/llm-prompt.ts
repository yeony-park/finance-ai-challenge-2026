import type { DocumentRef } from "../types";
import type { HeadRow, HeadTableSelection } from "./extract-rules";

export const CELL_SEPARATOR = " | ";
export const ROW_LINE_PATTERN = /^행\s+(\d+)\s*\|(.*)$/;

const flattenCell = (cell: string): string =>
  cell.replace(/[|\r\n]+/g, " / ").replace(/\s+/g, " ").trim();

export const serializeRow = (row: HeadRow): string =>
  `행 ${row.row}${CELL_SEPARATOR}${row.cells.map(flattenCell).join(CELL_SEPARATOR)}`;

export const parseRowLine = (
  line: string,
): { readonly row: number; readonly cells: readonly string[] } | undefined => {
  const matched = ROW_LINE_PATTERN.exec(line.trim());
  if (!matched) return undefined;
  const row = Number.parseInt(matched[1] ?? "", 10);
  if (!Number.isFinite(row)) return undefined;
  return {
    row,
    cells: (matched[2] ?? "").split("|").map((cell) => cell.trim()),
  };
};

export const EXTRACTION_SYSTEM_PROMPT = [
  "당신은 증권신고서 원문에서 **검증 가능한 사실만** 옮겨 적는 추출기입니다.",
  "규칙:",
  "1. 표에 적혀 있지 않은 값은 만들지 마십시오. 모르면 그 항목을 비우십시오(추측 금지).",
  "2. 값은 원문 표기 그대로 옮기십시오. 단위·서식·순서를 임의로 바꾸지 마십시오.",
  "3. 모든 추출값에는 그 값이 적힌 **원문 행 번호(row)**를 반드시 붙이십시오.",
  "4. 값을 해석·요약·평가하지 마십시오. 판정은 다른 단계가 공적 원장과 대조해 수행합니다.",
  "5. 제시된 **모든 행**을 빠짐없이 처리하십시오. 몇 행만 예시로 처리하고 멈추면 안 됩니다.",
].join("\n");

export interface ExtractionPrompt {
  readonly system: string;
  readonly user: string;
}

export const buildExtractionPrompt = (
  document: DocumentRef,
  selection: HeadTableSelection,
  rows: readonly HeadRow[],
): ExtractionPrompt => {
  const path = selection.source.sectionPath.join(" > ");
  const user = [
    `[문서] 공모=${document.offerId} 접수번호=${document.rcpNo} 제출일=${document.submittedOn}`,
    `[항목] ${path.length > 0 ? path : selection.profile.sectionFallback}`,
    `[표] ${selection.profile.tableName} (원문 문자 오프셋 ${selection.source.charOffset})`,
    `[열] ${selection.source.table.header.map(flattenCell).join(CELL_SEPARATOR)}`,
    "",
    ...rows.map(serializeRow),
    "",
    "[요청] 위 각 행에서 다음 종류의 값을 추출하십시오.",
    "- livestock_trace_no: 개체 이력번호 (숫자만)",
    "- livestock_breed: 품종",
    "- livestock_sex: 성별 (수/암/거세)",
    "- acquisition_date: 취득시기",
    "- acquisition_price: 취득원가",
    "- custody_location: 보관장소(사육지)",
    "행에 없는 종류는 넣지 마십시오. subject에는 그 행의 개체 라벨을 그대로 쓰십시오.",
    "",
    `[분량] 위 표에는 행이 정확히 ${rows.length}개 있습니다 (행 번호 ${rows.map((row) => row.row).join(", ")}).`,
    "행 번호 오름차순으로 **모든 행을 하나씩** 처리하십시오. 한 행도 건너뛰지 마십시오.",
  ].join("\n");

  return { system: EXTRACTION_SYSTEM_PROMPT, user };
};
