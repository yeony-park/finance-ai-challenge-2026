import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  ECOS_MAX_REQUESTS,
  ECOS_ROW_LIMIT,
  type EcosBaseRateCache,
  assertEcosDate,
  collectEcosBaseRate,
  ecosCacheFile,
  writeEcosCache,
} from "./ecos-collect";

const DEFAULT_FROM = "2024-11-01";
const DEFAULT_TO = "2026-08-23";

const option = (argv: readonly string[], flag: string): string | undefined => {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
};

const attemptOf = (cache: EcosBaseRateCache) => ({
  collectedAt: cache.collectedAt,
  requestCount: cache.requestCount,
  status: cache.status,
  ...(cache.responseCode ? { responseCode: cache.responseCode } : {}),
  totalCount: cache.totalCount,
  collectedCount: cache.collectedCount,
  ...(cache.reason ? { reason: cache.reason } : {}),
});

const previousCache = async (
  dataDir: string,
  from: string,
  to: string,
): Promise<EcosBaseRateCache | undefined> => {
  try {
    const raw = JSON.parse(await readFile(ecosCacheFile(dataDir), "utf8")) as EcosBaseRateCache;
    return raw.statisticCode === "722Y001" && raw.itemCode === "0101000" && raw.from === from && raw.to === to
      ? raw
      : undefined;
  } catch {
    return undefined;
  }
};

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);
  const from = assertEcosDate(option(argv, "--from") ?? DEFAULT_FROM);
  const to = assertEcosDate(option(argv, "--to") ?? DEFAULT_TO);
  const dataDir = option(argv, "--dataDir") ?? "data";
  console.log(
    `수집 계획: ECOS ${from}~${to} · 기준금리 ${ECOS_ROW_LIMIT}행 한도 · 최대 API 호출 ${ECOS_MAX_REQUESTS}회`,
  );
  const previous = await previousCache(dataDir, from, to);
  const { cache: collected, calls } = await collectEcosBaseRate({
    apiKey: process.env.ECOS_API_KEY,
    from,
    to,
  });
  const priorAttempts = previous?.attemptHistory ?? (previous ? [attemptOf(previous)] : []);
  const cache: EcosBaseRateCache = {
    ...collected,
    cumulativeRequestCount: priorAttempts.reduce((total, attempt) => total + attempt.requestCount, 0) + calls,
    attemptHistory: [...priorAttempts, attemptOf(collected)],
  };
  const file = await writeEcosCache(cache, dataDir);
  console.log(
    `수집 결과: ${cache.status} · 호출 ${calls}회 · totalCount ${cache.totalCount} · 기준금리 행 ${cache.collectedCount}`,
  );
  console.log(`저장 ${file}`);
  if (cache.status === "failed") {
    console.log("사용자 작업: ECOS_API_KEY 설정과 StatisticSearch 722Y001 조회 권한을 확인한 뒤 같은 범위로 다시 실행하세요.");
    process.exitCode = 1;
  }
};

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error("ECOS 기준금리 수집 실패:", error instanceof Error ? error.message : "알 수 없는 오류");
    process.exitCode = 1;
  });
}
