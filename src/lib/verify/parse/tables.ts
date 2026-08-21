import { XMLParser } from "fast-xml-parser";

export interface ParsedTable {
  readonly index: number;
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

interface XmlNode {
  readonly [key: string]: unknown;
}

const ARRAY_TAGS = new Set(["TABLE", "TR", "TD", "TH", "P"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ARRAY_TAGS.has(name),
});

export const nodeText = (node: unknown): string => {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("\n");
  if (typeof node === "object") {
    return Object.entries(node as XmlNode)
      .filter(([key]) => !key.startsWith("@_"))
      .map(([, value]) => nodeText(value))
      .join("\n")
      .trim();
  }
  return "";
};

const attrNumber = (cell: unknown, name: string): number => {
  if (cell == null || typeof cell !== "object" || Array.isArray(cell)) return 1;
  const raw = (cell as XmlNode)[name];
  const value = Number.parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
};

const collectTableNodes = (root: unknown): unknown[] => {
  const found: unknown[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node == null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as XmlNode)) {
      if (key === "TABLE" && Array.isArray(value)) found.push(...value);
      visit(value);
    }
  };
  visit(root);
  return found;
};

const rowNodes = (table: unknown): unknown[] => {
  if (table == null || typeof table !== "object") return [];
  const node = table as XmlNode;
  const body = node.TBODY;
  const rows =
    (body && typeof body === "object" ? (body as XmlNode).TR : undefined) ??
    node.TR;
  return Array.isArray(rows) ? rows : [];
};

const cellNodes = (row: unknown): unknown[] => {
  if (row == null || typeof row !== "object") return [];
  const node = row as XmlNode;
  const cells = node.TD ?? node.TH;
  return Array.isArray(cells) ? cells : [];
};

interface PendingCell {
  readonly text: string;
  readonly remaining: number;
}

const expandGrid = (rows: unknown[]): string[][] => {
  const pending = new Map<number, PendingCell>();
  const grid: string[][] = [];
  const columnCount = Math.max(
    ...rows.map((row) =>
      cellNodes(row).reduce<number>(
        (sum, cell) => sum + attrNumber(cell, "@_COLSPAN"),
        0,
      ),
    ),
    0,
  );

  for (const row of rows) {
    const queue = [...cellNodes(row)];
    const out: string[] = [];
    let column = 0;
    while (column < columnCount) {
      const carried = pending.get(column);
      if (carried) {
        out.push(carried.text);
        if (carried.remaining <= 1) pending.delete(column);
        else
          pending.set(column, {
            text: carried.text,
            remaining: carried.remaining - 1,
          });
        column += 1;
        continue;
      }
      const cell = queue.shift();
      if (cell === undefined) {
        out.push("");
        column += 1;
        continue;
      }
      const text = nodeText(cell);
      const rowSpan = attrNumber(cell, "@_ROWSPAN");
      const colSpan = attrNumber(cell, "@_COLSPAN");
      for (let offset = 0; offset < colSpan && column < columnCount; offset++) {
        out.push(text);
        if (rowSpan > 1)
          pending.set(column, { text, remaining: rowSpan - 1 });
        column += 1;
      }
    }
    grid.push(out);
  }
  return grid;
};

export const readTables = (xml: string): readonly ParsedTable[] => {
  const document = parser.parse(xml);
  return collectTableNodes(document).map((table, index) => {
    const grid = expandGrid(rowNodes(table));
    const [header = [], ...rows] = grid;
    return { index, header, rows };
  });
};

const TABLE_TAG_PATTERN = /<(\/?)TABLE\b[^>]*>/g;

export const findTableRanges = (
  xml: string,
): readonly (readonly [number, number])[] => {
  const ranges: (readonly [number, number])[] = [];
  const pattern = new RegExp(TABLE_TAG_PATTERN.source, "g");
  let depth = 0;
  let start = 0;

  for (
    let match = pattern.exec(xml);
    match !== null;
    match = pattern.exec(xml)
  ) {
    if (match[1]) {
      depth = Math.max(0, depth - 1);
      if (depth === 0) ranges.push([start, match.index + match[0].length]);
      continue;
    }
    if (depth === 0) start = match.index;
    depth += 1;
  }
  return ranges;
};

export const findTablesByHeader = (
  tables: readonly ParsedTable[],
  required: readonly string[],
): readonly ParsedTable[] =>
  tables.filter((table) =>
    required.every((needle) =>
      table.header.some((cell) => cell.replace(/\s/g, "").includes(needle)),
    ),
  );

export const columnIndex = (
  table: ParsedTable,
  needle: string,
): number =>
  table.header.findIndex((cell) => cell.replace(/\s/g, "").includes(needle));

export const columnIndexByAliases = (
  table: ParsedTable,
  aliases: readonly string[],
): number => {
  for (const alias of aliases) {
    const index = columnIndex(table, alias);
    if (index >= 0) return index;
  }
  return -1;
};
