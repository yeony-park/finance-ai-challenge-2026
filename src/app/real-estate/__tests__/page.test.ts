import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { SCENARIO_DEMO_DISCLOSURE } from "@/lib/knowledge/schema";
import nextConfig from "../../../../next.config";

import RealEstatePage, { metadata } from "../page";

describe("부동산 승인 시나리오 목록", () => {
  test("13개 시나리오를 세 단계로 나누고 실제 상품은 노출하지 않는다", async () => {
    const markup = renderToStaticMarkup(
      await RealEstatePage({ searchParams: Promise.resolve({}) }),
    );

    expect(markup).toContain("서울스퀘어");
    expect(markup).toContain("센터원");
    expect(markup).toContain("파크원 타워1");
    expect(markup.match(/href="\/offers\/re-offer-/g)).toHaveLength(13);
    expect(markup).toContain("청약 중");
    expect(markup).toContain("상장 거래");
    expect(markup).toContain("종료");
    expect(markup).not.toContain('href="/offers/real-estate-bbric-hiwon"');
    expect(markup).not.toContain('href="/offers/real-estate-sou-daejeon-startup"');
    expect(markup).not.toContain('href="/offers/real-estate-a"');
    expect(markup).not.toContain("한강대로 416");
    expect(markup).toContain("검토 대상 13개");
    expect(markup.split("검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.")).toHaveLength(2);
    expect(markup.split(SCENARIO_DEMO_DISCLOSURE)).toHaveLength(2);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  test("제거된 실제 부동산 상세 경로에만 검색 차단 응답 헤더를 둔다", async () => {
    const headers = await nextConfig.headers?.();
    expect(headers).toEqual(
      expect.arrayContaining(
        [
          "/offers/real-estate-a",
          "/offers/real-estate-bbric-hiwon",
          "/offers/real-estate-sou-daejeon-startup",
        ].map((source) =>
          expect.objectContaining({
            source,
            headers: expect.arrayContaining([
              { key: "X-Robots-Tag", value: "noindex, nofollow" },
            ]),
          }),
        ),
      ),
    );
    expect(headers?.find((entry) => entry.source === "/:path*")?.headers).not.toContainEqual(
      expect.objectContaining({ key: "X-Robots-Tag" }),
    );
  });
});
