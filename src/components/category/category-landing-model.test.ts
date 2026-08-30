import { describe, expect, test } from "vitest";

import { OFFERS } from "@/components/site/offers";

import { loadCategoryLandingModel } from "./category-landing-model";

const cattleOffers = OFFERS.filter((offer) => offer.assetKind === "livestock");

const loadModel = (
  analysisStatus: "upcoming" | "open" | "closed" | null,
  analysisVerdict: "match" | "mismatch" | "unverifiable" | null,
) =>
  loadCategoryLandingModel({
    categoryId: "cattle",
    title: "한우",
    offers: cattleOffers,
    analysisStatus,
    analysisVerdict,
    hasCustomContent: false,
    customTitle: "",
    hasMarketContent: false,
  });

describe("카테고리 분석 공모 필터", () => {
  test("필터가 없으면 모든 공모 카드를 표시한다", async () => {
    const model = await loadModel(null, null);

    expect(model.visibleEvidence.map((entry) => entry.offer.id)).toEqual(
      model.evidence.map((entry) => entry.offer.id),
    );
  });

  test("한돈 분석 항목에서는 빈 공모 현황과 누적 판정을 제외한다", async () => {
    const model = await loadCategoryLandingModel({
      categoryId: "pig",
      title: "한돈",
      offers: [],
      analysisStatus: null,
      analysisVerdict: null,
      hasCustomContent: true,
      customTitle: "최근 상품",
      hasMarketContent: false,
    });

    expect(model.analysisSections.map((section) => section.id)).not.toContain(
      "한돈-evidence",
    );
    expect(model.analysisSections.map((section) => section.id)).not.toContain(
      "한돈-verdicts",
    );
    expect(model.analysisSections.map((section) => section.id)).not.toContain(
      "pig-review-beginner-title",
    );
    expect(model.analysisSections[0]).toMatchObject({
      id: "pig-gallery-title",
      label: "최근 상품",
    });
    expect(model.analysisSections.map((section) => section.id)).toContain(
      "한돈-questions",
    );
  });

  test.each([
    ["art", "미술품"],
    ["real-estate", "부동산"],
  ] as const)(
    "%s 분석 항목에는 확인 질문을 표시한다",
    async (categoryId, title) => {
      const model = await loadCategoryLandingModel({
        categoryId,
        title,
        offers: [],
        analysisStatus: null,
        analysisVerdict: null,
        hasCustomContent: false,
        customTitle: "",
        hasMarketContent: false,
      });

      expect(model.analysisSections.map((section) => section.id)).toContain(
        `${title}-questions`,
      );
    },
  );

  test("한우 분석 항목에는 확인 질문을 유지한다", async () => {
    const model = await loadModel(null, null);

    expect(model.analysisSections.map((section) => section.id)).toContain(
      "한우-questions",
    );
  });

  test.each(["match", "mismatch", "unverifiable"] as const)(
    "%s 판정이 한 건 이상 있는 공모만 표시한다",
    async (verdict) => {
      const model = await loadModel(null, verdict);

      expect(model.visibleEvidence.map((entry) => entry.offer.id)).toEqual(
        model.evidence
          .filter((entry) => entry.loaded.report.summary[verdict] > 0)
          .map((entry) => entry.offer.id),
      );
    },
  );

  test("청약 상태와 판정은 AND 조건으로 결합한다", async () => {
    const model = await loadModel("closed", "unverifiable");

    expect(model.visibleEvidence.map((entry) => entry.offer.id)).toEqual(
      model.evidence
        .filter(
          (entry) =>
            entry.schedule.phase === "closed" &&
            entry.loaded.report.summary.unverifiable > 0,
        )
        .map((entry) => entry.offer.id),
    );
  });
});
