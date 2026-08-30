import fmdData from "../../../data/reference/livestock-disease/fmd/mafra_fmd_events.json";
import diseaseApiData from "../../../data/reference/livestock-disease/api/mafra_disease_occurrences_auxiliary.json";
import lsdData from "../../../data/reference/livestock-disease/lsd/mafra_lsd_events.json";

export type LivestockSpecies = "cattle" | "pig" | "goat";

export interface FmdEvent {
  readonly id: string;
  readonly disease: "FMD";
  readonly occurredAt: string;
  readonly sourceSequence: number;
  readonly species: LivestockSpecies;
  readonly raisedHeadCount: number | null;
  readonly province: string;
  readonly cityCounty: string;
  readonly region: string;
  readonly coordinates: {
    readonly latitude: number;
    readonly longitude: number;
    readonly precision: string;
    readonly sourceUrl: string;
    readonly sourceSequence: number;
  };
  readonly source: {
    readonly sourceUrl: string;
  };
}

export interface LsdEvent {
  readonly id: string;
  readonly disease: "LSD";
  readonly occurredAt: string;
  readonly sourceSequence: number;
  readonly species: "cattle";
  readonly culledHeadCount: number | null;
  readonly province: string;
  readonly cityCounty: string;
  readonly region: string;
  readonly coordinates: {
    readonly latitude: number;
    readonly longitude: number;
    readonly precision: string;
    readonly query: string;
    readonly placeName: string;
    readonly sourceUrl: string;
    readonly license: string;
  };
}

export const FMD_BOARD_URL =
  "https://www.mafra.go.kr/FMD-AI2/2216/subview.do";
export const FMD_MAP_URL =
  "https://www.mafra.go.kr/FMD-AI2/map/FMD/FMD_map.jsp";
export const FMD_API_DOC_URL =
  "https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20151204000000000563";
export const FARM_DISEASE_STATS_API_DOC_URL =
  "https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20220823000000002326";
export const LSD_BOARD_URL =
  "https://www.mafra.go.kr/FMD-AI2/5434/subview.do";
export const LSD_LATEST_SNAPSHOT_URL =
  "https://www.mafra.go.kr/bbs/FMD-AI2/843/598988/download.do";
export const OPENSTREETMAP_COPYRIGHT_URL =
  "https://www.openstreetmap.org/copyright";

export const CATTLE_LSD_SNAPSHOT = {
  asOf: lsdData.asOf,
  eventCount: lsdData.coverage.eventCount,
  municipalityCount: lsdData.coverage.municipalityCount,
  yearlyCounts: lsdData.coverage.yearCounts,
} as const;

export const FMD_DATA = fmdData;
export const FMD_EVENTS = fmdData.events as readonly FmdEvent[];
export const PIG_FMD_EVENTS = FMD_EVENTS.filter((event) => event.species === "pig");
export const CATTLE_FMD_EVENTS = FMD_EVENTS.filter(
  (event) => event.species === "cattle",
);
export const LSD_DATA = lsdData;
export const CATTLE_LSD_EVENTS = lsdData.events as readonly LsdEvent[];
export const FMD_SNAPSHOT_ASOF = fmdData.asOf;
export const FMD_COLLECTED_AT = fmdData.source.collectedAt;
export const FMD_API_COMPARISON = diseaseApiData.comparison.fmd;
export const ASF_API_COMPARISON = diseaseApiData.comparison.asf;
