/**
 * LLM 추출 프롬프트 직렬화.
 *
 * 프롬프트는 두 가지를 반드시 담는다.
 * 1. **문서 좌표** — 항목 경로·표 이름·원문 오프셋·행 번호. 좌표 없는 추출값은 근거가 될 수 없다.
 * 2. **표 원문 그대로의 행** — 요약·재서술 없이 셀을 그대로 옮긴다(환각 표면 최소화).
 *
 * 행 직렬화 형식은 fake 클라이언트가 되읽는 계약이기도 하므로 여기 한 곳에만 둔다.
 */
import type { DocumentRef } from "../types";
import type { HeadRow, HeadTableSelection } from "./extract-rules";

export const CELL_SEPARATOR = " | ";
export const ROW_LINE_PATTERN = /^행\s+(\d+)\s*\|(.*)$/;

/** 셀 안의 구분자·줄바꿈을 지워 행 한 줄이 모호해지지 않게 한다 */
const flattenCell = (cell: string): string =>
  cell.replace(/[|\r\n]+/g, " / ").replace(/\s+/g, " ").trim();

export const serializeRow = (row: HeadRow): string =>
  `행 ${row.row}${CELL_SEPARATOR}${row.cells.map(flattenCell).join(CELL_SEPARATOR)}`;

/** 직렬화한 행 한 줄 → 행 번호와 셀 목록 (fake 클라이언트가 쓴다) */
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
].join("\n");

export interface ExtractionPrompt {
  readonly system: string;
  readonly user: string;
}

/** 개체 명세표 한 덩어리(행 묶음) → 프롬프트 */
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
  ].join("\n");

  return { system: EXTRACTION_SYSTEM_PROMPT, user };
};
