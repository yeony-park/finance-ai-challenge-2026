import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  CategoryLanding,
  type CategoryLandingProps,
} from "@/components/category/CategoryLanding";

import RealEstatePage from "../page";

describe("부동산 카테고리 근거 안내", () => {
  test("구현 대기 placeholder 대신 실제 대조 범위와 한계를 표시한다", async () => {
    const page = RealEstatePage();
    const markup = renderToStaticMarkup(
      await CategoryLanding(page.props as CategoryLandingProps),
    );

    expect(markup).toContain("BuildingHUB");
    expect(markup).toContain("국토부 건축물대장");
    expect(markup).toContain("국토부 RTMS 신고");
    expect(markup).toContain("동일 물건 확정이나 적정성 판단은 하지 않음");
    expect(markup).toContain("플랫폼의 운영·배당 주장");
    expect(markup).toContain("부동산 근거를 읽는 순서");
    expect(markup).toContain("공개 원문상 현재 청약·매수 가능 확인 상품");
    expect(markup).toContain("과거 상품 운용·종료 이력");
    expect(markup).not.toContain(">부동산 A</a>");
    expect(markup).not.toContain("선언 대기");
    expect(markup).not.toContain("담당 구현");
  });
});
