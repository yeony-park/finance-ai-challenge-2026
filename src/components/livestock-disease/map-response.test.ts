import { describe, expect, test } from "vitest";
import { buildLivestockDiseaseMap } from "@/lib/content/livestock-disease-map";
import { isLivestockDiseaseMapDataset } from "./map-response";

const dataset = {
  species: "pig",
  asOf: "2026-09-01",
  events: [{ disease: "ASF", diseaseLabel: "아프리카돼지열병", occurredAt: "2026-08-01", province: "경기", region: "경기 ○○군", latitude: 37, longitude: 127 }],
};

describe("질병 지도 응답 검증", () => {
  test.each(["pig", "cattle"] as const)("실제 %s 공개 스냅샷을 허용한다", (species) => {
    expect(isLivestockDiseaseMapDataset(buildLivestockDiseaseMap(species), species)).toBe(true);
  });
  test("빈 결과는 정상 자료이며 다른 축종 응답은 거부한다", () => {
    expect(isLivestockDiseaseMapDataset({ ...dataset, events: [] }, "pig")).toBe(true);
    expect(isLivestockDiseaseMapDataset(dataset, "cattle")).toBe(false);
  });
  test.each([null, {}, { ...dataset, asOf: "2026-02-30" }, { ...dataset, events: [null] }])("손상된 응답을 거부한다: %j", (value) => {
    expect(isLivestockDiseaseMapDataset(value, "pig")).toBe(false);
  });
  test.each([
    { latitude: "37" }, { latitude: Number.NaN }, { longitude: Infinity },
    { latitude: 91 }, { longitude: 181 }, { disease: "UNKNOWN" }, { disease: "LSD" },
    { occurredAt: "2026-02-30" }, { occurredAt: 20260801 }, { region: null }, { province: "" },
  ])("필터와 지도에서 사용 불가능한 이벤트를 거부한다: %j", (patch) => {
    expect(isLivestockDiseaseMapDataset({ ...dataset, events: [{ ...dataset.events[0], ...patch }] }, "pig")).toBe(false);
  });
});
