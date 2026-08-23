import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { NoteList } from "../NoteList";

const item = (url: string) => ({
  id: url,
  tone: "unknown" as const,
  title: "상태 주장",
  meta: "상태 근거",
  source: {
    label: "원문",
    url,
    asOf: "2026. 8. 23.",
  },
});

describe("NoteList 출처 링크", () => {
  test("HTTP(S) URL만 안전한 새 창 링크로 렌더한다", () => {
    const markup = renderToStaticMarkup(
      NoteList({ items: [item("https://example.com/source")] }),
    );

    expect(markup).toContain('href="https://example.com/source"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("원문 · 2026. 8. 23. 기준 (새 창)");
  });

  test("HTTP(S)가 아닌 URL은 링크가 아닌 텍스트로 남긴다", () => {
    const markup = renderToStaticMarkup(
      NoteList({ items: [item("javascript:alert(1)")] }),
    );

    expect(markup).not.toContain("href=");
    expect(markup).toContain("원문 · 2026. 8. 23. 기준");
  });
});
