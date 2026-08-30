import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  ART_PRODUCT_MEDIA_BY_ID,
  artEvidenceSchema,
  artProductMediaSchema,
  artProductSchema,
} from "@/lib/art/product-model";
import {
  getArtProductById,
  listArtProducts,
} from "@/lib/art/product-repository";
import {
  loadFileModeOfferings,
  resolveOfferingsRepository,
} from "@/lib/db/repositories/offerings";

describe("공개 미술품 상품 repository", () => {
  test("커밋된 수동 검증 5건만 안정적인 순서와 공개 DTO로 반환한다", async () => {
    const products = await listArtProducts();

    expect(products.map((product) => product.id)).toEqual([
      "art-1",
      "art-2",
      "art-3",
      "art-4",
      "art-5",
    ]);
    expect(
      products.every(
        (product) =>
          product.categoryId === "art" &&
          product.provenance === "manual_verified" &&
          artProductSchema.safeParse(product).success,
      ),
    ).toBe(true);

    const serialized = JSON.stringify(products);
    expect(serialized).not.toContain("sourceMeta");
    expect(serialized).not.toContain("sha256");
    expect(serialized).not.toContain("synthetic");
    expect(serialized).not.toContain("legacy");
  });

  test("금액과 미술품 필드는 data/offers를, 판정 문구는 편집 정보를 사용한다", async () => {
    const product = await getArtProductById("art-1");

    expect(product).toMatchObject({
      id: "art-1",
      label: "상품 1",
      media: ART_PRODUCT_MEDIA_BY_ID["art-1"],
      offering: { amountWon: 1_182_000_000 },
      art: {
        acquisitionWon: 1_094_030_255,
        issuanceCostWon: 87_969_745,
        lifecycle: "청약 완료 · 작품보관",
        asOf: "2026-08-08",
      },
      assessment: {
        verdict: "unverifiable",
        statusNote: "현재 보유 상태 미확인",
      },
    });
    expect(await getArtProductById("art-99")).toBeNull();
  });

  test("공식 작품 이미지 4건만 정확한 상품 원문과 연결하고 상품 5는 미등록으로 둔다", async () => {
    const products = await listArtProducts();

    expect(products.map(({ id, media }) => ({ id, media }))).toEqual(
      Object.entries(ART_PRODUCT_MEDIA_BY_ID).map(([id, media]) => ({
        id,
        media,
      })),
    );
    expect(
      products.filter((product) => product.media.imageType === "official_remote"),
    ).toHaveLength(4);
    expect(products[4]?.media).toEqual({
      imageType: "missing",
      imageUrl: null,
      sourcePageUrl: null,
    });
  });

  test("미디어 경계는 승인된 이미지·원문 쌍 외의 URL을 거부한다", () => {
    const approved = ART_PRODUCT_MEDIA_BY_ID["art-1"];
    expect(artProductMediaSchema.safeParse(approved).success).toBe(true);
    for (const imageUrl of [
      "https://dzb2k3770zezk.cloudfront.net/file/img/artWork/999/other.jpg",
      `${approved.imageUrl}?size=large`,
      `${approved.imageUrl}#fragment`,
      approved.imageUrl.replace("https://", "http://"),
      approved.imageUrl.replace("dzb2k3770zezk.cloudfront.net", "example.com"),
    ]) {
      expect(
        artProductMediaSchema.safeParse({ ...approved, imageUrl }).success,
        imageUrl,
      ).toBe(false);
    }
    expect(
      artProductMediaSchema.safeParse({
        ...approved,
        sourcePageUrl: ART_PRODUCT_MEDIA_BY_ID["art-2"].sourcePageUrl,
      }).success,
    ).toBe(false);
    expect(
      artProductMediaSchema.safeParse({
        imageType: "missing",
        imageUrl: approved.imageUrl,
        sourcePageUrl: null,
      }).success,
    ).toBe(false);
  });

  test("원본 sources는 모두 보존하되 상품 4 공개 근거는 소유 접수 1건만 허용한다", async () => {
    const offerings = await resolveOfferingsRepository();
    const raw = await offerings.findBySlug("art-4");
    expect(raw?.detail.sources).toHaveLength(3);

    const product = await getArtProductById("art-4");
    expect(product?.evidence.map((item) => item.rcpNo)).toEqual([
      "20260513000002",
    ]);
    expect(product?.evidence[0]?.url).toBe(
      "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002",
    );
    expect((await getArtProductById("art-5"))?.evidence).toEqual([]);
  });

  test("공개 조회는 외부 fetch를 호출하지 않는다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      await listArtProducts();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test("근거의 접수번호·날짜·DART 표준 URL을 함께 검증한다", () => {
    const valid = {
      id: "art-1:dart:20240116000005",
      label: "DART 투자설명서",
      rcpNo: "20240116000005",
      asOf: "2024-01-16",
      url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20240116000005",
    };
    expect(artEvidenceSchema.safeParse(valid).success).toBe(true);
    expect(
      artEvidenceSchema.safeParse({ ...valid, asOf: "2024-02-31" }).success,
    ).toBe(false);
    expect(
      artEvidenceSchema.safeParse({
        ...valid,
        url: `${valid.url}&redirect=https://example.com`,
      }).success,
    ).toBe(false);
  });

  test("원천 sources의 미정의 필드는 strict 경계에서 거부한다", async () => {
    const dataDir = mkdtempSync(path.join(tmpdir(), "art-source-schema-"));
    const offersDir = path.join(dataDir, "offers");
    mkdirSync(offersDir);
    writeFileSync(
      path.join(offersDir, "invalid.json"),
      JSON.stringify({
        offerId: "art-99",
        publicAlias: "상품 99",
        assetKind: "art",
        offer: { amountWon: 1 },
        art: {
          acquisitionWon: null,
          issuanceCostWon: null,
          lifecycle: "미확인",
          asOf: "2026-08-30",
        },
        sources: [
          {
            label: "DART 문서",
            url: "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260830000001",
            retrievedOn: "2026-08-30",
            unexpected: "공개 금지",
          },
        ],
      }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const offerings = await loadFileModeOfferings(dataDir);
      expect(offerings.some((offering) => offering.offerSlug === "art-99")).toBe(
        false,
      );
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});
