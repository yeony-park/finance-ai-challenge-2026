import type { AmendmentFiling, AmendmentLineage } from "../dart/amendment-lineage";
import { DART_LIST_SOURCE_NAME } from "../dart/list-filings";
import {
  buildVersionDiff,
  describeVersionDiff,
  versionFromReport,
  type VersionDiff,
  type VersionReportLike,
} from "./diff";

export type AmendmentEventKind =
  | "no_amendment"
  | "amendment_detected"
  | "detection_failed";

export interface MonitorTarget {
  readonly offerId: string;
  readonly rcpNo?: string;
}

export interface AmendmentEvent {
  readonly offerId: string;
  readonly kind: AmendmentEventKind;
  readonly checkedAt: string;
  readonly baseRcpNo?: string;
  readonly checkedThrough?: string;
  readonly amendments: readonly AmendmentFiling[];
  readonly diff?: VersionDiff;
  readonly facts: readonly string[];
  readonly notes: readonly string[];
}

export interface MonitorRun {
  readonly checkedAt: string;
  readonly source: string;
  readonly events: readonly AmendmentEvent[];
}

export interface MonitorDeps {
  readonly targets: readonly MonitorTarget[];
  readonly fetchLineage: (rcpNo: string) => Promise<AmendmentLineage>;
  readonly loadReport?: (
    offerId: string,
  ) => Promise<VersionReportLike | undefined>;
  readonly reverify?: (rcpNo: string) => Promise<VersionReportLike | undefined>;
  readonly now: () => Date;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const NO_AMENDMENT_FACT =
  "이 공모의 정정신고서 접수는 확인 시각 기준 0건입니다.";

const NO_REVERIFY_NOTE =
  "정정본 재대조가 실행되지 않아 변경 항목·판정 유지/변동을 아직 계산하지 못했습니다.";

const NO_BASELINE_NOTE =
  "비교 기준이 되는 직전 공개 리포트가 없어 버전 간 비교를 하지 못했습니다.";

const amendmentFact = (amendments: readonly AmendmentFiling[]): string => {
  const latest = amendments.at(-1);
  return `이 공모의 정정신고서가 ${amendments.length}건 접수되었습니다 (최근 접수 ${latest?.receivedOn ?? "-"} · 접수번호 ${latest?.rcpNo ?? "-"}).`;
};

const buildDiff = async (
  deps: MonitorDeps,
  offerId: string,
  amendment: AmendmentFiling,
): Promise<{
  readonly diff?: VersionDiff;
  readonly notes: readonly string[];
}> => {
  if (!deps.loadReport || !deps.reverify) return { notes: [NO_REVERIFY_NOTE] };

  const before = await deps.loadReport(offerId);
  if (!before) return { notes: [NO_BASELINE_NOTE] };

  const after = await deps.reverify(amendment.rcpNo);
  if (!after) return { notes: [NO_REVERIFY_NOTE] };

  return {
    diff: buildVersionDiff(versionFromReport(before), versionFromReport(after)),
    notes: [],
  };
};

const monitorTarget = async (
  deps: MonitorDeps,
  target: MonitorTarget,
  checkedAt: string,
): Promise<AmendmentEvent> => {
  if (!target.rcpNo) {
    return {
      offerId: target.offerId,
      kind: "detection_failed",
      checkedAt,
      amendments: [],
      facts: [],
      notes: [
        "이 공모의 공시 접수번호 매핑이 없어 정정 여부를 확인하지 못했습니다.",
      ],
    };
  }

  let lineage: AmendmentLineage;
  try {
    lineage = await deps.fetchLineage(target.rcpNo);
  } catch (error) {
    return {
      offerId: target.offerId,
      kind: "detection_failed",
      checkedAt,
      baseRcpNo: target.rcpNo,
      amendments: [],
      facts: [],
      notes: [`정정 여부를 확인하지 못했습니다 — ${messageOf(error)}`],
    };
  }

  const base = {
    offerId: target.offerId,
    checkedAt,
    baseRcpNo: lineage.baseRcpNo,
    checkedThrough: lineage.checkedThrough,
    amendments: lineage.amendments,
  } as const;

  if (lineage.amendments.length === 0) {
    return {
      ...base,
      kind: "no_amendment",
      facts: [NO_AMENDMENT_FACT],
      notes: lineage.notes,
    };
  }

  const latest = lineage.amendments[lineage.amendments.length - 1];
  const comparison = latest
    ? await buildDiff(deps, target.offerId, latest)
    : { notes: [NO_REVERIFY_NOTE] as readonly string[] };

  return {
    ...base,
    kind: "amendment_detected",
    ...(comparison.diff === undefined ? {} : { diff: comparison.diff }),
    facts: [
      amendmentFact(lineage.amendments),
      ...(comparison.diff ? describeVersionDiff(comparison.diff) : []),
    ],
    notes: [...lineage.notes, ...comparison.notes],
  };
};

export const runAmendmentMonitor = async (
  deps: MonitorDeps,
): Promise<MonitorRun> => {
  const checkedAt = deps.now().toISOString();
  const events: AmendmentEvent[] = [];

  for (const target of deps.targets) {
    events.push(await monitorTarget(deps, target, checkedAt));
  }

  return { checkedAt, source: DART_LIST_SOURCE_NAME, events };
};
