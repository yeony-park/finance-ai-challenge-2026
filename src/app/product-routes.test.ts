import { describe, expect, test } from "vitest";

import CattleProductPage, {
  dynamicParams as cattleDynamicParams,
  generateStaticParams as cattleStaticParams,
} from "@/app/cattle/products/[id]/page";
import RealEstateProductPage, {
  dynamicParams as realEstateDynamicParams,
  generateStaticParams as realEstateStaticParams,
} from "@/app/real-estate/products/[id]/page";
import { PUBLISHED_OFFER_IDS } from "@/components/site/offers";

const propsFor = (id: string) => ({ params: Promise.resolve({ id }) });

describe("카테고리별 상품 상세 정적 라우트", () => {
  test("한우와 부동산 공개 ID를 각 products 경로에 나눠 생성한다", () => {
    expect(cattleStaticParams()).toEqual([
      { id: "livestock-1" },
      { id: "livestock-2" },
      { id: "livestock-3" },
      { id: "livestock-4" },
      { id: "livestock-5" },
      { id: "livestock-6" },
      { id: "livestock-7" },
      { id: "livestock-8" },
      { id: "livestock-9" },
    ]);
    expect(realEstateStaticParams()).toEqual([{ id: "real-estate-a" }]);
    expect(
      [...cattleStaticParams(), ...realEstateStaticParams()].map(({ id }) => id),
    ).toEqual(PUBLISHED_OFFER_IDS);
  });

  test("두 상세 경로 모두 등록되지 않은 동적 ID 생성을 막는다", () => {
    expect(cattleDynamicParams).toBe(false);
    expect(realEstateDynamicParams).toBe(false);
  });

  test("다른 카테고리 ID와 미등록 ID는 404로 처리한다", async () => {
    await expect(
      CattleProductPage(propsFor("real-estate-a")),
    ).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    await expect(
      RealEstateProductPage(propsFor("livestock-9")),
    ).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    await expect(
      CattleProductPage(propsFor("unknown-offer")),
    ).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  });
});
