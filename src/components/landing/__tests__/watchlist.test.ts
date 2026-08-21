import { describe, expect, test } from "vitest";

import { parseWatchlist, toggleWatchlist, WATCHLIST_STORAGE_KEY } from "../watchlist";

describe("parseWatchlist — 저장값을 믿지 않는다", () => {
  test("저장된 적이 없으면 빈 목록이다", () => {
    expect(parseWatchlist(null)).toEqual([]);
    expect(parseWatchlist("")).toEqual([]);
  });

  test("JSON이 깨져 있어도 빈 목록으로 떨어진다", () => {
    expect(parseWatchlist("{not-json")).toEqual([]);
  });

  test("배열이 아니거나 문자열이 아닌 값은 걸러 낸다", () => {
    expect(parseWatchlist('{"livestock-9":true}')).toEqual([]);
    expect(parseWatchlist('["livestock-9",1,null,"real-estate-a"]')).toEqual([
      "livestock-9",
      "real-estate-a",
    ]);
  });
});

describe("toggleWatchlist — 등록은 껐다 켜는 순수 함수다", () => {
  test("없던 공모는 목록 끝에 붙는다", () => {
    expect(toggleWatchlist(["real-estate-a"], "livestock-9")).toEqual([
      "real-estate-a",
      "livestock-9",
    ]);
  });

  test("이미 등록된 공모는 빠진다", () => {
    expect(toggleWatchlist(["real-estate-a", "livestock-9"], "livestock-9")).toEqual([
      "real-estate-a",
    ]);
  });

  test("원본 목록을 바꾸지 않는다", () => {
    const before = ["livestock-9"];

    toggleWatchlist(before, "real-estate-a");

    expect(before).toEqual(["livestock-9"]);
  });
});

describe("저장 키 — 로컬 저장 위치는 한 곳뿐이다", () => {
  test("버전이 붙은 키를 쓴다", () => {
    expect(WATCHLIST_STORAGE_KEY).toBe("gongsi.watchlist.v1");
  });
});
