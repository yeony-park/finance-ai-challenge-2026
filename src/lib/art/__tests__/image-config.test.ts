import { describe, expect, test } from "vitest";

import nextConfig from "../../../../next.config";
import { ART_PRODUCT_MEDIA_BY_ID } from "@/lib/art/product-model";

describe("미술품 원격 이미지 설정", () => {
  test("공식 이미지 4개 파일만 허용하고 리다이렉트·로컬 IP를 차단한다", () => {
    const approvedUrls = Object.values(ART_PRODUCT_MEDIA_BY_ID)
      .filter((media) => media.imageType === "official_remote")
      .map((media) => new URL(media.imageUrl));

    expect(nextConfig.images?.remotePatterns).toEqual(approvedUrls);
    expect(nextConfig.images?.maximumRedirects).toBe(0);
    expect(nextConfig.images?.dangerouslyAllowLocalIP).toBe(false);
  });
});
