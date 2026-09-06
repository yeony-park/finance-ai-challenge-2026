import { describe, expect, test, vi } from "vitest";

import {
  isProductEvidenceApprovedForExternalAi,
  needsCrossScopePlanning,
  planProductCopilotQuery,
  selectMixedEvidence,
} from "../product-copilot-routing";

describe("상품 Copilot 검색 범위 라우팅", () => {
  test("상품 질문도 분류한 뒤 현재 상품 범위를 유지한다", async () => {
    const planner = vi.fn(async () => ({
      target: "product",
      generalQuery: null,
      productQuery: "최소투자금",
      structuredQuery: null,
    }));
    await expect(planProductCopilotQuery("최소투자금은 얼마인가요?", {
      runtimeAiAllowed: true,
      planner,
    })).resolves.toEqual({
      target: "product",
      generalQuery: null,
      productQuery: "최소투자금",
      structuredQuery: null,
    });
    expect(planner).toHaveBeenCalledWith("최소투자금은 얼마인가요?");
  });

  test("상품 화면의 범위 미지정 보호장치 질문은 현재 상품으로 분류한다", async () => {
    await expect(planProductCopilotQuery("투자자 보호장치에 대해서 알려줘", {
      runtimeAiAllowed: true,
      planner: async () => ({
        target: "product",
        generalQuery: null,
        productQuery: "현재 상품의 투자자 보호장치",
      }),
    })).resolves.toEqual({
      target: "product",
      generalQuery: null,
      productQuery: "현재 상품의 투자자 보호장치",
      structuredQuery: null,
    });
  });

  test("등록하지 않은 일반 용어도 문구 목록 없이 분류기에 보낸다", async () => {
    const planner = vi.fn(async () => ({
      target: "general",
      generalQuery: "분산원장 정의",
      productQuery: null,
    }));
    await expect(planProductCopilotQuery("분산원장이 뭐야?", {
      runtimeAiAllowed: true,
      planner,
    })).resolves.toMatchObject({ target: "general" });
    expect(planner).toHaveBeenCalledOnce();
  });

  test("일반 개념 질문은 일반지식 검색 계획을 사용한다", async () => {
    expect(needsCrossScopePlanning("조각투자랑 일반투자 차이")).toBe(true);
    await expect(planProductCopilotQuery("조각투자랑 일반투자 차이", {
      runtimeAiAllowed: true,
      planner: async () => ({
        target: "general",
        generalQuery: "조각투자 일반 투자 차이",
        productQuery: null,
      }),
    })).resolves.toEqual({
      target: "general",
      generalQuery: "조각투자 일반 투자 차이",
      productQuery: null,
      structuredQuery: null,
    });
  });

  test("일반 기준을 현재 상품에 적용하는 질문은 두 검색어를 분리한다", async () => {
    await expect(planProductCopilotQuery("일반 주식과 비교하면 이 상품은 어떻게 달라?", {
      runtimeAiAllowed: true,
      planner: async () => ({
        target: "mixed",
        generalQuery: "일반 주식과 조각투자 차이",
        productQuery: "현재 상품의 권리 구조",
      }),
    })).resolves.toEqual({
      target: "mixed",
      generalQuery: "일반 주식과 조각투자 차이",
      productQuery: "현재 상품의 권리 구조",
      structuredQuery: null,
    });
  });

  test("분류기를 사용할 수 없을 때도 일반 질문을 상품 문서로 잘못 보내지 않는다", async () => {
    await expect(planProductCopilotQuery("금융위원회의 조각투자 가이드라인", {
      runtimeAiAllowed: false,
    })).resolves.toEqual({
      target: "general",
      generalQuery: "금융위원회의 조각투자 가이드라인",
      productQuery: null,
      structuredQuery: null,
    });
  });

  test("LLM 없이도 한돈 가격 추세를 구조화 조회로 계획한다", async () => {
    await expect(planProductCopilotQuery("최근 한돈 가격 추세", {
      runtimeAiAllowed: false,
      categoryId: "pig",
    })).resolves.toMatchObject({
      target: "product",
      structuredQuery: { kind: "price", mode: "trend" },
    });
  });

  test("짧은 한우 가격 질문도 상품 공모가격이 아닌 외부 시세 조회로 분류한다", async () => {
    await expect(planProductCopilotQuery("한우 가격은 어때", {
      runtimeAiAllowed: false,
      categoryId: "cattle",
    })).resolves.toMatchObject({
      structuredQuery: { kind: "price", mode: "latest" },
    });
  });

  test("LLM 없이도 연도·지역·질병 조건을 보수적으로 추출한다", async () => {
    await expect(planProductCopilotQuery("2025년 경기 ASF 발생 건수", {
      runtimeAiAllowed: false,
      categoryId: "pig",
    })).resolves.toMatchObject({
      structuredQuery: {
        kind: "disease",
        mode: "count",
        disease: "ASF",
        region: "경기",
        fromDate: "2025-01-01",
        toDate: "2025-12-31",
      },
    });
  });

  test("혼합 답변은 승인·PII 검토를 모두 통과한 상품 근거만 외부 AI에 전송한다", () => {
    expect(isProductEvidenceApprovedForExternalAi([
      { approvedForExternalAi: true, piiReviewStatus: "passed" },
    ])).toBe(true);
    expect(isProductEvidenceApprovedForExternalAi([
      { approvedForExternalAi: false, piiReviewStatus: "passed" },
    ])).toBe(false);
    expect(isProductEvidenceApprovedForExternalAi([
      { approvedForExternalAi: true, piiReviewStatus: "not-reviewed" },
    ])).toBe(false);
    expect(isProductEvidenceApprovedForExternalAi([])).toBe(false);
  });

  test("혼합 근거 limit이 1이어도 양쪽에서 최소 1건을 유지한다", () => {
    expect(selectMixedEvidence(["general-1", "general-2"], ["product-1", "product-2"], 1))
      .toEqual(["general-1", "product-1"]);
    expect(selectMixedEvidence(["general-1"], [], 1)).toEqual(["general-1"]);
  });
});
