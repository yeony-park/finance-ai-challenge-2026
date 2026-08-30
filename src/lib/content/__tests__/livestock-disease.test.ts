import { describe, expect, it } from "vitest";

import {
  CATTLE_FMD_EVENTS,
  CATTLE_LSD_EVENTS,
  CATTLE_LSD_SNAPSHOT,
  FMD_EVENTS,
  PIG_FMD_EVENTS,
} from "@/lib/content/livestock-disease";

describe("livestock disease reference data", () => {
  it("splits official FMD occurrences by livestock species", () => {
    expect(FMD_EVENTS).toHaveLength(42);
    expect(CATTLE_FMD_EVENTS).toHaveLength(35);
    expect(PIG_FMD_EVENTS).toHaveLength(6);
  });

  it("keeps only administrative region fields in normalized events", () => {
    for (const event of FMD_EVENTS) {
      expect(Object.keys(event)).not.toContain("farmName");
      expect(Object.keys(event)).not.toContain("farmOwner");
      expect(event.region).toBe(`${event.province} ${event.cityCounty}`);
    }
  });

  it("maps the official LSD snapshot to 48 administrative representative points", () => {
    expect(CATTLE_LSD_EVENTS).toHaveLength(132);
    expect(CATTLE_LSD_SNAPSHOT.yearlyCounts).toEqual({
      "2023": 107,
      "2024": 24,
      "2025": 0,
      "2026": 1,
    });
    expect(new Set(CATTLE_LSD_EVENTS.map((event) => event.region)).size).toBe(48);
    expect(
      new Set(
        CATTLE_LSD_EVENTS.map(
          (event) =>
            `${event.coordinates.latitude},${event.coordinates.longitude}`,
        ),
      ).size,
    ).toBe(48);

    for (const event of CATTLE_LSD_EVENTS) {
      expect(event.region).toBe(`${event.province} ${event.cityCounty}`);
      expect(Number.isFinite(event.coordinates.latitude)).toBe(true);
      expect(Number.isFinite(event.coordinates.longitude)).toBe(true);
      expect(Object.keys(event)).not.toContain("farmName");
      expect(Object.keys(event)).not.toContain("farmOwner");
      expect(Object.keys(event)).not.toContain("address");
    }
  });
});
