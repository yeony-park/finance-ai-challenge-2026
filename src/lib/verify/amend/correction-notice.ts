import { findTableRanges, readTables } from "../parse/tables";

const CORRECTION_BLOCK_PATTERN = /<CORRECTION\b[^>]*>([\s\S]*?)<\/CORRECTION>/;

const KOREAN_DATE_PATTERN = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/;

const SECTION_HEADING_PATTERN = /^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVX]+\.\s*\S/;

const CORRECTION_REASON_PATTERN = /정정$/;

const ORDER_RELATED_PATTERN = /^예$/;

const GUIDANCE_SPLIT_PATTERN = /\s*-\s(?=[가-힣])/;

const ITEM_COLUMN_COUNT = 5;

const TARGET_DOCUMENT_LABEL = "정정대상공시서류";

const FIRST_SUBMISSION_LABEL = "최초제출일";

export interface CorrectionItem {
  readonly section: string;
  readonly item: string;
  readonly isOrderRelated: boolean;
  readonly reason: string;
}

export interface CorrectionNotice {
  readonly noticeDate: string;
  readonly targetDocument: string;
  readonly firstSubmittedOnText: string;
  readonly guidance: readonly string[];
  readonly items: readonly CorrectionItem[];
}

const flatten = (text: string): string => text.replace(/\s+/g, " ").trim();

const compact = (text: string): string => text.replace(/\s/g, "");

export const toIsoDate = (korean: string): string => {
  const matched = KOREAN_DATE_PATTERN.exec(flatten(korean));
  if (!matched) return "";
  const [, year, month, day] = matched;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const correctionSlice = (xml: string): string | undefined =>
  CORRECTION_BLOCK_PATTERN.exec(xml)?.[1];

type Grid = readonly (readonly string[])[];

const gridsOf = (slice: string): readonly Grid[] =>
  findTableRanges(slice).flatMap((range) =>
    readTables(slice.slice(range[0], range[1])).map(
      (table): Grid => [table.header, ...table.rows],
    ),
  );

const isUniformRow = (row: readonly string[]): boolean =>
  row.length > 1 && row.every((cell) => cell === row[0]);

const isItemRow = (row: readonly string[]): boolean =>
  row.length >= ITEM_COLUMN_COUNT &&
  !isUniformRow(row) &&
  CORRECTION_REASON_PATTERN.test(compact(row[2] ?? ""));

const isItemGrid = (grid: Grid): boolean => grid.some(isItemRow);

const valueByLabel = (
  grids: readonly Grid[],
  label: string,
): string => {
  for (const grid of grids) {
    for (const row of grid) {
      if (isUniformRow(row)) continue;
      if (!compact(row[0] ?? "").includes(label)) continue;
      const value = flatten(row[1] ?? "");
      if (value.length > 0) return value;
    }
  }
  return "";
};

const noticeDateOf = (grids: readonly Grid[]): string => {
  for (const grid of grids) {
    for (const row of grid) {
      for (const cell of row) {
        const iso = toIsoDate(cell);
        if (iso.length > 0) return iso;
      }
    }
  }
  return "";
};

const toGuidance = (text: string): readonly string[] =>
  flatten(text)
    .split(GUIDANCE_SPLIT_PATTERN)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

interface ItemScan {
  readonly items: readonly CorrectionItem[];
  readonly guidance: readonly string[];
}

const scanItems = (grid: Grid): ItemScan => {
  const items: CorrectionItem[] = [];
  const guidance: string[] = [];
  let section = "";

  for (const row of grid) {
    if (isUniformRow(row)) {
      const text = flatten(row[0] ?? "");
      if (SECTION_HEADING_PATTERN.test(text)) section = text;
      else guidance.push(...toGuidance(text));
      continue;
    }
    if (!isItemRow(row)) continue;

    items.push({
      section,
      item: flatten(row[0] ?? ""),
      isOrderRelated: ORDER_RELATED_PATTERN.test(compact(row[1] ?? "")),
      reason: flatten(row[2] ?? ""),
    });
  }

  return { items, guidance };
};

export const readCorrectionNotice = (
  xml: string,
): CorrectionNotice | undefined => {
  const slice = correctionSlice(xml);
  if (!slice) return undefined;

  const grids = gridsOf(slice);
  const itemGrid = grids.find(isItemGrid);
  if (!itemGrid) return undefined;

  const scanned = scanItems(itemGrid);

  return {
    noticeDate: noticeDateOf(grids),
    targetDocument: valueByLabel(grids, TARGET_DOCUMENT_LABEL),
    firstSubmittedOnText: valueByLabel(grids, FIRST_SUBMISSION_LABEL),
    guidance: scanned.guidance,
    items: scanned.items,
  };
};

export const correctionItemLabel = (item: CorrectionItem): string =>
  item.section.length > 0 ? `${item.section} · ${item.item}` : item.item;

const REASON_TAIL_PATTERN = /\s*정정사항은[\s\S]*$/;

const REASON_TRAILING_PATTERN = /(으로서|로서)?[,·.\s]*$/;

export const correctionReasonText = (notice: CorrectionNotice): string =>
  (notice.guidance[0] ?? "")
    .replace(REASON_TAIL_PATTERN, "")
    .replace(REASON_TRAILING_PATTERN, "")
    .trim();
