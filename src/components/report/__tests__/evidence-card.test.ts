import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import type { FocusView } from "@/lib/verify/report/view-model";

import { EvidenceCard } from "../EvidenceCard";

const focus: FocusView = {
  no: 1,
  title: "근거 대조",
  summary: "근거 요약",
  claimHeading: "상품 원문",
  claimRows: [],
  ledgerHeading: "외부 원장",
  ledgerRows: [],
  foot: { easy: [], pro: [] },
  sourceDoc: "상품 원문",
  sourceDocUrl: "javascript:alert(1)",
  sourceLedger: "외부 원장",
  sourceLedgerUrl: "https://example.com/ledger",
};

describe("EvidenceCard 출처 링크", () => {
  test.each(["javascript:alert(1)", "not a url"])(
    "HTTP(S)가 아니거나 파싱할 수 없는 URL(%s)은 span으로 렌더한다",
    (sourceDocUrl) => {
      const markup = renderToStaticMarkup(
        createElement(EvidenceCard, {
          focus: { ...focus, sourceDocUrl },
          level: "easy",
        }),
      );

      expect(markup).not.toContain(sourceDocUrl);
      expect(markup).toContain(">상품 원문</span>");
      expect(markup).toContain('href="https://example.com/ledger"');
      expect(markup).toContain('target="_blank"');
      expect(markup).toContain('rel="noopener noreferrer"');
      expect(markup).toContain('aria-label="외부 원장 (새 창)"');
    },
  );
});
