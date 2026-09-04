import { describe, expect, test } from "vitest";

import { OFFERS, type SubscriptionPhase } from "@/components/site/offers";

import { loadCategoryLandingModel } from "./category-landing-model";

const cattleOffers = OFFERS.filter((offer) => offer.assetKind === "livestock");

const loadModel = (analysisStatus: SubscriptionPhase | null) =>
  loadCategoryLandingModel({
    categoryId: "cattle",
    offers: cattleOffers,
    analysisStatus,
  });

describe("카테고리 분석 공모 상태 필터", () => {
  test("상태가 없으면 모든 공모 카드를 표시한다", async () => {
    const model = await loadModel(null);

    expect(model.visibleEvidence.map((entry) => entry.offer.id)).toEqual(
      model.evidence.map((entry) => entry.offer.id),
    );
  });

  test.each<SubscriptionPhase>(["upcoming", "open", "closed"])(
    "%s 상태 카드만 표시한다",
    async (status) => {
      const model = await loadModel(status);

      expect(model.visibleEvidence.map((entry) => entry.offer.id)).toEqual(
        model.evidence
          .filter((entry) => entry.schedule.phase === status)
          .map((entry) => entry.offer.id),
      );
    },
  );
});
