import { describe, expect, test } from "vitest";

import type { LivestockDiseaseMapDataset } from "@/lib/content/livestock-disease-map";

import {
  diseaseYearlyCounts,
  diseaseMapFocusPoints,
  selectLivestockDiseaseMapEvents,
} from "./map-view";

const cattleDataset: LivestockDiseaseMapDataset = {
  species: "cattle",
  asOf: "2026-07-20",
  events: [
    {
      disease: "FMD",
      diseaseLabel: "구제역",
      occurredAt: "2023-05-01",
      province: "경기",
      region: "경기 ○○시",
      latitude: 37,
      longitude: 127,
    },
    {
      disease: "LSD",
      diseaseLabel: "럼피스킨",
      occurredAt: "2024-01-01",
      province: "경기",
      region: "경기 △△시",
      latitude: 37.2,
      longitude: 127.2,
    },
    {
      disease: "FMD",
      diseaseLabel: "구제역",
      occurredAt: "2023-03-01",
      province: "충북",
      region: "충북 ○○군",
      latitude: 36.8,
      longitude: 127.7,
    },
  ],
};

const pigDataset: LivestockDiseaseMapDataset = {
  species: "pig",
  asOf: "2026-08-15",
  events: [
    {
      disease: "ASF",
      diseaseLabel: "아프리카돼지열병",
      occurredAt: "2026-02-01",
      province: "경기",
      region: "경기 ○○시",
      latitude: 37,
      longitude: 127,
    },
    {
      disease: "ASF",
      diseaseLabel: "아프리카돼지열병",
      occurredAt: "2025-02-01",
      province: "경기",
      region: "경기 △△시",
      latitude: 37.1,
      longitude: 127.1,
    },
    {
      disease: "FMD",
      diseaseLabel: "구제역",
      occurredAt: "2024-02-01",
      province: "충남",
      region: "충남 ○○군",
      latitude: 36.5,
      longitude: 126.8,
    },
  ],
};

describe("축산 질병 지도 보고서 필터", () => {
  test("한우는 선택 도와 신고서 제출일 이전 사건만 남긴다", () => {
    const events = selectLivestockDiseaseMapEvents(cattleDataset, {
      species: "cattle",
      focusProvinces: ["경기"],
      throughDate: "2023-12-31",
      currentYear: "2023",
    });

    expect(events.map((event) => event.region)).toEqual(["경기 ○○시"]);
    expect(events[0]).toMatchObject({ isCurrent: true, isFocus: true });
  });

  test("한돈은 전국 지도를 유지하고 최신 ASF 지역만 강조한다", () => {
    const events = selectLivestockDiseaseMapEvents(pigDataset, {
      species: "pig",
      focusProvinces: ["경기"],
      currentYear: "2026",
    });

    expect(events).toHaveLength(3);
    expect(events.find((event) => event.occurredAt === "2026-02-01")?.isFocus).toBe(true);
    expect(events.find((event) => event.occurredAt === "2025-02-01")?.isFocus).toBe(false);
    expect(events.find((event) => event.disease === "FMD")?.isFocus).toBe(false);
    expect(diseaseYearlyCounts(events, "pig")).toEqual([
      ["2025", 1],
      ["2026", 1],
    ]);
  });

  test("응답 축종이 다르면 사건을 렌더하지 않는다", () => {
    expect(
      selectLivestockDiseaseMapEvents(cattleDataset, {
        species: "pig",
        focusProvinces: [],
        currentYear: "2026",
      }),
    ).toEqual([]);
  });
});

describe("공시 지역으로 시작하는 지도", () => {
  test("현재 발생이 없는 지역도 같은 도의 공개 좌표로 화면을 맞춘다", () => {
    const points = diseaseMapFocusPoints(cattleDataset, ["경기"]);
    expect(points).toHaveLength(2);
    expect(points.every((point) => point.longitude < 127.3)).toBe(true);
    expect(diseaseMapFocusPoints(cattleDataset, [])).toEqual([]);
  });
  test("한돈의 전국 발생 기록과 별개로 공시 지역만 초기 확대한다", () => {
    expect(diseaseMapFocusPoints(pigDataset, ["충남"])).toEqual([pigDataset.events[2]]);
  });
  test("지역 미확인 한우도 미래 사건을 제외한 전국 맥락을 제공한다", () => {
    const events = selectLivestockDiseaseMapEvents(cattleDataset, {
      species: "cattle", focusProvinces: [], throughDate: "2023-12-31", currentYear: "2023",
    });
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.occurredAt <= "2023-12-31")).toBe(true);
  });
});
