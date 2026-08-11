/**
 * DART 원문(dart4.xsd) XML에서 표(TABLE)를 구조 그대로 읽어낸다.
 * 규칙 추출의 토대 — ROWSPAN/COLSPAN을 펼쳐 "행 × 열" 격자로 정규화한다.
 */
import { XMLParser } from "fast-xml-parser";

export interface ParsedTable {
  /** 문서 내 등장 순서 — 문서 좌표의 일부 */
  readonly index: number;
  readonly header: readonly string[];
  /** 헤더를 제외한 데이터 행. 열 수는 헤더와 동일하게 맞춰진다. */
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

/** 노드 하위의 텍스트를 모두 이어붙인다 (속성 제외). */
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

/**
 * ROWSPAN/COLSPAN을 펼쳐 균일한 격자로 만든다.
 * 뱅카우 신고서의 개체 명세표는 보관장소·사진 열이 ROWSPAN=38이라 이 처리가 필수다.
 */
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

/** 원문 XML 전체에서 표를 순서대로 읽어낸다. */
export const readTables = (xml: string): readonly ParsedTable[] => {
  const document = parser.parse(xml);
  return collectTableNodes(document).map((table, index) => {
    const grid = expandGrid(rowNodes(table));
    const [header = [], ...rows] = grid;
    return { index, header, rows };
  });
};

/** 헤더에 지정한 열 이름이 모두 있는 표를 고른다. */
export const findTablesByHeader = (
  tables: readonly ParsedTable[],
  required: readonly string[],
): readonly ParsedTable[] =>
  tables.filter((table) =>
    required.every((needle) =>
      table.header.some((cell) => cell.replace(/\s/g, "").includes(needle)),
    ),
  );

/** 헤더 이름으로 열 인덱스를 찾는다 (공백 무시·부분 일치). */
export const columnIndex = (
  table: ParsedTable,
  needle: string,
): number =>
  table.header.findIndex((cell) => cell.replace(/\s/g, "").includes(needle));
