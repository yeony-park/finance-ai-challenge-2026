/**
 * fake 축산물이력제 어댑터 — 2026-08-10 37두 실측 스냅샷을 재생한다.
 * 키·네트워크 없이 전체 파이프라인이 완주해야 하므로 이것이 CI·데모의 기본값이다.
 * 스냅샷이 곧 회귀 기준이다 (36두 일치 · 학산 24호 불일치).
 */
import { readFile } from "node:fs/promises";
import { z } from "zod";
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

/**
 * 스냅샷 경계 스키마 — 파일도 "외부에서 들어오는 JSON"이다.
 * `claims/schema.ts`·`report/snapshot.ts`와 같은 원칙으로, 모양이 어긋나면 즉시 실패한다
 * (조용히 undefined가 퍼져 가짜 "확인 불가"를 만드는 것을 막는다).
 * 스냅샷에는 분석용 필드가 더 있지만 zod가 걷어낸다 — 어댑터가 쓰는 필드만 계약이다.
 */
const optionalText = z.string().nullish();

const snapshotFarmSchema = z.object({
  regYmd: optionalText,
  regType: optionalText,
  farmNo: optionalText,
  farmerNm: optionalText,
  farmAddr: optionalText,
});

const snapshotVerdictSchema = z.object({
  docTraceNo9: z.string().min(1),
  queriedTraceNo12: z.string().min(1),
  apiCattleNo15: optionalText,
  exists: z.boolean(),
  birthYmd: optionalText,
  lsTypeNm: optionalText,
  sexNm: optionalText,
  currentFarmNo: optionalText,
  farmHistory: z.array(snapshotFarmSchema).nullish(),
  slaughtered: z.boolean().nullish(),
  vaccinationCount: z.number().nullish(),
  lastVaccination: z.object({ injectionYmd: optionalText }).nullish(),
  brucellosis: z.object({ inspectYn: optionalText }).nullish(),
});

const snapshotSchema = z.object({
  generatedAt: z.string().min(1),
  verdicts: z.array(snapshotVerdictSchema),
});

type SnapshotFarm = z.infer<typeof snapshotFarmSchema>;
type SnapshotVerdict = z.infer<typeof snapshotVerdictSchema>;

/** 검증된 스냅샷만 돌려준다. 형식이 어긋나면 사람이 읽을 수 있는 오류로 실패한다. */
export const parseTraceSnapshot = (
  raw: unknown,
  source: string,
): z.infer<typeof snapshotSchema> => {
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) {
    const reason = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`이력제 스냅샷 형식이 올바르지 않습니다 (${source}) — ${reason}`);
  }
  return parsed.data;
};

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
  const snapshot = parseTraceSnapshot(JSON.parse(raw), snapshotPath);
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
