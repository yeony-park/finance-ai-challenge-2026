import { describe, expect, test } from "vitest";

import { countSyntheticArtCatalog, querySyntheticArtCatalog } from "./repository";
import type { SyntheticCatalogSearchParams } from "./types";

describe("미술품 상태 탭 집계", () => {
  test.each(["", "김환기", "청약 예정 작품", "청산 완료", "2024년 청산", "없는작가이름"])(
    "%s 검색에서 각 탭의 개수는 실제 목록과 일치한다",
    (q) => {
      const tabs: SyntheticCatalogSearchParams[] = [
        { q },
        { q, scope: "current", currentStatus: "upcoming" },
        { q, scope: "current", currentStatus: "open" },
        { q, scope: "history" },
      ];
      for (const params of tabs) {
        expect(countSyntheticArtCatalog(params)).toBe(querySyntheticArtCatalog(params, 9).total);
      }
    },
  );

  test("집계는 페이지와 정렬에 영향을 받지 않는다", () => {
    const params = { q: "김환기", scope: "history" };
    expect(countSyntheticArtCatalog({ ...params, page: "999", sort: "return_desc" }))
      .toBe(countSyntheticArtCatalog(params));
  });
});
