import {
  assertBjdongCd,
  assertBunJi,
  assertSigunguCd,
  collectBuildingRegister,
  writeBuildingRegisterCache,
} from "../adapters/building-register";

const DEFAULT_SIGUNGU_CD = "11650";
const DEFAULT_BJDONG_CD = "10800";
const DEFAULT_REGION_NAME = "서울 서초구 서초동";

interface CliOptions {
  readonly sigunguCd: string;
  readonly bjdongCd: string;
  readonly bun?: string;
  readonly ji?: string;
  readonly regionName: string;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const bun = valueOf("--bun");
  const ji = valueOf("--ji");
  return {
    sigunguCd: assertSigunguCd(valueOf("--sigunguCd") ?? DEFAULT_SIGUNGU_CD),
    bjdongCd: assertBjdongCd(valueOf("--bjdongCd") ?? DEFAULT_BJDONG_CD),
    ...(bun === undefined ? {} : { bun: assertBunJi(bun, "bun") }),
    ...(ji === undefined ? {} : { ji: assertBunJi(ji, "ji") }),
    regionName: valueOf("--region") ?? DEFAULT_REGION_NAME,
    dataDir: valueOf("--dataDir") ?? "data",
  };
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const serviceKey = process.env.DATA_GO_KR_API_KEY;
  if (!serviceKey) {
    throw new Error(
      "DATA_GO_KR_API_KEY가 없습니다. 수집은 실키 전용입니다 (.env 설정 후 재실행).",
    );
  }

  const parcel =
    options.bun === undefined
      ? "법정동 전체(1페이지)"
      : `지번 ${options.bun}-${options.ji ?? "0000"}`;
  console.log(
    `수집 계획: ${options.regionName}(${options.sigunguCd}-${options.bjdongCd}) · ${parcel} → 호출 1건`,
  );

  const { cache } = await collectBuildingRegister({
    serviceKey,
    sigunguCd: options.sigunguCd,
    bjdongCd: options.bjdongCd,
    ...(options.bun === undefined ? {} : { bun: options.bun }),
    ...(options.ji === undefined ? {} : { ji: options.ji }),
    regionName: options.regionName,
  });

  const file = await writeBuildingRegisterCache(cache, options.dataDir);
  const detail =
    cache.status === "ok"
      ? `표제부 ${cache.titles.length}건${cache.reason === undefined ? "" : ` · ${cache.reason}`}`
      : (cache.reason ?? "사유 미상");
  console.log(`  [${cache.status}] ${detail}`);
  console.log(`  → 저장 ${file}`);

  if (cache.status === "failed") {
    console.log(
      [
        "",
        "응답이 '등록되지 않은 서비스키(returnReasonCode=30)'라면 키 자체가 아니라 활용신청이 없는 것입니다.",
        "data.go.kr에서 '국토교통부_건축HUB 건축물대장정보 서비스' 활용신청(자동승인) 후 재실행하세요.",
      ].join("\n"),
    );
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(
    "건축물대장 수집 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
