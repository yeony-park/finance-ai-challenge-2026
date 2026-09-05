import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AiSummaryDocument } from "@/lib/ai-summary/schema";

import { AiSummary } from "./AiSummary";

const summary: AiSummaryDocument = {
  schemaVersion: 1,
  promptVersion: 3,
  categoryId: "pig",
  productId: "pig-1",
  dataNature: "observed",
  asOf: "2026-09-02",
  inputHash: "a".repeat(64),
  generatedAt: "2026-09-02T00:00:00.000Z",
  generator: "llm",
  model: "gateway:gpt-5.6-luna",
  sentences: [
    "DART 공시의 주요 조건과 위험 문단은 확인됐습니다.",
    "개체 단위 대조는 지원하지 않습니다.",
  ],
  sentenceEvidencePaths: [["/confirmedSections/0/text"], ["/verificationBoundary"]],
  sentenceEvidenceExcerpts: [["공시 원문 발췌"], ["개체 단위 대조는 지원하지 않습니다."]],
  sourceReferences: ["source", "https://dart.fss.or.kr/example"],
};

describe("AiSummary", () => {
  it("renders the AI label and one joined one-to-two sentence summary", () => {
    const markup = renderToStaticMarkup(createElement(AiSummary, { summary }));
    expect(markup).toContain('aria-label="AI 요약"');
    expect(markup).toContain("AI 요약");
    expect(markup).toContain(summary.sentences.join(" "));
    expect(markup).toContain("기준일 2026-09-02 · 근거 보기");
    expect(markup).toContain("문장 1 근거");
    expect(markup).not.toContain("/confirmedSections/0/text");
    expect(markup).toContain("공시 원문 발췌");
    expect(markup).not.toContain("<code>source</code>");
    expect(markup).toContain('href="https://dart.fss.or.kr/example"');
    expect(markup).toContain('target="_blank"');
  });

  it.each([
    ["idle", "아직 등록된 요약이 없습니다."],
    ["loading", "요약을 불러오고 있습니다."],
    ["error", "요약을 불러오지 못했습니다."],
  ] as const)("요약 %s 상태를 구분한다", (status, text) => {
    const markup = renderToStaticMarkup(createElement(AiSummary, { summary: null, status }));
    expect(markup).toContain(text);
    expect(markup).toContain(`aria-busy="${status === "loading"}"`);
    expect(markup).not.toContain("근거 보기");
  });
});
