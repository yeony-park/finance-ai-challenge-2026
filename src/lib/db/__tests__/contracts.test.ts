import { describe, expect, test } from "vitest";

import {
  artAuctionRecordRowSchema,
  offeringRowSchema,
  ragDocumentRowSchema,
} from "../records";
import {
  isSafePublicSourceUrl,
  sanitizePublicSourceUrl,
} from "@/lib/verify/real-estate/source-url";

const baseSourceMeta = {
  sourceUrl: "synthetic://generator/x",
  license: "synthetic",
  method: "deterministic-generator",
  retrievedAt: "2026-08-29T00:00:00.000Z",
  sha256: "deadbeef",
};

const baseOffering = {
  offerSlug: "ex-art-x",
  categoryId: "art",
  provenance: "synthetic",
  titlePublic: "예시 회화 X",
  amountWon: 1_000_000,
  opensOn: "2026-05-01",
  closesOn: "2026-05-10",
  detail: {},
  sourceMeta: baseSourceMeta,
};

describe("① provenance 3값 외 거부 (R-STO-05)", () => {
  test("등록되지 않은 provenance는 거부된다", () => {
    const result = offeringRowSchema.safeParse({
      ...baseOffering,
      provenance: "guessed",
    });
    expect(result.success).toBe(false);
  });

  test.each(["public_record", "manual_verified", "synthetic"] as const)(
    "허용된 provenance %s는 통과한다",
    (provenance) => {
      const result = offeringRowSchema.safeParse({
        ...baseOffering,
        provenance,
        ...(provenance === "synthetic" ? {} : {
          sourceMeta: { ...baseSourceMeta, sourceUrl: "https://example.com/landing" },
        }),
        titlePublic:
          provenance === "synthetic" ? "예시 회화 X" : "부동산 A",
      });
      expect(result.success).toBe(true);
    },
  );
});

describe("⑤ synthetic '예시 ' 프리픽스 강제 (R-STO-07a)", () => {
  test("프리픽스 없는 synthetic offerings.title_public은 거부된다", () => {
    const result = offeringRowSchema.safeParse({
      ...baseOffering,
      titlePublic: "회화 X",
    });
    expect(result.success).toBe(false);
  });

  test("public_record 레코드에는 프리픽스를 요구하지 않는다", () => {
    const result = offeringRowSchema.safeParse({
      ...baseOffering,
      provenance: "public_record",
      titlePublic: "부동산 A",
      sourceMeta: { ...baseSourceMeta, sourceUrl: "https://example.com/landing" },
    });
    expect(result.success).toBe(true);
  });

  test("synthetic art 레코드는 artwork_title·auction_house 둘 다 프리픽스가 필요하다", () => {
    const good = artAuctionRecordRowSchema.safeParse({
      externalRef: "ref-1",
      provenance: "synthetic",
      artworkTitle: "예시 회화",
      auctionDate: "2026-01-01",
      auctionHouse: "예시 경매사",
      medium: null,
      widthCm: null,
      heightCm: null,
      currency: "KRW",
      normalizedPriceKrw: 1000,
      result: "sold",
      sourceMeta: baseSourceMeta,
    });
    expect(good.success).toBe(true);

    const badHouse = artAuctionRecordRowSchema.safeParse({
      externalRef: "ref-2",
      provenance: "synthetic",
      artworkTitle: "예시 회화",
      auctionDate: "2026-01-01",
      auctionHouse: "서울옥션",
      medium: null,
      widthCm: null,
      heightCm: null,
      currency: "KRW",
      normalizedPriceKrw: 1000,
      result: "sold",
      sourceMeta: baseSourceMeta,
    });
    expect(badHouse.success).toBe(false);
  });
});

describe("R-STO-21 synthetic slug ex- 프리픽스 강제", () => {
  test("synthetic offer_slug가 ex-로 시작하지 않으면 거부된다", () => {
    const result = offeringRowSchema.safeParse({ ...baseOffering, offerSlug: "art-x" });
    expect(result.success).toBe(false);
  });

  test("ex- 프리픽스 synthetic slug는 통과한다", () => {
    const result = offeringRowSchema.safeParse({
      ...baseOffering,
      offerSlug: "ex-art-x",
    });
    expect(result.success).toBe(true);
  });

  test("manual_verified·public_record slug에는 ex-를 요구하지 않는다", () => {
    const result = offeringRowSchema.safeParse({
      ...baseOffering,
      provenance: "manual_verified",
      titlePublic: "부동산 A",
      offerSlug: "real-estate-a",
      sourceMeta: { ...baseSourceMeta, sourceUrl: "https://example.com/landing" },
    });
    expect(result.success).toBe(true);
  });
});

describe("closes_on ≥ opens_on CHECK 미러 (R-STO 스키마)", () => {
  test("closes_on이 opens_on보다 이르면 거부된다", () => {
    const result = offeringRowSchema.safeParse({
      ...baseOffering,
      opensOn: "2026-05-10",
      closesOn: "2026-05-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("공개 offering sourceMeta URL", () => {
  const publicOffering = {
    ...baseOffering,
    provenance: "manual_verified" as const,
    offerSlug: "actual-offer",
    titlePublic: "실제 상품",
  };

  test("비민감 landing query는 ingest와 sanitizer에서 유지한다", () => {
    const sourceUrl = "https://example.com/landing?rcept_no=20260830000001&page=2&category=art";
    expect(offeringRowSchema.safeParse({
      ...publicOffering,
      sourceMeta: { ...baseSourceMeta, sourceUrl },
    }).success).toBe(true);
    expect(isSafePublicSourceUrl(sourceUrl)).toBe(true);
    expect(sanitizePublicSourceUrl(sourceUrl, "fallback")).toBe(sourceUrl);
  });

  test.each(["client_secret", "access_key", "key", "sig", "password"])(
    "%s credential query는 거부하고 sanitizer가 query를 제거한다",
    (name) => {
      const sourceUrl = `https://example.com/landing?page=2&${name}=value`;
      expect(offeringRowSchema.safeParse({
        ...publicOffering,
        sourceMeta: { ...baseSourceMeta, sourceUrl },
      }).success).toBe(false);
      expect(isSafePublicSourceUrl(sourceUrl)).toBe(false);
      expect(sanitizePublicSourceUrl(sourceUrl, "fallback")).toBe("https://example.com/landing");
    },
  );

  test.each([
    "http://example.com/landing",
    "ftp://example.com/landing",
    "not-a-public-url",
    "https://user:pass@example.com/landing",
    "https://example.com/landing?api_key=secret",
    "https://example.com/landing#private",
  ])("비공개 URL %s를 ingest에서 거부한다", (sourceUrl) => {
    expect(offeringRowSchema.safeParse({
      ...publicOffering,
      sourceMeta: { ...baseSourceMeta, sourceUrl },
    }).success).toBe(false);
  });
});

describe("rag_documents license 화이트리스트 (R-STO-13)", () => {
  const baseDoc = {
    sourceId: "verification-methodology",
    title: "방법 개요",
    url: null,
    license: "green",
    retrievedOn: "2026-08-29",
    provenance: "public_record",
  };

  test.each(["green", "yellow_confirmed"] as const)(
    "허용 license %s는 통과한다",
    (license) => {
      expect(
        ragDocumentRowSchema.safeParse({ ...baseDoc, license }).success,
      ).toBe(true);
    },
  );

  test.each(["red", "yellow", "unknown"] as const)(
    "미허용 license %s는 거부된다",
    (license) => {
      expect(
        ragDocumentRowSchema.safeParse({ ...baseDoc, license }).success,
      ).toBe(false);
    },
  );
});
