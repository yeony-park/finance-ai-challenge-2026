import {
  readOutline,
  outlineAt,
  PRIMARY_ITEM_LEVEL,
  type OutlineNode,
} from "./outline";
import { findTableRanges, readTables, type ParsedTable } from "./tables";

export interface DocumentTable {
  readonly index: number;
  readonly charOffset: number;
  readonly sectionPath: readonly string[];
  readonly section: string;
  readonly table: ParsedTable;
}

export interface ParsedDocument {
  readonly outline: readonly OutlineNode[];
  readonly tables: readonly DocumentTable[];
}

const citationOf = (path: readonly OutlineNode[]): string => {
  const items = path.filter((node) => node.kind === "item");
  const primary = items.filter((node) => node.level === PRIMARY_ITEM_LEVEL);
  return primary.at(-1)?.title ?? items.at(-1)?.title ?? path.at(-1)?.title ?? "";
};

export const parseDocument = (xml: string): ParsedDocument => {
  const ranges = findTableRanges(xml);
  const outline = readOutline(xml, ranges);

  const tables: DocumentTable[] = [];
  for (const [start, end] of ranges) {
    const path = outlineAt(outline, start);
    const sectionPath = path.map((node) => node.title);
    const section = citationOf(path);
    for (const table of readTables(xml.slice(start, end))) {
      tables.push({
        index: tables.length,
        charOffset: start,
        sectionPath,
        section,
        table: { ...table, index: tables.length },
      });
    }
  }

  return { outline, tables };
};

export const flatTables = (
  document: ParsedDocument,
): readonly ParsedTable[] => document.tables.map((entry) => entry.table);
