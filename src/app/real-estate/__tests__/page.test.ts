import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import nextConfig from "../../../../next.config";

import RealEstatePage, { metadata } from "../page";

describe("부동산 승인 시나리오 목록", () => {
  test("13개 시나리오 중 첫 9개를 공통 탭과 카드로 표시한다", async () => {
    const markup = renderToStaticMarkup(
      await RealEstatePage({ searchParams: Promise.resolve({ tab: "analysis" }) }),
    );

    expect(markup).toContain("서울스퀘어");
    expect(markup).toContain("센터원");
    expect(markup).not.toContain("파크원 타워1");
    expect(markup.match(/data-category-analysis-card="true"/g)).toHaveLength(9);
    expect(markup).toContain(">청약 예정 (0)</a>");
    expect(markup).toContain(">진행 중 (2)</a>");
    expect(markup).toContain(">청약 종료 (11)</a>");
    expect(markup).toContain("거래 중");
    expect(markup).toContain("정산 완료");
    expect(markup).not.toContain('href="/offers/real-estate-bbric-hiwon"');
    expect(markup).not.toContain('href="/offers/real-estate-sou-daejeon-startup"');
    expect(markup).not.toContain('href="/offers/real-estate-a"');
    expect(markup).not.toContain("한강대로 416");
    expect(markup).not.toContain("부동산 · 공개정보 확인");
    expect(markup).not.toContain("부동산 상품 검토");
    expect(markup).not.toContain("검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.");
    expect(markup.match(/검토용 시나리오/g)).toHaveLength(9);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  test.each([{}, { tab: "unknown" }])(
    "기본·알 수 없는 탭도 공통 분석 목록으로 연다",
    async (searchParams) => {
      const markup = renderToStaticMarkup(
        await RealEstatePage({ searchParams: Promise.resolve(searchParams) }),
      );

      expect(markup).toContain('aria-label="부동산 공모 상태"');
      expect(markup).toContain("서울스퀘어");
    },
  );

  test("검색과 상태를 함께 적용하고 빈 결과에서 초기화 경로를 제공한다", async () => {
    const render = async (q: string, status: string) => renderToStaticMarkup(
      await RealEstatePage({ searchParams: Promise.resolve({ q, status }) }),
    );
    const matching = await render("서울스퀘어", "open");
    expect(matching.match(/data-category-analysis-card="true"/g)).toHaveLength(1);
    expect(matching).toContain('value="open"');
    expect(matching).toContain('q=%EC%84%9C%EC%9A%B8%EC%8A%A4%ED%80%98%EC%96%B4');
    const empty = await render("서울스퀘어", "closed");
    expect(empty).not.toContain('href="/real-estate/products/');
    expect(empty).toContain("검색 조건 초기화");
  });

  test.each([
    ["upcoming", 0], ["open", 2], ["closed", 11],
    ["subscription-open", 2], ["listed-trading", 11], ["settled", 11],
  ])("상태 %s에 해당하는 상품 %i개만 표시한다", async (status, count) => {
    const markup = renderToStaticMarkup(
      await RealEstatePage({ searchParams: Promise.resolve({ status }) }),
    );
    expect(markup.match(/data-category-analysis-card="true"/g) ?? []).toHaveLength(Math.min(count, 9));
    expect(markup).toContain(`공모 상품 (${count})`);
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
