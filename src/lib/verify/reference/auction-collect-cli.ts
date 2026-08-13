import { SEX_CODES } from "../adapters/auction-price";
import {
  collectMonth,
  monthsBetween,
  writeAuctionCache,
  assertMonth,
} from "./auction-collect";

const DEFAULT_FROM = "2026-05";
const DEFAULT_TO = "2026-08";

interface CliOptions {
  readonly from: string;
  readonly to: string;
  readonly breedName: string;
  readonly sexNames: readonly string[];
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const sexRaw = valueOf("--sex");
  return {
    from: assertMonth(valueOf("--from") ?? DEFAULT_FROM),
    to: assertMonth(valueOf("--to") ?? DEFAULT_TO),
    breedName: valueOf("--breed") ?? "한우",
    sexNames: sexRaw ? sexRaw.split(",") : Object.keys(SEX_CODES),
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

  const months = monthsBetween(options.from, options.to);
  const planned = months.length * options.sexNames.length;
  console.log(
    `수집 계획: ${options.breedName} · ${months.join(", ")} · 성별 ${options.sexNames.join("/")} → 예상 호출 ${planned}건 (일 쿼터 1,000)`,
  );

  let calls = 0;
  let okCells = 0;
  let emptyCells = 0;
  let failedCells = 0;

  for (const month of months) {
    const { cache, calls: monthCalls } = await collectMonth(month, {
      serviceKey,
      breedName: options.breedName,
      sexNames: options.sexNames,
    });
    calls += monthCalls;

    const file = await writeAuctionCache(cache, options.dataDir);
    for (const entry of cache.entries) {
      if (entry.status === "ok") okCells += 1;
      else if (entry.status === "empty") emptyCells += 1;
      else failedCells += 1;

      const detail =
        entry.status === "ok"
          ? `평균 ${entry.averagePricePerKg?.toLocaleString("ko-KR")}원/kg · 등급판정 ${entry.sampleSize?.toLocaleString("ko-KR")}두`
          : (entry.reason ?? "사유 미상");
      console.log(
        `  ${cache.month} ${entry.sexName.padEnd(2)} [${entry.status}] ${detail}`,
      );
    }
    console.log(
      `  → 저장 ${file}${cache.partial ? " (부분 수집 — 진행 중인 달)" : ""}`,
    );
  }

  console.log(
    `\n수집 완료: 호출 ${calls}건 소모 · 성공 ${okCells} · 표본 없음 ${emptyCells} · 실패 ${failedCells}`,
  );
  if (failedCells > 0) {
    console.log(
      "실패한 칸은 파일에 status=failed로 남았습니다 — 판정은 그 칸을 '대조 불가 + 사유'로 다룹니다.",
    );
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(
    "경락가 수집 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
