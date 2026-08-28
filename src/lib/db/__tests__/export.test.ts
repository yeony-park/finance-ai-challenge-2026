import { describe, expect, test } from "vitest";

import type { Offering } from "../repositories/types";
import {
  toPublicOffering,
  toPublicOfferingsManifest,
} from "../export/public-offering";

const offering: Offering = {
  offerSlug: "art-1",
  categoryId: "art",
  provenance: "synthetic",
  titlePublic: "예시 회화 A",
  amountWon: 120_000_000,
  opensOn: "2026-05-04",
  closesOn: "2026-05-12",
  detail: { artist: "예시 작가 가" },
  sourceMeta: {
    sourceUrl: "synthetic://generator/art-1",
    license: "synthetic",
    method: "deterministic-generator",
    retrievedAt: "2026-08-29T00:00:00.000Z",
    sha256: "abc",
  },
};

describe("db:export 공개 변환 (R-STO-03 마스킹 경유)", () => {
  test("synthetic 레코드는 isExample 플래그가 붙는다", () => {
    expect(toPublicOffering(offering).isExample).toBe(true);
  });

  test("sourceMeta(내부 메타)는 공개 산출물에 포함되지 않는다", () => {
    const publicOffering = toPublicOffering(offering);
    expect(Object.keys(publicOffering)).not.toContain("sourceMeta");
  });

  test("브랜드 토큰이 섞여도 maskFreeText가 가린다 (익명화 게이트)", () => {
    const leaky: Offering = {
      ...offering,
      titlePublic: "스탁키퍼 목장 공모",
      detail: { note: "뱅카우 예시" },
    };
    const publicOffering = toPublicOffering(leaky);
    const serialized = JSON.stringify(publicOffering);
    expect(serialized).not.toContain("스탁키퍼");
    expect(serialized).not.toContain("뱅카우");
    expect(serialized).toContain("발행사");
  });

  test("매니페스트는 slug 정렬로 결정적이다", () => {
    const manifest = toPublicOfferingsManifest([
      { ...offering, offerSlug: "re-2" },
      { ...offering, offerSlug: "art-1" },
    ]);
    expect(manifest.offerings.map((entry) => entry.offerSlug)).toEqual([
      "art-1",
      "re-2",
    ]);
    expect(manifest.generatedBy).toBe("db:export");
  });
});
