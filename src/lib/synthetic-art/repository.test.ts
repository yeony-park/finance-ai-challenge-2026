import { describe, expect, test } from "vitest";

import {
  getSyntheticArtProductById,
  loadSyntheticArtDataset,
  querySyntheticArtCatalog,
} from "./repository";

describe("합성 미술품 카탈로그", () => {
  test("현석님 fixture의 현재 9건과 과거 318건을 별도 범위로 제공한다", () => {
    const result = querySyntheticArtCatalog();

    expect(result.counts).toEqual({ current: 9, history: 318, total: 327 });
    expect(result.items).toHaveLength(24);
    expect(result.pageCount).toBe(14);
    expect(result.items.every((item) => item.kind === "current" || item.kind === "history")).toBe(true);
  });

  test("자연어 상태 검색과 체크 필터가 해당 범위로 결과를 좁힌다", () => {
    const upcoming = querySyntheticArtCatalog({ q: "청약 예정 작품" });
    expect(upcoming.filters.scope).toBe("current");
    expect(upcoming.total).toBe(9);
    expect(upcoming.items.every((item) => item.kind === "current")).toBe(true);

    const liquidated = querySyntheticArtCatalog({ q: "청산 완료" });
    expect(liquidated.filters.scope).toBe("history");
    expect(liquidated.total).toBeGreaterThan(0);
    expect(liquidated.items.every((item) => item.kind === "history")).toBe(true);
  });

  test("현재 상품 ID와 과거 이력 ID 모두 상세 화면용 객체로 조회한다", () => {
    expect(getSyntheticArtProductById("synthetic-offering-01")?.kind).toBe("current");
    expect(getSyntheticArtProductById("synthetic-track-01-001")?.kind).toBe("history");
    expect(getSyntheticArtProductById("missing-product")).toBeNull();
  });

  test("공개 객체에서 4단계 판정과 외부 근거 URL을 제거한다", () => {
    const dataset = loadSyntheticArtDataset();
    const serializedAnalysis = JSON.stringify(dataset.analyses);

    expect(serializedAnalysis).not.toContain('"verdict"');
    expect(serializedAnalysis).not.toContain('"verdictLabel"');
    expect(
      dataset.evidence.every(
        (item) =>
          item.sourceTitle === "합성 데이터" &&
          item.sourcePublisher === "DAKER 시뮬레이션" &&
          item.sourceUrl === null,
      ),
    ).toBe(true);
  });
});
