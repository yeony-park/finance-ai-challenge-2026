import { describe, expect, test } from "vitest";

import CattlePage from "@/app/cattle/page";
import OfferReportPage, {
  generateStaticParams,
} from "@/app/offers/[id]/page";
import OffersPage from "@/app/offers/page";

describe("공개 verification route availability", () => {
  test("목록과 cattle 페이지는 pending 공개 파일 때문에 실패하지 않는다", async () => {
    await expect(OffersPage()).resolves.toBeTruthy();
    await expect(
      CattlePage({ searchParams: Promise.resolve({}) }),
    ).resolves.toBeTruthy();
  });

  test("pending cattle 상세는 404이고 active cattle 상세은 정상이다", async () => {
    await expect(
      OfferReportPage({ params: Promise.resolve({ id: "livestock-1" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(
      OfferReportPage({ params: Promise.resolve({ id: "livestock-9" }) }),
    ).resolves.toBeTruthy();
  });

  test("정적 경로에는 active cattle만 포함한다", async () => {
    const params = await generateStaticParams();
    expect(params).toContainEqual({ id: "livestock-9" });
    expect(params).not.toContainEqual({ id: "livestock-1" });
    expect(params).not.toContainEqual({ id: "livestock-8" });
  });
});
