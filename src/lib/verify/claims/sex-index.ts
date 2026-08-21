import type { ParsedTable } from "../parse/tables";

const SEX_PATTERNS: readonly (readonly [RegExp, string])[] = [
  [/송아지\s*\(\s*숫소\s*\)/, "수"],
  [/송아지\s*\(\s*암소\s*\)/, "암"],
  [/숫송아지/, "수"],
  [/암송아지/, "암"],
  [/거세우/, "거세"],
];

export const detectSex = (text: string): string | undefined => {
  for (const [pattern, value] of SEX_PATTERNS) {
    if (pattern.test(text)) return value;
  }
  return undefined;
};

export interface SexIndexTarget {
  readonly subject: string;
  readonly traceNoRaw: string;
}

const digitsOf = (raw: string): string => raw.replace(/\D/g, "");

const matchTarget = (
  rowText: string,
  targets: readonly SexIndexTarget[],
): SexIndexTarget | undefined => {
  const rowDigits = digitsOf(rowText);
  const byTraceNo = targets.filter((target) => {
    const digits = digitsOf(target.traceNoRaw);
    return digits.length >= 9 && rowDigits.includes(digits);
  });
  if (byTraceNo.length === 1) return byTraceNo[0];
  if (byTraceNo.length > 1) return undefined;

  const bySubject = targets.filter((target) => rowText.includes(target.subject));
  return bySubject.length === 1 ? bySubject[0] : undefined;
};

export const buildSexIndex = (
  tables: readonly ParsedTable[],
  targets: readonly SexIndexTarget[],
): ReadonlyMap<string, string> => {
  const observed = new Map<string, Set<string>>();

  for (const table of tables) {
    for (const cells of table.rows) {
      const rowText = cells.join(" ");
      const sex = detectSex(rowText);
      if (sex === undefined) continue;

      const target = matchTarget(rowText, targets);
      if (!target) continue;

      const bucket = observed.get(target.subject) ?? new Set<string>();
      bucket.add(sex);
      observed.set(target.subject, bucket);
    }
  }

  const index = new Map<string, string>();
  for (const [subject, values] of observed) {
    if (values.size !== 1) continue;
    const [only] = values;
    if (only) index.set(subject, only);
  }
  return index;
};
