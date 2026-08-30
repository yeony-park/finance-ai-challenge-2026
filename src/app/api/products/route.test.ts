import { describe, expect, test } from "vitest";

import { ART_PRODUCT_MEDIA_BY_ID } from "@/lib/art/product-model";

import { GET } from "./route";

describe("GET /api/products", () => {
  test("수동 검증 미술품을 페이지 바디와 no-store로 반환한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/products?category=art&page=2&pageSize=2"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.items.map((item: { id: string }) => item.id)).toEqual([
      "art-3",
      "art-4",
    ]);
    expect(body.items[0].media).toEqual({
      imageType: "official_remote",
      imageUrl:
        "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/191/202604031648559c9f0135-c61f-49c6-9ec3-bb28dc2d7d05.jpg",
      sourcePageUrl: "https://weshareart.com/goods/subscription/detail/179",
    });
    expect(body.total).toBe(5);
    expect(body.pagination).toEqual({ page: 2, pageSize: 2, totalPages: 3 });
    expect(JSON.stringify(body)).not.toContain("sourceMeta");
  });

  test("전체 목록은 승인된 4개 이미지와 상품 5 미등록 상태를 그대로 반환한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/products?category=art&pageSize=5"),
    );
    const body = await response.json();

    expect(
      body.items.map((item: { id: string; media: unknown }) => ({
        id: item.id,
        media: item.media,
      })),
    ).toEqual(
      Object.entries(ART_PRODUCT_MEDIA_BY_ID).map(([id, media]) => ({
        id,
        media,
      })),
    );
  });

  test("q로 공개 문구를 검색한다", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/products?category=art&q=%EC%83%81%ED%92%88%203",
      ),
    );
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe("art-3");
  });

  test.each([
    "category=pig",
    "page=0",
    "pageSize=101",
    "unknown=value",
  ])("잘못된 쿼리 %s는 400과 no-store를 반환한다", async (query) => {
    const response = await GET(
      new Request(`http://localhost/api/products?${query}`),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "validation_error",
      message: "상품 조회 조건을 확인해 주세요.",
    });
  });
});
