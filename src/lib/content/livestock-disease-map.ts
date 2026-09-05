import {
  CATTLE_FMD_EVENTS,
  CATTLE_LSD_EVENTS,
  CATTLE_LSD_SNAPSHOT,
  FMD_SNAPSHOT_ASOF,
  PIG_FMD_EVENTS,
  type FmdEvent,
  type LsdEvent,
} from "@/lib/content/livestock-disease";
import {
  PIG_ASF_EVENTS,
  PIG_ASF_SNAPSHOT_ASOF,
  type PigAsfEvent,
} from "@/lib/content/pig-asf";

export const LIVESTOCK_DISEASE_MAP_SPECIES = ["cattle", "pig"] as const;

export type LivestockDiseaseMapSpecies =
  (typeof LIVESTOCK_DISEASE_MAP_SPECIES)[number];
export type LivestockDiseaseCode = "ASF" | "FMD" | "LSD";

export interface LivestockDiseaseMapEvent {
  readonly disease: LivestockDiseaseCode;
  readonly diseaseLabel: string;
  readonly occurredAt: string;
  readonly province: string;
  readonly region: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface LivestockDiseaseMapDataset {
  readonly species: LivestockDiseaseMapSpecies;
  readonly asOf: string;
  readonly events: readonly LivestockDiseaseMapEvent[];
}

const latestAsOf = (...dates: readonly string[]): string =>
  dates.reduce((latest, date) => (date > latest ? date : latest));

const fromFmd = (event: FmdEvent): LivestockDiseaseMapEvent => ({
  disease: "FMD",
  diseaseLabel: "구제역",
  occurredAt: event.occurredAt,
  province: event.province,
  region: event.region,
  latitude: event.coordinates.latitude,
  longitude: event.coordinates.longitude,
});

const fromLsd = (event: LsdEvent): LivestockDiseaseMapEvent => ({
  disease: "LSD",
  diseaseLabel: "럼피스킨",
  occurredAt: event.occurredAt,
  province: event.province,
  region: event.region,
  latitude: event.coordinates.latitude,
  longitude: event.coordinates.longitude,
});

const fromAsf = (event: PigAsfEvent): LivestockDiseaseMapEvent => ({
  disease: "ASF",
  diseaseLabel: "아프리카돼지열병",
  occurredAt: event.occurredAt,
  province: event.province,
  region: event.region,
  latitude: event.coordinates.latitude,
  longitude: event.coordinates.longitude,
});

const byOccurrence = (
  left: LivestockDiseaseMapEvent,
  right: LivestockDiseaseMapEvent,
): number =>
  left.occurredAt.localeCompare(right.occurredAt) ||
  left.disease.localeCompare(right.disease) ||
  left.region.localeCompare(right.region, "ko-KR") ||
  left.latitude - right.latitude ||
  left.longitude - right.longitude;

export const buildLivestockDiseaseMap = (
  species: LivestockDiseaseMapSpecies,
): LivestockDiseaseMapDataset => ({
  species,
  asOf:
    species === "cattle"
      ? latestAsOf(FMD_SNAPSHOT_ASOF, CATTLE_LSD_SNAPSHOT.asOf)
      : latestAsOf(PIG_ASF_SNAPSHOT_ASOF, FMD_SNAPSHOT_ASOF),
  events:
    species === "cattle"
      ? [
          ...CATTLE_FMD_EVENTS.map(fromFmd),
          ...CATTLE_LSD_EVENTS.map(fromLsd),
        ].sort(byOccurrence)
      : [
          ...PIG_ASF_EVENTS.map(fromAsf),
          ...PIG_FMD_EVENTS.map(fromFmd),
        ].sort(byOccurrence),
});
