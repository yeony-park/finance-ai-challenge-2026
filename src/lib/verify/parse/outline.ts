export type OutlineKind = "part" | "section" | "item";

export interface OutlineNode {
  readonly id: string;
  readonly kind: OutlineKind;
  readonly level: number;
  readonly title: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

const TAG_LEVELS: Readonly<Record<string, number>> = {
  PART: 1,
  "SECTION-1": 2,
  "SECTION-2": 3,
  "SECTION-3": 4,
};

export const PRIMARY_ITEM_LEVEL = 5;
const ITEM_BASE_LEVEL = PRIMARY_ITEM_LEVEL;

const TAG_PATTERN = /<(\/?)(PART|SECTION-1|SECTION-2|SECTION-3)\b[^>]*>/g;
const TITLE_PATTERN = /<TITLE\b[^>]*>([\s\S]*?)<\/TITLE>/;
const PARAGRAPH_PATTERN = /<P\b[^>]*>([\s\S]*?)<\/P>/g;

const ITEM_PATTERNS: readonly (readonly [RegExp, number])[] = [
  [/^\d+-\d+\.\s*\S/, 1],
  [/^\d+\.\s*\S/, 0],
  [/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVX]+\.\s*\S/, 0],
  [/^[가-힣]\.\s*\S/, 1],
];

const MAX_TITLE_LENGTH = 60;

const SENTENCE_END = /[.。!?]$/;

const LEADING_SPAN = /^\s*<SPAN\b[^>]*>([\s\S]*?)<\/SPAN>/i;

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

export const stripMarkup = (raw: string): string =>
  raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();

export const itemDepth = (text: string): number | undefined => {
  if (text.length === 0 || text.length > MAX_TITLE_LENGTH) return undefined;
  if (SENTENCE_END.test(text)) return undefined;
  for (const [pattern, depth] of ITEM_PATTERNS) {
    if (pattern.test(text)) return depth;
  }
  return undefined;
};

export const headingCandidates = (innerHtml: string): readonly string[] => {
  const lead = stripMarkup(LEADING_SPAN.exec(innerHtml)?.[1] ?? "");
  const whole = stripMarkup(innerHtml);
  return lead.length > 0 ? [lead, whole] : [whole];
};

const isInside = (
  offset: number,
  ranges: readonly (readonly [number, number])[],
): boolean => ranges.some(([start, end]) => offset >= start && offset < end);

interface OpenTag {
  readonly tag: string;
  readonly start: number;
}

interface Draft {
  readonly kind: OutlineKind;
  readonly level: number;
  readonly title: string;
  readonly startOffset: number;
  readonly endOffset?: number;
}

const readTagNodes = (xml: string): readonly Draft[] => {
  const stack: OpenTag[] = [];
  const drafts: Draft[] = [];
  const pattern = new RegExp(TAG_PATTERN.source, "g");

  for (
    let match = pattern.exec(xml);
    match !== null;
    match = pattern.exec(xml)
  ) {
    const [, closing, tag] = match;
    if (closing) {
      const open = stack.pop();
      if (!open) continue;
      const body = xml.slice(open.start, match.index);
      const title = stripMarkup(TITLE_PATTERN.exec(body)?.[1] ?? "");
      drafts.push({
        kind: open.tag === "PART" ? "part" : "section",
        level: TAG_LEVELS[open.tag] ?? TAG_LEVELS["SECTION-3"],
        title,
        startOffset: open.start,
        endOffset: match.index + match[0].length,
      });
      continue;
    }
    stack.push({ tag, start: match.index });
  }
  return drafts;
};

const readItemNodes = (
  xml: string,
  tableRanges: readonly (readonly [number, number])[],
): readonly Draft[] => {
  const drafts: Draft[] = [];
  const pattern = new RegExp(PARAGRAPH_PATTERN.source, "g");

  for (
    let match = pattern.exec(xml);
    match !== null;
    match = pattern.exec(xml)
  ) {
    if (isInside(match.index, tableRanges)) continue;
    const heading = headingCandidates(match[1] ?? "")
      .map((title) => ({ title, depth: itemDepth(title) }))
      .find((candidate) => candidate.depth !== undefined);
    if (heading === undefined) continue;
    drafts.push({
      kind: "item",
      level: ITEM_BASE_LEVEL + (heading.depth ?? 0),
      title: heading.title,
      startOffset: match.index,
    });
  }
  return drafts;
};

export const readOutline = (
  xml: string,
  tableRanges: readonly (readonly [number, number])[] = [],
): readonly OutlineNode[] => {
  const drafts = [...readTagNodes(xml), ...readItemNodes(xml, tableRanges)].sort(
    (a, b) => a.startOffset - b.startOffset || a.level - b.level,
  );

  return drafts.map((draft, index): OutlineNode => {
    const end =
      draft.endOffset ??
      (() => {
        const enclosing = drafts
          .slice(0, index)
          .filter(
            (other) =>
              other.endOffset !== undefined &&
              other.startOffset <= draft.startOffset &&
              other.endOffset > draft.startOffset,
          )
          .map((other) => other.endOffset ?? xml.length);
        const sectionEnd = Math.min(...enclosing, xml.length);
        const next = drafts
          .slice(index + 1)
          .find((other) => other.level <= draft.level);
        return Math.min(next?.startOffset ?? xml.length, sectionEnd);
      })();

    return {
      id: `${draft.kind}@${draft.startOffset}`,
      kind: draft.kind,
      level: draft.level,
      title: draft.title,
      startOffset: draft.startOffset,
      endOffset: end,
    };
  });
};

export const outlineAt = (
  outline: readonly OutlineNode[],
  offset: number,
): readonly OutlineNode[] => {
  const containing = outline.filter(
    (node) =>
      node.startOffset <= offset &&
      node.endOffset > offset &&
      node.title.length > 0,
  );
  const byLevel = new Map<number, OutlineNode>();
  for (const node of containing) {
    const current = byLevel.get(node.level);
    if (!current || current.startOffset < node.startOffset) {
      byLevel.set(node.level, node);
    }
  }
  return [...byLevel.values()].sort((a, b) => a.level - b.level);
};
