import { describe, expect, it } from "vitest";

import { OFFERS } from "@/components/site/offers";

import { searchOffers } from "../global-search";
import { loadApprovedScenarios } from "../loader";

const DETAIL_HREF = /^\/(cattle|pig|art|real-estate)\/products\/([^/?#]+)$/;

describe("홈 검색 링크 정합성", () => {
  it("공개 상세 페이지가 없는 legacy 부동산 공모는 어떤 질의에도 나오지 않는다", async () => {
    const legacy = OFFERS.filter((offer) => offer.assetKind === "real-estate").map((offer) => offer.id);
    expect(legacy).toContain("real-estate-a");
    for (const q of ["한우 공모", "부동산 A", "청약 종료 공모"]) {
      const { results } = await searchOffers({ q, limit: 20 });
      for (const id of legacy) {
        expect(results.map((item) => item.id), q).not.toContain(id);
      }
    }
  });

  it("published-offer 결과의 categoryId와 href는 정적 생성되는 상세 경로와 일치한다", async () => {
    const cattleIds = new Set(
      OFFERS.filter((offer) => offer.assetKind === "livestock").map((offer) => offer.id),
    );
    const scenarioIds = new Set((await loadApprovedScenarios()).map((offer) => offer.offerId));
    const { results } = await searchOffers({ q: "한우 공모", limit: 20 });
    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      const match = DETAIL_HREF.exec(item.href);
      expect(match, item.href).not.toBeNull();
      const [, category, encodedId] = match!;
      const id = decodeURIComponent(encodedId!);
      if (item.namespace === "published-offer" && item.categoryId === "cattle") {
        expect(category, item.href).toBe("cattle");
        expect(cattleIds.has(id), item.href).toBe(true);
      }
      if (category === "real-estate") {
        expect(item.categoryId, item.href).toBe("real-estate");
        expect(scenarioIds.has(id), item.href).toBe(true);
      }
    }
  });
});
