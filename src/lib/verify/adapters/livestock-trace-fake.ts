/**
 * fake 축산물이력제 어댑터 — 2026-08-10 37두 실측 스냅샷을 재생한다.
 * 키·네트워크 없이 전체 파이프라인이 완주해야 하므로 이것이 CI·데모의 기본값이다.
 * 스냅샷이 곧 회귀 기준이다 (36두 일치 · 학산 24호 불일치).
 */
import { readFile } from "node:fs/promises";
import {
  TRACE_ENDPOINT,
  TRACE_SOURCE_ID,
  TRACE_SOURCE_NAME,
  toTraceNo9,
  type FarmRegistration,
  type LivestockTraceAdapter,
  type LivestockTraceRecord,
} from "./livestock-trace";

export const DEFAULT_SNAPSHOT_PATH =
  "data/snapshots/2026-08-10-bankcow9-37head-trace.json";

interface SnapshotFarm {
  readonly regYmd?: string;
  readonly regType?: string;
  readonly farmNo?: string;
  readonly farmerNm?: string;
  readonly farmAddr?: string;
}

interface SnapshotVerdict {
  readonly docTraceNo9: string;
  readonly queriedTraceNo12: string;
  readonly apiCattleNo15?: string;
  readonly exists: boolean;
  readonly birthYmd?: string;
  readonly lsTypeNm?: string;
  readonly sexNm?: string;
  readonly currentFarmNo?: string;
  readonly farmHistory?: readonly SnapshotFarm[];
  readonly slaughtered?: boolean;
  readonly vaccinationCount?: number;
  readonly lastVaccination?: { readonly injectionYmd?: string };
  readonly brucellosis?: { readonly inspectYn?: string };
}

interface Snapshot {
  readonly generatedAt: string;
  readonly verdicts: readonly SnapshotVerdict[];
}

const toFarm = (farm: SnapshotFarm): FarmRegistration => ({
  regYmd: farm.regYmd ?? "",
  regType: farm.regType ?? "",
  farmNo: farm.farmNo ?? "",
  farmerName: farm.farmerNm ?? "",
  farmAddress: farm.farmAddr ?? "",
});

const toRecord = (
  verdict: SnapshotVerdict,
  observedAt: string,
): LivestockTraceRecord => {
  const farmHistory = [...(verdict.farmHistory ?? [])]
    .map(toFarm)
    .sort((a, b) => a.regYmd.localeCompare(b.regYmd));

  return {
    traceNo9: verdict.docTraceNo9,
    traceNo12: verdict.queriedTraceNo12,
    exists: verdict.exists,
    ...(verdict.apiCattleNo15 ? { cattleNo: verdict.apiCattleNo15 } : {}),
    ...(verdict.birthYmd ? { birthYmd: verdict.birthYmd } : {}),
    ...(verdict.lsTypeNm ? { breedName: verdict.lsTypeNm } : {}),
    ...(verdict.sexNm ? { sexName: verdict.sexNm } : {}),
    ...(verdict.currentFarmNo ? { currentFarmNo: verdict.currentFarmNo } : {}),
    farmHistory,
    ...(farmHistory.at(-1) ? { currentFarm: farmHistory.at(-1) } : {}),
    slaughtered: verdict.slaughtered ?? false,
    vaccinationCount: verdict.vaccinationCount ?? 0,
    ...(verdict.lastVaccination?.injectionYmd
      ? { lastVaccinationYmd: verdict.lastVaccination.injectionYmd }
      : {}),
    ...(verdict.brucellosis?.inspectYn
      ? { brucellosisResult: verdict.brucellosis.inspectYn }
      : {}),
    observedAt,
  };
};

/** 스냅샷 JSON을 읽어 fake 어댑터를 만든다. 없는 이력번호는 "미등록"으로 재생된다. */
export const createFakeTraceAdapter = async (
  snapshotPath: string = DEFAULT_SNAPSHOT_PATH,
): Promise<LivestockTraceAdapter> => {
  const raw = await readFile(snapshotPath, "utf8");
  const snapshot = JSON.parse(raw) as Snapshot;
  const observedAt = new Date(snapshot.generatedAt).toISOString();
  const byTraceNo = new Map(
    snapshot.verdicts.map((verdict) => [verdict.docTraceNo9, verdict]),
  );

  return {
    name: "fake",
    sourceId: TRACE_SOURCE_ID,
    sourceName: `${TRACE_SOURCE_NAME} — 2026-08-10 실측 스냅샷 재생`,
    url: TRACE_ENDPOINT,
    async lookup(traceNo: string): Promise<LivestockTraceRecord> {
      const traceNo9 = toTraceNo9(traceNo);
      const verdict = byTraceNo.get(traceNo9);
      if (!verdict) {
        return {
          traceNo9,
          traceNo12: `002${traceNo9}`,
          exists: false,
          farmHistory: [],
          slaughtered: false,
          vaccinationCount: 0,
          observedAt,
        };
      }
      return toRecord(verdict, observedAt);
    },
  };
};

/**
 * 어댑터 선택 — 키가 없으면 자동으로 fake.
 * (이력제 API는 서비스키를 검증하지 않지만, 실호출 여부는 명시적으로 키에 건다)
 */
export const resolveLivestockTraceAdapter = async (options: {
  readonly forceFake?: boolean;
  readonly snapshotPath?: string;
} = {}): Promise<LivestockTraceAdapter> => {
  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (options.forceFake || !serviceKey) {
    return createFakeTraceAdapter(options.snapshotPath);
  }
  const { createEkapeTraceAdapter } = await import("./livestock-trace");
  return createEkapeTraceAdapter({ serviceKey });
};
