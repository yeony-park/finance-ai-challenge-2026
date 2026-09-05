import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { EvidenceQuery, requestEvidence, type EvidenceQueryScope } from "./EvidenceQuery";
import { ProductAiSummary } from "./ProductAiSummary";
import { ProductCopilot } from "./ProductCopilot";

afterEach(() => vi.unstubAllGlobals());

describe("공통 AI 연동", () => {
  test.each(["cattle", "pig", "art", "real-estate"] as const)("%s 상품 범위와 취소 신호를 API에 전달한다", async (categoryId) => {
    const scope: EvidenceQueryScope = { categoryId, productId: "product-1", dataNature: "observed", namespace: "common" };
    const result = { outcome: "abstain", answer: "근거가 없습니다.", evidence: [], limitations: [], answerSource: "none" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    expect(await requestEvidence(scope, "  수수료는?  ", controller.signal)).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith("/api/evidence/query", expect.objectContaining({
      method: "POST",
      signal: controller.signal,
      body: JSON.stringify({ ...scope, q: "수수료는?", limit: 5 }),
    }));
  });

  test("HTTP 오류를 답변으로 취급하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(requestEvidence({ scenarioId: "scenario", offerId: "offer" }, "질문", new AbortController().signal)).rejects.toThrow();
  });

  test("복수 Copilot 입력의 접근성 ID가 겹치지 않는다", () => {
    const query = createElement(EvidenceQuery, { scope: { scenarioId: "scenario", offerId: "offer" }, examples: [], lead: "상품 문서에서 확인합니다." });
    const html = renderToStaticMarkup(createElement(Fragment, null, query, query));
    const ids = [...html.matchAll(/<textarea id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(2);
    ids.forEach((id) => expect(html).toContain(`for="${id}"`));
  });

  test("미연결 상품에서도 같은 영역에 빈 상태를 표시하고 질문 입력을 제공하지 않는다", () => {
    const html = renderToStaticMarkup(createElement(Fragment, null,
      createElement(ProductAiSummary), createElement(ProductCopilot)));
    expect(html).toContain('aria-label="AI 요약"');
    expect(html).toContain('aria-label="Copilot"');
    expect(html).toContain("아직 등록된 요약이 없습니다.");
    expect(html).toContain("질문할 수 있는 자료가 연결되지 않았습니다.");
    expect(html).not.toContain("<textarea");
  });

  test("Copilot 버튼과 닫기 버튼은 같은 팝오버를 조작한다", () => {
    const html = renderToStaticMarkup(createElement(ProductCopilot));
    const id = html.match(/id="([^"]+)" popover="auto"/)?.[1];
    expect(id).toBeTruthy();
    expect(html.match(new RegExp(`popoverTarget="${id}"`, "g"))).toHaveLength(2);
    expect(html).toContain('popoverTargetAction="hide"');
    expect(html).toContain('role="dialog"');
  });
});
