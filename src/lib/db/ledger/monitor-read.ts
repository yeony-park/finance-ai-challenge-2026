import { z } from "zod";

import { runtimeDatabaseUrl } from "../env";

/**
 * cron `/api/cron/monitor`가 `monitor_runs/events`에 남긴 정정 감시 기록을 화면이 읽는 경로.
 * 런타임 역할은 0010 마이그레이션이 허용한 열만 SELECT할 수 있으므로 열을 명시해 조회한다.
 * DB 미설정·권한 없음·지연은 모두 "기록 없음"으로 정직하게 돌려주고 호출자가 파일 경로로 물러난다.
 */

export const MONITOR_EVENT_KINDS = [
  "no_amendment",
  "amendment_detected",
  "detection_failed",
] as const;

const monitorEventRowSchema = z.object({
  checkedAt: z.date(),
  source: z.string().min(1),
  kind: z.enum(MONITOR_EVENT_KINDS),
  baseRcpNo: z.string().nullable(),
  checkedThrough: z.string().nullable(),
  amendmentRcpNos: z.array(z.string()),
});

export interface LedgerMonitorEvent {
  readonly checkedAt: string;
  readonly source: string;
  readonly kind: (typeof MONITOR_EVENT_KINDS)[number];
  readonly baseRcpNo: string | null;
  readonly checkedThrough: string | null;
  readonly amendmentRcpNos: readonly string[];
}

export type LedgerMonitorRead =
  | { readonly status: "ok"; readonly events: readonly LedgerMonitorEvent[] }
  | { readonly status: "not_configured" }
  | { readonly status: "unavailable"; readonly reason: string };

const DEFAULT_LIMIT = 6;

const DEFAULT_TIMEOUT_MS = 3_000;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// 같은 사유의 실패는 프로세스당 한 번만 loud 로그로 남긴다 — 목록 화면은 공모 수만큼 반복 호출된다.
const warnedReasons = new Set<string>();

const warnOnce = (offerSlug: string, reason: string): void => {
  const key = reason.split("\n")[0] ?? reason;
  if (warnedReasons.has(key)) return;
  warnedReasons.add(key);
  console.warn(
    `[watch] 감시 기록 조회 실패 (${offerSlug}) — 파일 기록으로 표시합니다: ${key}`,
  );
};

const withTimeout = async <T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`감시 기록 조회가 ${timeoutMs}ms 안에 끝나지 않았습니다.`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const toLedgerMonitorEvent = (raw: unknown): LedgerMonitorEvent => {
  const row = monitorEventRowSchema.parse(raw);
  return {
    checkedAt: row.checkedAt.toISOString(),
    source: row.source,
    kind: row.kind,
    baseRcpNo: row.baseRcpNo,
    checkedThrough: row.checkedThrough,
    amendmentRcpNos: [...row.amendmentRcpNos],
  };
};

export interface ReadMonitorEventsOptions {
  readonly limit?: number;
  readonly timeoutMs?: number;
}

/** 공모 1건의 최근 감시 이벤트를 확인 시각 내림차순으로 읽는다. */
export const readRecentMonitorEvents = async (
  offerSlug: string,
  options: ReadMonitorEventsOptions = {},
): Promise<LedgerMonitorRead> => {
  if (!runtimeDatabaseUrl()) return { status: "not_configured" };

  const limit = options.limit ?? DEFAULT_LIMIT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const [{ desc, eq }, { getRuntimeDb }, { monitorEvents, monitorRuns }] =
      await Promise.all([
        import("drizzle-orm"),
        import("../client"),
        import("../schema"),
      ]);
    const db = getRuntimeDb();
    const rows = await withTimeout(
      db
        .select({
          checkedAt: monitorRuns.checkedAt,
          source: monitorRuns.source,
          kind: monitorEvents.kind,
          baseRcpNo: monitorEvents.baseRcpNo,
          checkedThrough: monitorEvents.checkedThrough,
          amendmentRcpNos: monitorEvents.amendmentRcpNos,
        })
        .from(monitorEvents)
        .innerJoin(monitorRuns, eq(monitorEvents.monitorRunId, monitorRuns.id))
        .where(eq(monitorEvents.offerSlug, offerSlug))
        .orderBy(desc(monitorRuns.checkedAt))
        .limit(limit),
      timeoutMs,
    );
    return { status: "ok", events: rows.map(toLedgerMonitorEvent) };
  } catch (error) {
    const reason = messageOf(error);
    warnOnce(offerSlug, reason);
    return { status: "unavailable", reason };
  }
};
