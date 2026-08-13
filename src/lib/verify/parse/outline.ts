/**
 * 신고서 원문의 **항목(목차) 구조** 복원 — 발행사 무관 일반 파서.
 *
 * DART 원문(dart4.xsd)의 목차는 두 층으로 나뉘어 있다.
 * 1. 태그 층 — `<PART>` · `<SECTION-1|2|3>` 이 `<TITLE>`을 하나씩 갖는다 (기계가 읽는 목차)
 * 2. 본문 층 — 절 안의 세부 항목은 태그가 아니라 **굵은 문단**이다
 *    (예: `<P USERMARK="B">8. 기초자산 취득에 관한 사항</P>`)
 *
 * 검증 리포트가 "신고서 어디에 쓰여 있는가"를 되짚으려면 2번까지 필요하다 —
 * 뱅카우 9호의 개체 명세표는 SECTION-2조차 없는 `II. 증권의 주요 권리내용` 안에 있고,
 * 사람이 인용하는 좌표는 그 안의 `8. 기초자산 취득에 관한 사항`이기 때문이다.
 *
 * 이 모듈은 발행사별 지식을 쓰지 않는다 — 태그 중첩과 번호 패턴만 본다.
 * 발행사별 지식(표 이름·열 별칭)은 `profiles.ts`가 데이터로 들고 있다.
 */

/** 항목 종류 — 태그에서 온 것인지 본문 굵은 문단에서 온 것인지 구분한다 */
export type OutlineKind = "part" | "section" | "item";

export interface OutlineNode {
  /** 문서 안에서 유일한 좌표 키 — `{kind}@{startOffset}` */
  readonly id: string;
  readonly kind: OutlineKind;
  /** 얕을수록 작다 (PART=1 … SECTION-3=4, 본문 항목=5~6) */
  readonly level: number;
  readonly title: string;
  /** 원문 XML 문자 오프셋 (항목 시작) */
  readonly startOffset: number;
  /** 원문 XML 문자 오프셋 (항목 끝, 미포함) */
  readonly endOffset: number;
}

const TAG_LEVELS: Readonly<Record<string, number>> = {
  PART: 1,
  "SECTION-1": 2,
  "SECTION-2": 3,
  "SECTION-3": 4,
};

/**
 * 본문 항목의 기준 레벨 — 태그 층(1~4) 아래에 놓인다.
 * 이 레벨이 사람이 인용하는 단위다("8. 기초자산 취득에 관한 사항"). 하위 항목(가./나.)은 +1.
 */
export const PRIMARY_ITEM_LEVEL = 5;
const ITEM_BASE_LEVEL = PRIMARY_ITEM_LEVEL;

const TAG_PATTERN = /<(\/?)(PART|SECTION-1|SECTION-2|SECTION-3)\b[^>]*>/g;
const TITLE_PATTERN = /<TITLE\b[^>]*>([\s\S]*?)<\/TITLE>/;
const PARAGRAPH_PATTERN = /<P\b[^>]*>([\s\S]*?)<\/P>/g;

/**
 * 본문 항목 번호 패턴 → 상대 깊이.
 * 좁은 패턴을 먼저 둔다 ("7-1."이 "7."로 잡히면 안 된다).
 */
const ITEM_PATTERNS: readonly (readonly [RegExp, number])[] = [
  [/^\d+-\d+\.\s*\S/, 1],
  [/^\d+\.\s*\S/, 0],
  [/^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVX]+\.\s*\S/, 0],
  [/^[가-힣]\.\s*\S/, 1],
];

/**
 * 항목 제목의 최대 길이. 이 길이를 넘으면 제목이 아니라 본문으로 본다.
 * "가. 기초자산 요약정보본건 공동사업의 기초자산은 …"처럼 제목과 본문이 한 문단에
 * 붙어 있는 경우를 통째로 항목 제목으로 오인하지 않기 위한 방어선이다.
 */
const MAX_TITLE_LENGTH = 60;

/** 문장부호로 끝나면 제목이 아니라 문장이다 (한국어 제목은 "…에 관한 사항"처럼 끝난다) */
const SENTENCE_END = /[.。!?]$/;

/**
 * 문단 맨 앞의 SPAN — 신고서는 제목만 굵게 싸고 본문을 이어 붙이는 서식을 쓴다
 * (`<P><SPAN USERMARK="B">가. 요약정보</SPAN>본문…</P>`).
 * 반대로 `<P USERMARK="B"><SPAN USERMARK="!B"></SPAN>7. 제목</P>`처럼 빈 SPAN이 앞에 오기도 해서,
 * 앞 SPAN이 비면 문단 전체 텍스트로 물러선다.
 */
const LEADING_SPAN = /^\s*<SPAN\b[^>]*>([\s\S]*?)<\/SPAN>/i;

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

/** 마크업을 걷어내고 사람이 읽는 한 줄로 만든다 */
export const stripMarkup = (raw: string): string =>
  raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();

/** 문단 텍스트가 항목 제목이면 상대 깊이를, 아니면 undefined를 돌려준다 */
export const itemDepth = (text: string): number | undefined => {
  if (text.length === 0 || text.length > MAX_TITLE_LENGTH) return undefined;
  if (SENTENCE_END.test(text)) return undefined;
  for (const [pattern, depth] of ITEM_PATTERNS) {
    if (pattern.test(text)) return depth;
  }
  return undefined;
};

/** 문단 하나가 내놓는 제목 후보 — 앞 SPAN(있으면) 다음에 문단 전체 */
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
  /** 태그 항목만 닫는 태그에서 끝이 확정된다. 본문 항목은 뒤에서 계산한다. */
  readonly endOffset?: number;
}

/** 태그 층(PART·SECTION-n) 항목을 읽는다 */
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

/** 본문 층(굵은 문단) 항목을 읽는다 — 표 안의 문단은 제외한다 */
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

/**
 * 원문 → 항목 목록 (시작 오프셋 오름차순).
 * 본문 항목의 끝은 "같거나 더 얕은 다음 항목" 또는 "감싸는 절의 끝"이다.
 */
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

/** 이 오프셋을 감싸는 항목들을 얕은 것부터 (레벨당 가장 깊은 것 하나씩) */
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
