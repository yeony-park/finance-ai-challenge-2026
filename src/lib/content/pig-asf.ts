import asfData from "../../../data/reference/pig-asf/mafra_asf_events.json";

export interface PigAsfEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly sourceSequence: number;
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

export const PIG_ASF_BOARD_URL =
  "https://www.mafra.go.kr/FMD-AI2/2145/subview.do";
export const PIG_ASF_MAP_URL =
  "https://www.mafra.go.kr/FMD-AI2/map/ASF/ASF_map.jsp";
export const PIG_ASF_SNAPSHOT_URL =
  "https://www.mafra.go.kr/bbs/FMD-AI2/404/577369/artclView.do";

export const PIG_ASF_DATA = asfData;
export const PIG_ASF_EVENTS = asfData.events as readonly PigAsfEvent[];
export const PIG_ASF_SNAPSHOT_ASOF = asfData.asOf;
export const PIG_ASF_COLLECTED_AT = asfData.source.collectedAt;
export const PIG_ASF_CURRENT_YEAR = PIG_ASF_SNAPSHOT_ASOF.slice(0, 4);

export const pigAsfEventsForProvince = (
  province: string,
  year = PIG_ASF_CURRENT_YEAR,
): readonly PigAsfEvent[] =>
  PIG_ASF_EVENTS.filter(
    (event) =>
      event.province === province && event.occurredAt.startsWith(`${year}-`),
  );
