import { readFile } from "node:fs/promises";
import path from "node:path";

import { OFFERS } from "../../../components/site/offers";
import { resolveAuctionPriceAdapter } from "../adapters/auction-price-fake";
import { resolveLivestockTraceAdapter } from "../adapters/livestock-trace-fake";
import { createFakeClaimExtractionClient } from "../claims/llm-client";
import { fetchAmendmentLineage } from "../dart/amendment-lineage";
import { listRawDocuments, rawDocumentDir } from "../dart/fetch-document";
import { rcpNoForOffer, runVerification } from "../pipeline";
import { toPublicReport } from "../report/public-report";
import {
  buildVersionDiff,
  describeVersionDiff,
  versionFromReport,
} from "./diff";
import { runAmendmentMonitor, type MonitorTarget } from "./monitor";
import { writeReplayDiff } from "./replay-fixture";
import {
  applySyntheticEdits,
  DEFAULT_SYNTHETIC_EDITS,
  SYNTHETIC_AMENDMENT_RCP_NO,
  SYNTHETIC_DISCLOSURE,
} from "./synthetic-version";
import { toWatchState, writeWatchState } from "./watch-state";

interface CliOptions {
  readonly dataDir: string;
  readonly replayFixture: boolean;
  readonly write: boolean;
  readonly offerId?: string;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const offerId = valueOf("--offer");
  return {
    dataDir: valueOf("--dataDir") ?? "data",
    replayFixture: argv.includes("--replay-fixture"),
    write: !argv.includes("--no-write"),
    ...(offerId === undefined ? {} : { offerId }),
  };
};

const loadRawXml = async (rcpNo: string, dataDir: string): Promise<string> => {
  const files = await listRawDocuments(rcpNo, dataDir);
  const first = files[0];
  if (!first) {
    throw new Error(
      [
        `원문을 찾을 수 없습니다: ${rawDocumentDir(rcpNo, dataDir)}`,
        "먼저 원문을 수집하세요: npm run verify:collect -- <rcpNo>",
      ].join("\n"),
    );
  }
  return readFile(path.join(rawDocumentDir(rcpNo, dataDir), first), "utf8");
};

const targetsFor = (options: CliOptions): readonly MonitorTarget[] =>
  OFFERS.filter((offer) => !options.offerId || offer.id === options.offerId).map(
    (offer): MonitorTarget => {
      const rcpNo = rcpNoForOffer(offer.id);
      return { offerId: offer.id, ...(rcpNo === undefined ? {} : { rcpNo }) };
    },
  );

const runDetection = async (options: CliOptions): Promise<void> => {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DART_API_KEY 미설정 — 정정 여부를 조회할 수 없습니다. (.env 확인)",
    );
  }

  const run = await runAmendmentMonitor({
    targets: targetsFor(options),
    fetchLineage: (rcpNo) => fetchAmendmentLineage(rcpNo, apiKey),
    now: () => new Date(),
  });

  console.log(`■ 정정 감시 — 확인 시각 ${run.checkedAt}`);
  console.log(`  출처: ${run.source}`);

  for (const event of run.events) {
    console.log(`\n· ${event.offerId} [${event.kind}]`);
    for (const fact of event.facts) console.log(`    ${fact}`);
    for (const note of event.notes) console.log(`    note: ${note}`);

    if (!options.write) continue;
    const file = await writeWatchState(
      toWatchState(event, run.source),
      options.dataDir,
    );
    console.log(`    감시 기록 저장(커밋 대상): ${file}`);
  }
};

const runReplayFixture = async (options: CliOptions): Promise<void> => {
  const offerId = options.offerId ?? OFFERS[0]?.id;
  if (!offerId) throw new Error("공모 레지스트리가 비어 있습니다");

  const rcpNo = rcpNoForOffer(offerId);
  if (!rcpNo) {
    throw new Error(`공모 ${offerId}의 공시 접수번호 매핑이 없습니다`);
  }

  const xml = await loadRawXml(rcpNo, options.dataDir);
  const amendedXml = applySyntheticEdits(xml);

  const trace = await resolveLivestockTraceAdapter({ forceFake: true });
  const auction = await resolveAuctionPriceAdapter({
    forceFake: true,
    dataDir: options.dataDir,
  });
  const extractor = createFakeClaimExtractionClient();
  const generatedAt = new Date().toISOString();

  const before = await runVerification({
    rcpNo,
    xml,
    trace,
    auction,
    extractionMode: "rules-only",
    extractor,
    generatedAt,
  });
  const after = await runVerification({
    rcpNo: SYNTHETIC_AMENDMENT_RCP_NO,
    xml: amendedXml,
    trace,
    auction,
    extractionMode: "rules-only",
    extractor,
    generatedAt,
  });

  const diff = buildVersionDiff(
    versionFromReport(toPublicReport(before)),
    versionFromReport(toPublicReport(after)),
    [SYNTHETIC_DISCLOSURE],
  );
  const facts = describeVersionDiff(diff);

  for (const fact of facts) console.log(`  ${fact}`);

  if (!options.write) return;
  const file = await writeReplayDiff(
    {
      kind: "synthetic-amendment-diff",
      offerId,
      generatedAt,
      disclosure: SYNTHETIC_DISCLOSURE,
      editLabels: DEFAULT_SYNTHETIC_EDITS.map((edit) => edit.label),
      facts,
      diff,
    },
    options.dataDir,
  );
  console.log(`\n합성 정정 diff 저장(커밋 대상): ${file}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  if (options.replayFixture) {
    await runReplayFixture(options);
    return;
  }
  await runDetection(options);
};

main().catch((error: unknown) => {
  console.error(
    "정정 감시 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
