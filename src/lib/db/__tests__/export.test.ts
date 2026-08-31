import { describe, expect, test } from "vitest";

import type { Offering } from "../repositories/types";
import {
  publicOfferingsManifestSchema,
  toPublicOffering,
  toPublicOfferingsManifest,
} from "../export/public-offering";

const offering: Offering = {
  offerSlug: "ex-art-1",
  categoryId: "art",
  provenance: "synthetic",
  titlePublic: "예시 회화 A",
  amountWon: 120_000_000,
  opensOn: "2026-05-04",
  closesOn: "2026-05-12",
  detail: {
    artistName: "예시 작가 가",
    platformName: "예시 플랫폼 가",
    hasImage: false,
    minimumInvestment: 100_000,
    note: "예시 데이터로 구성한 화면입니다.",
  },
  sourceMeta: {
    sourceUrl: "synthetic://generator/ex-art-1",
    license: "synthetic",
    method: "deterministic-generator",
    retrievedAt: "2026-08-29T00:00:00.000Z",
    sha256: "abc",
  },
};

describe("db:export 공개 인덱스 v2 (R-STO-03 마스킹 경유)", () => {
  test("v2 카드 공통 필드를 갖춘다 (assetLabel·subscription·minimumInvestment)", () => {
    const publicOffering = toPublicOffering(offering);
    expect(publicOffering.assetLabel).toBe("미술품");
    expect(publicOffering.subscription).toEqual({
      opensOn: "2026-05-04",
      closesOn: "2026-05-12",
      precision: "day",
    });
    expect(publicOffering.minimumInvestment).toBe(100_000);
    expect(publicOffering.isExample).toBe(true);
  });

  test("미술품 detail은 카드 필드(artistName·platformName·hasImage)만 화이트리스트로 노출한다", () => {
    const publicOffering = toPublicOffering(offering);
    expect(publicOffering.detail).toEqual({
      artistName: "예시 작가 가",
      platformName: "예시 플랫폼 가",
      hasImage: false,
      note: "예시 데이터로 구성한 화면입니다.",
    });
  });

  test("집계 점수·4단계 verdict 필드는 산출물에 없다 (판정 3값 계열만)", () => {
    const serialized = JSON.stringify(toPublicOffering(offering));
    for (const forbidden of [
      "similarityScore",
      "verdict",
      "verdictLabel",
      "worth_considering",
      "score",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  test("sourceMeta(내부 메타)는 공개 산출물에 포함되지 않는다", () => {
    expect(Object.keys(toPublicOffering(offering))).not.toContain("sourceMeta");
  });

  test("브랜드 토큰이 섞여도 maskFreeText가 가린다 (익명화 게이트)", () => {
    const leaky: Offering = {
      ...offering,
      detail: { ...offering.detail, platformName: "뱅카우 아트", note: "스탁키퍼 예시" },
    };
    const serialized = JSON.stringify(toPublicOffering(leaky));
    expect(serialized).not.toContain("뱅카우");
    expect(serialized).not.toContain("스탁키퍼");
    expect(serialized).toContain("발행사");
  });

  test("매니페스트는 schemaVersion 2 · slug 정렬로 결정적이다", () => {
    const manifest = toPublicOfferingsManifest([
      { ...offering, offerSlug: "ex-re-2", categoryId: "real-estate" },
      { ...offering, offerSlug: "ex-art-1" },
    ]);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.offerings.map((entry) => entry.offerSlug)).toEqual([
      "ex-art-1",
      "ex-re-2",
    ]);
    expect(publicOfferingsManifestSchema.safeParse(manifest).success).toBe(true);

    const reDetail = manifest.offerings.find(
      (entry) => entry.offerSlug === "ex-re-2",
    )?.detail;
    expect(reDetail).not.toHaveProperty("artistName");
    expect(reDetail).not.toHaveProperty("platformName");
    expect(reDetail).not.toHaveProperty("hasImage");
  });
});

const cattleOffering: Offering = {
  offerSlug: "livestock-7",
  categoryId: "cattle",
  provenance: "manual_verified",
  titlePublic: "한우 7호",
  amountWon: null,
  opensOn: "2026-02-28",
  closesOn: "2026-03-30",
  detail: {
    opensAt: "2026-02-28T10:00:00+09:00",
    closesAt: "2026-03-30T16:00:00+09:00",
  },
  sourceMeta: {
    sourceUrl: "",
    license: "green",
    method: "manual_verified",
    retrievedAt: "",
    sha256: "def",
  },
};

describe("db:export cattle 분 단위 청약 시각 (A안 · detail 파생)", () => {
  test("detail.opensAt/closesAt가 있으면 precision=minute로 파생하고 detail에 통과시킨다", () => {
    const publicOffering = toPublicOffering(cattleOffering);
    expect(publicOffering.subscription.precision).toBe("minute");
    expect(publicOffering.detail.opensAt).toBe("2026-02-28T10:00:00+09:00");
    expect(publicOffering.detail.closesAt).toBe("2026-03-30T16:00:00+09:00");
  });

  test("detail에 opensAt이 없으면 precision=day이고 detail에 opensAt 키가 없다", () => {
    const dayOffering: Offering = { ...cattleOffering, detail: {} };
    const publicOffering = toPublicOffering(dayOffering);
    expect(publicOffering.subscription.precision).toBe("day");
    expect(publicOffering.detail).not.toHaveProperty("opensAt");
    expect(publicOffering.detail).not.toHaveProperty("closesAt");
  });
});
