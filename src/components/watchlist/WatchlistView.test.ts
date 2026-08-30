import { describe, expect, test } from "vitest";

import type { WatchSummaryEntry } from "./watch-summary";
import {
  hasKnownWatchedOffer,
  selectWatchedEntries,
} from "./watchlist-selection";

const entry = (id: string): WatchSummaryEntry => ({
  id,
  title: `${id} 공모`,
  amendmentLine: "접수된 정정신고서 없음",
  checkedLine: null,
  isDetectionFailed: false,
});

describe("관심 공모 모아보기", () => {
  test("저장된 관심 ID에 해당하는 공모만 원래 목록 순서로 보여준다", () => {
    const selected = selectWatchedEntries(
      [entry("a"), entry("b"), entry("c")],
      ["c", "unknown", "a"],
    );

    expect(selected.map(({ id }) => id)).toEqual(["a", "c"]);
  });

  test("공개 공모가 아닌 오래된 ID만 있으면 헤더 관심 공모 링크를 강조하지 않는다", () => {
    expect(hasKnownWatchedOffer(["old-offer"], ["a", "b"])).toBe(false);
    expect(hasKnownWatchedOffer(["old-offer", "b"], ["a", "b"])).toBe(true);
  });
});
