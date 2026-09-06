import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";

import { EvidenceQuery, EvidenceResultPanel, requestEvidence, type EvidenceQueryScope } from "./EvidenceQuery";
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

  test.each([
    null,
    { error: "unavailable" },
    { outcome: "other" },
    { answer: { text: "답변" } },
    { limitations: [null] },
    { knowledgeScope: "other" },
    { evidence: [null] },
    { evidence: [{ chunkId: "chunk-1", title: "공시", page: 1, sourceUrl: "https://example.com", asOf: "2026-09-06", excerpt: "문단", knowledgeScope: "mixed" }] },
    { evidence: [{ chunkId: "chunk-1", title: "공시", page: 1, sourceUrl: "https://example.com", asOf: "2026-09-06", excerpt: "문단", limitations: [42] }] },
    { structuredSources: [{ label: "공시", url: "https://example.com", asOf: "2026-09-06", dataNature: "scenario" }] },
  ])("잘못된 중첩 응답을 화면에 전달하지 않는다: %j", async (invalid) => {
    const result = invalid === null ? null : {
      outcome: "abstain", answer: "근거가 없습니다.", evidence: [], limitations: [], answerSource: "none",
      ...invalid,
    };
    // An error envelope alone must not become a synthetic answer fixture.
    const body = invalid && "error" in invalid ? invalid : result;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    await expect(requestEvidence({ scenarioId: "scenario", offerId: "offer" }, "질문", new AbortController().signal))
      .rejects.toThrow("invalid evidence response");
  });

  test("공식 출처와 문서 근거가 있는 정상 응답을 유지한다", async () => {
    const result = {
      outcome: "answer", answer: "공시 내용입니다.", answerSource: "structured", limitations: [],
      evidence: [{ chunkId: "chunk-1", title: "공시", page: 1, sourceUrl: "https://example.com", asOf: "2026-09-06", excerpt: "문단", limitations: ["정산 미확인"], dataNature: "observed", sourceKind: "official-document" }],
      structuredSources: [{ label: "공시", url: "https://example.com", asOf: "2026-09-06", dataNature: "observed" }],
      cached: true,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(result))));
    await expect(requestEvidence({ scenarioId: "scenario", offerId: "offer" }, "질문", new AbortController().signal)).resolves.toEqual(result);
  });

  test.each([
    ["general_llm", "general"],
    ["mixed_llm", "mixed"],
  ])("%s 응답을 검증한 뒤 일반·상품 근거 범위를 유지한다", async (answerSource, knowledgeScope) => {
    const result = {
      outcome: "answer", answer: "공개 근거를 확인했습니다.", answerSource, knowledgeScope, limitations: [],
      evidence: [
        { chunkId: "general-1", title: "일반", page: 1, sourceUrl: "https://example.com/general", asOf: "2026-09-06", excerpt: "일반 근거", knowledgeScope: "general" },
        ...(knowledgeScope === "mixed" ? [
          { chunkId: "product-1", title: "상품", page: 2, sourceUrl: "https://example.com/product", asOf: "2026-09-06", excerpt: "상품 근거", knowledgeScope: "product" },
        ] : []),
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(result))));
    await expect(requestEvidence({ scenarioId: "scenario", offerId: "offer" }, "질문", new AbortController().signal)).resolves.toEqual(result);
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
    expect(html).toContain('aria-label="Copilot 창 이동"');
    expect(html).toContain('aria-label="Copilot 창 크기 조절"');
  });

  test("DART 전체 공시의 논리 위치를 실제 PDF 쪽수처럼 표시하지 않는다", () => {
    const html = renderToStaticMarkup(createElement(EvidenceResultPanel, { result: {
      outcome: "evidence_only",
      answer: "관련 근거를 확인했습니다.",
      answerSource: "none",
      limitations: [],
      evidence: [{
        chunkId: "cattle-livestock-9-dart-full-20260902000022-chunk-0001",
        title: "증권신고서(투자계약증권)",
        page: 1,
        sourceUrl: "https://dart.fss.or.kr/example",
        asOf: "2026-09-02",
        excerpt: "정정된 투자위험요소입니다.",
      }],
    }}));
    expect(html).toContain("문서 섹션 1");
    expect(html).not.toContain("1쪽");
  });

  test("일반지식 답변은 상품 원문으로 오인되지 않게 표시한다", () => {
    const html = renderToStaticMarkup(createElement(EvidenceResultPanel, { result: {
      outcome: "answer",
      answer: "조각투자와 일반 주식은 권리 구조가 다릅니다.",
      answerSource: "general_llm",
      knowledgeScope: "general",
      limitations: [],
      evidence: [{
        chunkId: "general-fsc-guideline-123456789abc",
        title: "금융위원회 조각투자 가이드라인",
        page: 1,
        sourceUrl: "https://www.fsc.go.kr/example",
        asOf: "2026-09-02",
        excerpt: "조각투자는 재산적 가치가 있는 권리를 나누어 투자하는 형태입니다.",
        dataNature: "observed",
        sourceKind: "official-document",
        knowledgeScope: "general",
      }],
    }}));
    expect(html).toContain("공개 일반지식을 바탕으로 생성한 답변");
    expect(html).toContain("근거 유형 · 일반 공개정보");
    expect(html).toContain("공통 지식");
    expect(html).toContain('href="https://www.fsc.go.kr/example"');
    expect(html).not.toContain("#page=1");
  });

  test("혼합 답변은 일반 기준과 현재 상품 문서를 함께 사용했다고 표시한다", () => {
    const html = renderToStaticMarkup(createElement(EvidenceResultPanel, { result: {
      outcome: "answer",
      answer: "일반 기준과 이 상품의 권리 구조를 함께 확인했습니다.",
      answerSource: "mixed_llm",
      knowledgeScope: "mixed",
      limitations: [],
      evidence: [
        { chunkId: "general-1", title: "일반", page: 1, sourceUrl: "https://example.com/general", asOf: "2026-09-02", excerpt: "일반 근거", knowledgeScope: "general" },
        { chunkId: "product-1", title: "상품", page: 2, sourceUrl: "https://example.com/product", asOf: "2026-09-02", excerpt: "상품 근거", knowledgeScope: "product" },
      ],
    }}));
    expect(html).toContain("일반 기준과 상품 원문을 바탕으로 생성한 답변");
    expect(html).toContain("근거 유형 · 일반 공개정보 · 현재 상품 문서");
  });

  test("혼합 검색에서 한쪽 근거만 찾으면 실제 근거 범위만 표시한다", () => {
    const html = renderToStaticMarkup(createElement(EvidenceResultPanel, { result: {
      outcome: "evidence_only",
      answer: "한쪽에서만 근거를 찾았습니다.",
      answerSource: "none",
      knowledgeScope: "mixed",
      limitations: [],
      evidence: [{
        chunkId: "general-1",
        title: "일반",
        page: 1,
        sourceUrl: "https://example.com/general",
        asOf: "2026-09-02",
        excerpt: "일반 근거",
        knowledgeScope: "general",
      }],
    }}));
    expect(html).toContain("근거 유형 · 일반 공개정보");
    expect(html).not.toContain("일반 공개정보 · 현재 상품 문서");
  });
});
