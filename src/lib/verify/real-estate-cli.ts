import { resolveBuildingRegisterAdapter } from "./adapters/building-register-fake";
import { resolveRtmsTradeAdapter } from "./adapters/rtms-trade-fake";
import { loadRealEstateOffer } from "./claims/real-estate";
import { assertOfferId } from "./paths";
import { runRealEstateVerification } from "./pipeline";
import { writeReport } from "./report/build";
import { writePublicReport } from "./report/public-report";
import type { VerifyReport } from "./types";

const DEFAULT_OFFER_ID = "real-estate-a";

interface CliOptions {
  readonly offerId: string;
  readonly forceFake: boolean;
  readonly dataDir: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    offerId: assertOfferId(valueOf("--offerId") ?? DEFAULT_OFFER_ID),
    forceFake: argv.includes("--fake"),
    dataDir: valueOf("--dataDir") ?? "data",
  };
};

const printSummary = (
  report: VerifyReport,
  files: { readonly internal: string; readonly published: string },
): void => {
  console.log(`\n■ ${report.offerId} (자산군 ${report.assetKind}, 공시 기준일 ${report.document.submittedOn})`);
  console.log(`  대조 모드: ${report.mode} · 출처: ${report.sources.join(", ") || "-"}`);
  console.log(
    `  항목 판정 ${report.summary.total}건 — 일치 ${report.summary.match} · 원장 불일치 ${report.summary.mismatch} · 대조 불가 ${report.summary.unverifiable} · 미판정 ${report.unjudged.length}`,
  );

  for (const judgement of report.judgements) {
    const mark =
      judgement.verdict === "match"
        ? "일치"
        : judgement.verdict === "mismatch"
          ? "원장 불일치"
          : "대조 불가";
    console.log(`  · [${mark}] ${judgement.claim.field} — ${judgement.rationale}`);
    console.log(`      근거: ${judgement.evidence[0].observed}`);
  }

  for (const item of report.unjudged) {
    console.log(`  · [대조 불가] ${item.claim.field} — ${item.reason}`);
  }

  console.log(`  ② 가격 위치 제시 ${report.realEstatePlacements.length}건 (판정 아님)`);
  for (const placement of report.realEstatePlacements) {
    console.log(`      ${placement.statement}`);
  }

  for (const note of report.notes) console.log(`  note: ${note}`);
  console.log(`\n내부 리포트 저장(로컬 전용): ${files.internal}`);
  console.log(`공개 리포트 저장(마스킹·커밋 대상): ${files.published}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const offer = await loadRealEstateOffer(options.offerId, options.dataDir);
  const trades = await resolveRtmsTradeAdapter({
    forceFake: options.forceFake,
    dataDir: options.dataDir,
    lawdCd: offer.asset.lawdCd,
    sigunguName: offer.asset.sigunguName,
  });
  const register =
    offer.asset.bjdongCd === undefined
      ? undefined
      : await resolveBuildingRegisterAdapter({
          forceFake: options.forceFake,
          dataDir: options.dataDir,
          sigunguCd: offer.asset.lawdCd,
          bjdongCd: offer.asset.bjdongCd,
          regionName: `${offer.asset.sigunguName} ${offer.asset.dong}`,
        });

  const report = runRealEstateVerification({
    offer,
    trades,
    ...(register === undefined ? {} : { register }),
  });
  const internal = await writeReport(report, options.dataDir);
  const published = await writePublicReport(report, options.dataDir);
  printSummary(report, { internal, published });
};

main().catch((error: unknown) => {
  console.error("검증 실패:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
