import { describe, expect, test } from "vitest";

import type { LivestockStructuredData } from "../livestock-structured";
import { buildLivestockStructuredEvidence } from "../livestock-structured";

const meta = {
  sourceUrl: "https://www.data.go.kr/data/example",
  license: "green",
  method: "test",
  retrievedAt: "2026-08-15T00:00:00.000Z",
  sha256: "a".repeat(64),
};

const data: LivestockStructuredData = {
  cattle: ["2026-07", "2026-08"].flatMap((month, index) => [
    { month, breedCd: "024001", sexCd: "025001", gradeCd: "0", pricePerKg: 24_000 + index * 500, headCount: 10, avgPricePerKg: 19_000 + index * 500, sampleSize: 100, partial: false, sourceMeta: meta },
    { month, breedCd: "024001", sexCd: "025003", gradeCd: "0", pricePerKg: 25_000 + index * 500, headCount: 20, avgPricePerKg: 23_000 + index * 500, sampleSize: 200, partial: false, sourceMeta: meta },
  ]),
  pig: ["2026-05", "2026-06", "2026-07"].map((month, index) => ({
    month, skinType: "탕박", sex: "전체", grade: "등외제외", region: "전국(제주제외)",
    headCount: 100 + index, priceWonPerKg: 5_000 + index * 100, amountWon: 1, weightKg: 1, sourceMeta: meta,
  })),
  disease: [
    { sourceEventId: "1", disease: "ASF", species: "pig", occurredOn: "2025-01-01", province: "경기", cityCounty: "파주시", region: "경기 파주시", headCount: 100, headCountBasis: "raised", latitude: 37, longitude: 127, locationPrecision: "행정기관 기준점", sourceUrl: meta.sourceUrl, sourceMeta: meta },
    { sourceEventId: "2", disease: "ASF", species: "pig", occurredOn: "2025-02-01", province: "강원", cityCounty: "철원군", region: "강원 철원군", headCount: 200, headCountBasis: "raised", latitude: 38, longitude: 127, locationPrecision: "행정기관 기준점", sourceUrl: meta.sourceUrl, sourceMeta: meta },
    { sourceEventId: "3", disease: "FMD", species: "pig", occurredOn: "2025-03-01", province: "충북", cityCounty: "청주시", region: "충북 청주시", headCount: 30, headCountBasis: "culled", latitude: 36, longitude: 127, locationPrecision: "행정기관 기준점", sourceUrl: meta.sourceUrl, sourceMeta: meta },
    { sourceEventId: "4", disease: "FMD", species: "cattle", occurredOn: "2025-03-02", province: "충북", cityCounty: "청주시", region: "충북 청주시", headCount: 20, headCountBasis: "culled", latitude: 36, longitude: 127, locationPrecision: "행정기관 기준점", sourceUrl: meta.sourceUrl, sourceMeta: meta },
  ],
};

describe("축산 구조화 Copilot 근거", () => {
  test("한돈 가격 추세에 월별 값과 증감을 제공한다", () => {
    const evidence = buildLivestockStructuredEvidence("pig", {
      kind: "price", mode: "trend", fromMonth: null, toMonth: null,
      sex: null, grade: null, skinType: null, region: null,
    }, data);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.excerpt).toContain("2026-05");
    expect(evidence[0]?.excerpt).toContain("2026-07");
    expect(evidence[0]?.excerpt).toContain("200원/kg 상승");
  });

  test("한우 평균 추세는 등급 행 중복을 제거한다", () => {
    const evidence = buildLivestockStructuredEvidence("cattle", {
      kind: "price", mode: "trend", fromMonth: null, toMonth: null,
      sex: "암", grade: null, skinType: null, region: null,
    }, data);
    expect(evidence[0]?.rowCount).toBe(2);
    expect(evidence[0]?.excerpt).toContain("암 평균");
  });

  test("질병 발생 건수는 축종·기간·지역 조건을 적용한다", () => {
    const evidence = buildLivestockStructuredEvidence("pig", {
      kind: "disease", mode: "count", disease: "ASF",
      fromDate: "2025-01-01", toDate: "2025-12-31", region: "경기",
    }, data);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.rowCount).toBe(1);
    expect(evidence[0]?.excerpt).toContain("경기 파주시");
    expect(evidence[0]?.limitations.join(" ")).toContain("개별 가축 감염");
    expect(JSON.stringify(evidence)).not.toMatch(/latitude|longitude|sourceMeta|상세주소.*파주시/);
  });

  test("같은 구제역 자료에서도 질문 상품의 축종만 집계한다", () => {
    const pigEvidence = buildLivestockStructuredEvidence("pig", {
      kind: "disease", mode: "count", disease: "FMD",
      fromDate: null, toDate: null, region: null,
    }, data);
    const cattleEvidence = buildLivestockStructuredEvidence("cattle", {
      kind: "disease", mode: "count", disease: "FMD",
      fromDate: null, toDate: null, region: null,
    }, data);
    expect(pigEvidence[0]?.rowCount).toBe(1);
    expect(cattleEvidence[0]?.rowCount).toBe(1);
  });

  test("조건과 일치하는 질병 이력이 없으면 근거를 만들지 않는다", () => {
    expect(buildLivestockStructuredEvidence("pig", {
      kind: "disease", mode: "count", disease: "LSD",
      fromDate: null, toDate: null, region: null,
    }, data)).toEqual([]);
  });
});
