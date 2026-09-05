import { describe, expect, it } from "vitest";

import {
  CATTLE_FMD_EVENTS,
  CATTLE_LSD_EVENTS,
  PIG_FMD_EVENTS,
} from "@/lib/content/livestock-disease";
import {
  buildLivestockDiseaseMap,
  type LivestockDiseaseMapEvent,
} from "@/lib/content/livestock-disease-map";
import { PIG_ASF_EVENTS } from "@/lib/content/pig-asf";

const publicKeys = new Set([
  "disease",
  "diseaseLabel",
  "occurredAt",
  "province",
  "region",
  "latitude",
  "longitude",
]);

const expectPublicMapEvent = (event: LivestockDiseaseMapEvent): void => {
  expect(Object.keys(event).every((key) => publicKeys.has(key))).toBe(true);
  expect(Number.isFinite(event.latitude)).toBe(true);
  expect(Number.isFinite(event.longitude)).toBe(true);
  expect(JSON.stringify(event)).not.toContain("sourceUrl");
  expect(JSON.stringify(event)).not.toContain("cityCounty");
  expect(JSON.stringify(event)).not.toContain("farmName");
};

describe("buildLivestockDiseaseMap", () => {
  it("combines cattle FMD and LSD into the shared public contract", () => {
    const dataset = buildLivestockDiseaseMap("cattle");

    expect(dataset.species).toBe("cattle");
    expect(dataset.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dataset.events).toHaveLength(
      CATTLE_FMD_EVENTS.length + CATTLE_LSD_EVENTS.length,
    );
    expect(new Set(dataset.events.map((event) => event.disease))).toEqual(
      new Set(["FMD", "LSD"]),
    );
    expect(dataset.events.find((event) => event.disease === "LSD")).toMatchObject({
      diseaseLabel: "럼피스킨",
    });
    expect(JSON.stringify(dataset)).not.toContain("headCount");
    dataset.events.forEach(expectPublicMapEvent);
  });

  it("combines pig ASF and FMD and keeps events chronologically stable", () => {
    const dataset = buildLivestockDiseaseMap("pig");

    expect(dataset.species).toBe("pig");
    expect(dataset.events).toHaveLength(
      PIG_ASF_EVENTS.length + PIG_FMD_EVENTS.length,
    );
    expect(new Set(dataset.events.map((event) => event.disease))).toEqual(
      new Set(["ASF", "FMD"]),
    );
    expect(dataset.events[0].diseaseLabel).toBeTruthy();
    expect(dataset.events.map((event) => event.occurredAt)).toEqual(
      [...dataset.events]
        .map((event) => event.occurredAt)
        .sort((left, right) => left.localeCompare(right)),
    );
    dataset.events.forEach(expectPublicMapEvent);
  });
});
