/**
 * 원문 XML → **항목 구조가 보존된 문서 모델**.
 *
 * S0의 파서는 표를 평면 목록으로만 읽어(`readTables`) 좌표가 없었다.
 * 여기서는 표마다 다음을 붙인다 — 이것이 "신고서 어디에 쓰여 있는가"의 기계적 정의다.
 * - `sectionPath` : 최상위 부(部)부터 최하위 항목까지의 제목 경로
 * - `section`     : 사람이 인용하는 좌표 한 줄 (가장 가까운 번호 항목, 없으면 최하위 절)
 * - `charOffset`  : 원문 문자 오프셋 (원문 대조·정정 diff의 기준점)
 *
 * 발행사별 지식은 여기에 없다 — 태그 중첩·번호 패턴만 쓴다.
 */
import {
  readOutline,
  outlineAt,
  PRIMARY_ITEM_LEVEL,
  type OutlineNode,
} from "./outline";
import { findTableRanges, readTables, type ParsedTable } from "./tables";

export interface DocumentTable {
  /** 문서 등장 순서 (0-base) */
  readonly index: number;
  readonly charOffset: number;
  /** 최상위 → 최하위 항목 제목 경로 */
  readonly sectionPath: readonly string[];
  /** 인용용 좌표 한 줄 — 가장 가까운 번호 항목(없으면 최하위 절 제목, 그것도 없으면 "") */
  readonly section: string;
  readonly table: ParsedTable;
}

export interface ParsedDocument {
  readonly outline: readonly OutlineNode[];
  readonly tables: readonly DocumentTable[];
}

/**
 * 인용 좌표 한 줄.
 * 사람이 신고서를 인용하는 단위는 번호 항목("8. 기초자산 취득에 관한 사항")이므로 그것을 우선하고,
 * 없으면 하위 항목 → 절 제목 순으로 물러선다.
 */
const citationOf = (path: readonly OutlineNode[]): string => {
  const items = path.filter((node) => node.kind === "item");
  const primary = items.filter((node) => node.level === PRIMARY_ITEM_LEVEL);
  return primary.at(-1)?.title ?? items.at(-1)?.title ?? path.at(-1)?.title ?? "";
};

/**
 * 원문 → 문서 모델.
 * 표는 최상위 표 단위로 잘라 각각 파싱한다 — 잘라낸 조각의 시작 위치가 곧 문서 좌표다.
 * 중첩 표는 바깥 표 조각 안에서 함께 읽히므로 한 건도 누락되지 않는다.
 */
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

/** 판정·색인이 쓰는 평면 표 목록 (문서 순서 유지) */
export const flatTables = (
  document: ParsedDocument,
): readonly ParsedTable[] => document.tables.map((entry) => entry.table);
