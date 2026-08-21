import { describe, expect, test } from "vitest";

import {
  EMPTY_PROFILE,
  isProfileEmpty,
  orderByConcern,
  orderByInterests,
  parseProfile,
  PROFILE_STORAGE_KEY,
} from "../profile";

describe("parseProfile — 저장값을 믿지 않는다", () => {
  test("저장된 적이 없으면 빈 프로파일이다", () => {
    expect(parseProfile(null)).toEqual(EMPTY_PROFILE);
    expect(parseProfile("")).toEqual(EMPTY_PROFILE);
  });

  test("JSON이 깨져 있거나 객체가 아니면 빈 프로파일로 떨어진다", () => {
    expect(parseProfile("{not-json")).toEqual(EMPTY_PROFILE);
    expect(parseProfile('"easy"')).toEqual(EMPTY_PROFILE);
    expect(parseProfile('["cattle"]')).toEqual(EMPTY_PROFILE);
  });

  test("어휘 밖의 값은 필드 단위로 걸러 낸다", () => {
    expect(
      parseProfile(
        '{"version":1,"level":"expert","concern":"fomo","interests":["cattle",3,"gold","pig"]}',
      ),
    ).toEqual({
      version: 1,
      level: null,
      concern: null,
      interests: ["cattle", "pig"],
    });
  });

  test("중복 관심사는 선택 순서를 유지하며 하나로 합친다", () => {
    expect(
      parseProfile('{"interests":["pig","cattle","pig"]}').interests,
    ).toEqual(["pig", "cattle"]);
  });

  test("정상 저장값은 그대로 복원된다", () => {
    const stored =
      '{"version":1,"level":"pro","concern":"exit-structure","interests":["art"]}';

    expect(parseProfile(stored)).toEqual({
      version: 1,
      level: "pro",
      concern: "exit-structure",
      interests: ["art"],
    });
  });
});

describe("orderByConcern — 걱정 항목을 앞세우되 무엇도 숨기지 않는다", () => {
  const items = [
    { id: "filing-exists" },
    { id: "asset-existence" },
    { id: "protection-scope" },
  ] as const;

  test("걱정이 없으면 순서를 바꾸지 않는다", () => {
    expect(orderByConcern(items, null)).toEqual(items);
  });

  test("걱정 항목이 맨 앞으로 오고 나머지 순서는 유지된다", () => {
    expect(orderByConcern(items, "protection-scope").map((i) => i.id)).toEqual([
      "protection-scope",
      "filing-exists",
      "asset-existence",
    ]);
  });

  test("원소를 제거하지 않는다 — 숨김 금지 불변식", () => {
    expect(orderByConcern(items, "exit-structure")).toHaveLength(items.length);
  });

  test("원본 배열을 바꾸지 않는다", () => {
    const before = [...items];

    orderByConcern(items, "asset-existence");

    expect(items).toEqual(before);
  });
});

describe("orderByInterests — 관심 순 정렬, 나머지는 원래 순서", () => {
  const entries = [
    { id: "cattle" },
    { id: "pig" },
    { id: "art" },
    { id: "real-estate" },
  ] as const;

  test("관심이 없으면 순서를 바꾸지 않는다", () => {
    expect(orderByInterests(entries, [])).toEqual(entries);
  });

  test("관심 카테고리가 선택 순서대로 앞에 온다", () => {
    expect(
      orderByInterests(entries, ["real-estate", "pig"]).map((e) => e.id),
    ).toEqual(["real-estate", "pig", "cattle", "art"]);
  });

  test("관심 밖 카테고리끼리는 상대 순서가 유지된다", () => {
    expect(orderByInterests(entries, ["art"]).map((e) => e.id)).toEqual([
      "art",
      "cattle",
      "pig",
      "real-estate",
    ]);
  });

  test("원소를 제거하지 않는다 — 숨김 금지 불변식", () => {
    expect(orderByInterests(entries, ["cattle"])).toHaveLength(entries.length);
  });

  test("원본 배열을 바꾸지 않는다", () => {
    const before = [...entries];

    orderByInterests(entries, ["pig"]);

    expect(entries).toEqual(before);
  });
});

describe("프로파일 상태", () => {
  test("빈 프로파일 판별은 세 필드 전부를 본다", () => {
    expect(isProfileEmpty(EMPTY_PROFILE)).toBe(true);
    expect(
      isProfileEmpty({ ...EMPTY_PROFILE, interests: ["cattle"] }),
    ).toBe(false);
    expect(isProfileEmpty({ ...EMPTY_PROFILE, level: "easy" })).toBe(false);
  });

  test("버전이 붙은 키를 쓴다", () => {
    expect(PROFILE_STORAGE_KEY).toBe("jeomjeom.profile.v1");
  });
});
