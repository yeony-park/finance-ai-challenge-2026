import {
  assertLawdCd,
  assertRtmsMonth,
  collectRtmsMonth,
  rtmsMonthsBetween,
  writeRtmsCache,
} from "./rtms-collect";

const DEFAULT_FROM = "2026-01";
const DEFAULT_TO = "2026-03";
const DEFAULT_LAWD_CD = "11650";
const DEFAULT_SIGUNGU_NAME = "서울 서초구";

interface CliOptions {
  readonly from: string;
  readonly to: string;
  readonly lawdCd: string;
  readonly sigunguName: string;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    from: assertRtmsMonth(valueOf("--from") ?? DEFAULT_FROM),
    to: assertRtmsMonth(valueOf("--to") ?? DEFAULT_TO),
    lawdCd: assertLawdCd(valueOf("--lawdCd") ?? DEFAULT_LAWD_CD),
    sigunguName: valueOf("--sigungu") ?? DEFAULT_SIGUNGU_NAME,
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

  const months = rtmsMonthsBetween(options.from, options.to);
  console.log(
    `수집 계획: ${options.sigunguName}(${options.lawdCd}) · ${months.join(", ")} → 예상 호출 ${months.length}건 (일 쿼터 10,000)`,
  );

  let calls = 0;
  let okMonths = 0;
  let emptyMonths = 0;
  let failedMonths = 0;
  const failures: string[] = [];

  for (const month of months) {
    const { cache, calls: monthCalls } = await collectRtmsMonth(month, {
      serviceKey,
      lawdCd: options.lawdCd,
      sigunguName: options.sigunguName,
    });
    calls += monthCalls;

    if (cache.status === "ok") okMonths += 1;
    else if (cache.status === "empty") emptyMonths += 1;
    else {
      failedMonths += 1;
      failures.push(`${month}: ${cache.reason ?? "사유 미상"}`);
    }

    const file = await writeRtmsCache(cache, options.dataDir);
    const detail =
      cache.status === "ok"
        ? `신고 ${cache.trades.length}건 (해제 ${cache.cancelledCount}건 제외)`
        : (cache.reason ?? "사유 미상");
    console.log(`  ${cache.month} [${cache.status}] ${detail}`);
    console.log(`  → 저장 ${file}`);
  }

  console.log(
    `\n수집 완료: 호출 ${calls}건 소모 · 성공 ${okMonths} · 신고 없음 ${emptyMonths} · 실패 ${failedMonths}`,
  );

  if (failedMonths > 0) {
    console.log(
      [
        "",
        "실패한 달은 파일에 status=failed로 남았습니다 — 어댑터는 실패한 달을 비교군에 넣지 않습니다.",
        "응답이 '등록되지 않은 서비스키(returnReasonCode=30)'라면 키 자체가 아니라 활용신청이 없는 것입니다.",
        "data.go.kr에서 '국토교통부_상업업무용 부동산 매매 신고 자료' 활용신청(자동승인) 후 재실행하세요.",
        `첫 실패: ${failures[0]}`,
      ].join("\n"),
    );
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(
    "실거래 수집 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
