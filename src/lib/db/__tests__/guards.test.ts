import { describe, expect, test } from "vitest";

import {
  assertNoRealEntityCollision,
  realEntityCollisionsOf,
} from "../blocklist";
import {
  LocalOnlySourceError,
  assertSeedSourcePathAllowed,
  assertSyntheticNamesClean,
} from "../seed/guards";

describe("⑥ db:seed 로컬 전용 경로 원천 즉시 실패 (R-STO-03a)", () => {
  test.each([
    "data/raw",
    "data/raw/20260806000159",
    "data/snapshots/x.json",
    "data/reports/y.json",
  ])("로컬 전용 경로 %s는 거부된다", (sourcePath) => {
    expect(() => assertSeedSourcePathAllowed(sourcePath)).toThrow(
      LocalOnlySourceError,
    );
  });

  test.each(["data/offers", "data/reference/rag", "data/offers/real-estate-a.json"])(
    "커밋 가능 경로 %s는 통과한다",
    (sourcePath) => {
      expect(() => assertSeedSourcePathAllowed(sourcePath)).not.toThrow();
    },
  );
});

describe("R-STO-07a 실존 개체 블록리스트 대조", () => {
  test.each(["예시 서울옥션 강남", "예시 케이옥션 A", "예시 뱅카우 목장"])(
    "실존 플랫폼·경매사를 흉내 낸 synthetic 명칭 %s는 시드 실패",
    (name) => {
      expect(realEntityCollisionsOf(name).length).toBeGreaterThan(0);
      expect(() => assertNoRealEntityCollision("title_public", name)).toThrow();
    },
  );

  test.each(["예시 오피스 A", "예시 회화 B", "예시 근린상가 C"])(
    "가공 명칭 %s는 통과한다",
    (name) => {
      expect(realEntityCollisionsOf(name)).toEqual([]);
      expect(() =>
        assertNoRealEntityCollision("title_public", name),
      ).not.toThrow();
    },
  );

  test("assertSyntheticNamesClean은 겹치는 명칭 세트를 거부한다", () => {
    expect(() =>
      assertSyntheticNamesClean([
        { field: "auction_house", value: "예시 서울옥션" },
      ]),
    ).toThrow();
    expect(() =>
      assertSyntheticNamesClean([
        { field: "title_public", value: "예시 오피스 A" },
      ]),
    ).not.toThrow();
  });
});
