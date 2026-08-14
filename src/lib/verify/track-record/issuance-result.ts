const ROW_PATTERN = /<TR\b[\s\S]*?<\/TR>/g;

const CELL_PATTERN = /<(T[EDH])\b[^>]*>([\s\S]*?)<\/\1>/g;

const TAG_PATTERN = /<[^>]+>/g;

const SERIES_HEAD_PATTERN = /^회\s*차/;

const SERIES_LABEL_PATTERN = /^\d+(-\d+)?$/;

const OPERATOR_LABEL = "공동사업운영자";

const GENERAL_LABEL = "일반투자자";

const ALLOCATION_COLUMN_COUNT = 9;

const OPERATOR_INITIAL_UNITS = 1;
const GENERAL_INITIAL_UNITS = 1;
const GENERAL_SUBSCRIBED_UNITS = 3;
const GENERAL_SUBSCRIPTION_RATE = 5;
const FINAL_UNITS = 6;
const FINAL_AMOUNT = 7;

const squeeze = (raw: string): string => raw.replace(/\s+/g, "");

const cellText = (raw: string): string =>
  raw.replace(TAG_PATTERN, "").replace(/\s+/g, " ").trim();

const readRows = (xml: string): readonly (readonly string[])[] => {
  const rows: string[][] = [];
  for (const row of xml.matchAll(ROW_PATTERN)) {
    const cells = [...row[0].matchAll(CELL_PATTERN)].map((cell) =>
      cellText(cell[2] ?? ""),
    );
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
};

const toUnits = (raw: string | undefined): number => {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  return digits.length === 0 ? 0 : Number.parseInt(digits, 10);
};

const toNumberOrNull = (raw: string | undefined): number | null => {
  const digits = (raw ?? "").replace(/[^\d]/g, "");
  return digits.length === 0 ? null : Number.parseInt(digits, 10);
};

const seriesLabelOf = (row: readonly string[]): string | undefined => {
  if (!SERIES_HEAD_PATTERN.test(squeeze(row[0] ?? ""))) return undefined;
  const label = (row[1] ?? "").trim();
  return SERIES_LABEL_PATTERN.test(label) ? label : undefined;
};

const isAllocationRow = (row: readonly string[], label: string): boolean =>
  squeeze(row[0] ?? "") === label && row.length >= ALLOCATION_COLUMN_COUNT;

export interface SeriesResult {
  readonly seriesLabel: string;
  readonly generalInitialUnits: number;
  readonly generalSubscribedUnits: number;
  readonly generalSubscriptionRatePercent: number | null;
  readonly operatorInitialUnits: number;
  readonly operatorFinalUnits: number;
  readonly operatorFinalAmountKrw: number | null;
  readonly isUnderSubscribed: boolean;
  readonly operatorTookUnallocated: boolean;
}

const toSeriesResult = (
  seriesLabel: string,
  operator: readonly string[],
  general: readonly string[],
): SeriesResult => {
  const generalInitialUnits = toUnits(general[GENERAL_INITIAL_UNITS]);
  const generalSubscribedUnits = toUnits(general[GENERAL_SUBSCRIBED_UNITS]);
  const operatorInitialUnits = toUnits(operator[OPERATOR_INITIAL_UNITS]);
  const operatorFinalUnits = toUnits(operator[FINAL_UNITS]);

  return {
    seriesLabel,
    generalInitialUnits,
    generalSubscribedUnits,
    generalSubscriptionRatePercent: toNumberOrNull(
      general[GENERAL_SUBSCRIPTION_RATE],
    ),
    operatorInitialUnits,
    operatorFinalUnits,
    operatorFinalAmountKrw: toNumberOrNull(operator[FINAL_AMOUNT]),
    isUnderSubscribed: generalSubscribedUnits < generalInitialUnits,
    operatorTookUnallocated: operatorFinalUnits > operatorInitialUnits,
  };
};

export const parseIssuanceResult = (xml: string): readonly SeriesResult[] => {
  const collected: SeriesResult[] = [];
  const seen = new Set<string>();
  let seriesLabel: string | undefined;
  let operatorRow: readonly string[] | undefined;

  for (const row of readRows(xml)) {
    const label = seriesLabelOf(row);
    if (label) {
      seriesLabel = label;
      operatorRow = undefined;
      continue;
    }

    if (isAllocationRow(row, OPERATOR_LABEL)) {
      operatorRow = row;
      continue;
    }

    if (!isAllocationRow(row, GENERAL_LABEL)) continue;
    if (seriesLabel === undefined || operatorRow === undefined) continue;
    if (seen.has(seriesLabel)) continue;

    seen.add(seriesLabel);
    collected.push(toSeriesResult(seriesLabel, operatorRow, row));
    operatorRow = undefined;
  }

  return collected;
};
