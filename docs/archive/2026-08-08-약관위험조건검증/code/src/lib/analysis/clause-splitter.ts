/**
 * 조항 분할 — 약관 원문을 조(條) 단위 ClauseSpan으로 나눈다.
 * 정규식 1차 분할. 머리말·분할 실패 텍스트는 버리지 않고 parsed=false로 정직 표기한다.
 */
import type { ClauseSpan } from "./types";

const ARTICLE_HEAD_RE = /제\s*(\d+)\s*조(?:의\s*(\d+))?\s*\(([^)]+)\)/g;

export const splitClauses = (
  docId: string,
  rawText: string,
): readonly ClauseSpan[] => {
  const text = rawText.trim();
  if (!text) return [];

  const heads = [...text.matchAll(ARTICLE_HEAD_RE)];
  if (heads.length === 0) {
    return [
      {
        clauseId: `${docId}#unparsed-0`,
        articleNo: null,
        heading: "미분할 텍스트",
        text,
        parsed: false,
      },
    ];
  }

  const spans: ClauseSpan[] = [];

  const preamble = text.slice(0, heads[0].index).trim();
  if (preamble) {
    spans.push({
      clauseId: `${docId}#preamble`,
      articleNo: null,
      heading: "머리말(미분할)",
      text: preamble,
      parsed: false,
    });
  }

  heads.forEach((head, i) => {
    const start = head.index;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const articleNo = Number(head[1]);
    const sub = head[2] ? `의${head[2]}` : "";
    spans.push({
      clauseId: `${docId}#art-${articleNo}${sub}`,
      articleNo,
      heading: `제${articleNo}조${sub}(${head[3]})`,
      text: text.slice(start, end).trim(),
      parsed: true,
    });
  });

  return spans;
};

/** 조 제목 매칭용 정규화 — 공백 제거, 괄호 안 제목만 비교 */
export const normalizeHeading = (heading: string): string => {
  const inParens = heading.match(/\(([^)]+)\)/);
  return (inParens?.[1] ?? heading).replace(/\s+/g, "");
};
