import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import CattlePage from "@/app/cattle/page";
import OfferReportPage, {
  generateStaticParams,
} from "@/app/offers/[id]/page";
import OffersPage from "@/app/offers/page";

describe("공개 verification route availability", () => {
  test("목록은 개별 legacy report 실패를 artifact 카드로 대체하고 전체 렌더를 유지한다", async () => {
    const markup = renderToStaticMarkup(await OffersPage());
    for (let round = 1; round <= 8; round += 1) {
      expect(markup).toContain(`href="/offers/livestock-${round}"`);
    }
    expect(markup).toContain("원금 미보장 문단 확인");
    await expect(
      CattlePage({ searchParams: Promise.resolve({}) }),
    ).resolves.toBeTruthy();
  });

  test("승인 artifact가 있는 한우 1~8호와 기존 9호 상세은 정상이다", async () => {
    for (let round = 1; round <= 8; round += 1) {
      await expect(
        OfferReportPage({ params: Promise.resolve({ id: `livestock-${round}` }) }),
      ).resolves.toBeTruthy();
    }
    await expect(
      OfferReportPage({ params: Promise.resolve({ id: "livestock-9" }) }),
    ).resolves.toBeTruthy();
  });

  test("정적 경로에는 승인된 cattle과 pig 상세을 포함한다", async () => {
    const params = await generateStaticParams();
    for (let round = 1; round <= 9; round += 1) {
      expect(params).toContainEqual({ id: `livestock-${round}` });
    }
    for (let round = 1; round <= 3; round += 1) {
      expect(params).toContainEqual({ id: `pig-${round}` });
    }
  });
});
