import {
  assertBuildingHubRequest,
  type BuildingHubRequest,
} from "../adapters/building-register";
import {
  collectBuildingHub,
  writeBuildingHubCache,
} from "./building-hub-collect";

const DEFAULT_REQUEST: BuildingHubRequest = {
  sigunguCd: "26380",
  bjdongCd: "10800",
  platGbCd: "0",
  bun: "0651",
  ji: "0001",
};

interface CliOptions {
  readonly request: BuildingHubRequest;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    request: assertBuildingHubRequest({
      sigunguCd: valueOf("--sigunguCd") ?? DEFAULT_REQUEST.sigunguCd,
      bjdongCd: valueOf("--bjdongCd") ?? DEFAULT_REQUEST.bjdongCd,
      platGbCd: valueOf("--platGbCd") ?? DEFAULT_REQUEST.platGbCd,
      bun: valueOf("--bun") ?? DEFAULT_REQUEST.bun,
      ji: valueOf("--ji") ?? DEFAULT_REQUEST.ji,
    }),
    dataDir: valueOf("--dataDir") ?? "data",
  };
};

const main = async (): Promise<void> => {
  const serviceKey = process.env.BUILDING_HUB_API_KEY;
  if (!serviceKey) {
    throw new Error("BUILDING_HUB_API_KEY가 없습니다. .env 설정 후 재실행하세요.");
  }
  const options = parseArgs(process.argv.slice(2));
  console.log(
    `수집 계획: 시군구 ${options.request.sigunguCd} · 법정동 ${options.request.bjdongCd} · 지번 ${options.request.bun}-${options.request.ji} → 정확 지번 1회 조회`,
  );
  const { cache } = await collectBuildingHub({ serviceKey, request: options.request });
  const file = await writeBuildingHubCache(cache, options.dataDir);
  console.log(`수집 결과: ${cache.status} · ${cache.reason ?? `표제부 ${cache.totalCount}건`}`);
  console.log(`저장 ${file}`);
  if (cache.status === "failed") process.exitCode = 1;
};

main().catch((error: unknown) => {
  console.error("건축물대장 수집 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
