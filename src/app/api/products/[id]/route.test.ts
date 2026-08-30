import { describe, expect, test } from "vitest";

import { ART_PRODUCT_MEDIA_BY_ID } from "@/lib/art/product-model";

import { GET } from "./route";

const request = new Request("http://localhost/api/products/art-1");
const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/products/{id}", () => {
  test("공개 상품 상세만 no-store로 반환한다", async () => {
    const response = await GET(request, context("art-4"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.id).toBe("art-4");
    expect(body.evidence.map((item: { rcpNo: string }) => item.rcpNo)).toEqual([
      "20260513000002",
    ]);
  });

  test.each(Object.entries(ART_PRODUCT_MEDIA_BY_ID))(
    "%s 상세는 정확한 미디어 매핑을 반환한다",
    async (id, media) => {
      const response = await GET(request, context(id));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.media).toEqual(media);
    },
  );

  test.each(["art-0", "art-01", "pig-1", `art-${"1".repeat(40)}`])(
    "잘못된 id %s는 400을 반환한다",
    async (id) => {
      const response = await GET(request, context(id));
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect((await response.json()).error).toBe("validation_error");
    },
  );

  test("형식은 맞지만 공개되지 않은 id는 404를 반환한다", async () => {
    const response = await GET(request, context("art-99"));
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).error).toBe("not_found");
  });
});
