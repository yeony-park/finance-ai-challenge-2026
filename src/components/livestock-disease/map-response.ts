import type { LivestockDiseaseMapDataset, LivestockDiseaseMapSpecies } from "@/lib/content/livestock-disease-map";

import { isRecord } from "@/lib/client-response";
const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function isLivestockDiseaseMapDataset(
  value: unknown,
  species: LivestockDiseaseMapSpecies,
): value is LivestockDiseaseMapDataset {
  return isRecord(value) && value.species === species && isDate(value.asOf) &&
    Array.isArray(value.events) && value.events.every((event: unknown) =>
      isRecord(event) &&
      (species === "pig" ? event.disease === "ASF" || event.disease === "FMD" : event.disease === "FMD" || event.disease === "LSD") &&
      [event.diseaseLabel, event.province, event.region].every((text) => typeof text === "string" && text.trim().length > 0) &&
      isDate(event.occurredAt) &&
      typeof event.latitude === "number" && Number.isFinite(event.latitude) && Math.abs(event.latitude) <= 90 &&
      typeof event.longitude === "number" && Number.isFinite(event.longitude) && Math.abs(event.longitude) <= 180,
    );
}
