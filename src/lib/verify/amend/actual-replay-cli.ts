import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolveAuctionPriceAdapter } from "../adapters/auction-price-fake";
import { resolveLivestockTraceAdapter } from "../adapters/livestock-trace-fake";
import {
  createFakeClaimExtractionClient,
  resolveClaimExtractionClient,
} from "../claims/llm-client";
import {
  fetchAmendmentLineage,
  type AmendmentLineage,
} from "../dart/amendment-lineage";
import { listRawDocuments, rawDocumentDir } from "../dart/fetch-document";
import { assertOfferId } from "../paths";
import { rcpNoForOffer, runVerification } from "../pipeline";
import { writeReport } from "../report/build";
import { maskFreeText } from "../report/mask";
import { toPublicReport, writePublicReport } from "../report/public-report";
import type { VerifyReport } from "../types";
import {
  correctionItemLabel,
  correctionReasonText,
  readCorrectionNotice,
  toIsoDate,
} from "./correction-notice";
import { buildVersionDiff, describeVersionDiff, versionFromReport } from "./diff";
import {
  writeReplayDiff,
  type ReplayFilingRecord,
} from "./replay-fixture";

const DEFAULT_OFFER_ID = "livestock-7";

const RAW_MISSING_NOTE =
  "원문을 수집하지 않아 이 신고서의 정정 항목 표는 읽지 못했습니다.";

const NOTICE_MISSING_NOTE =
  "이 신고서에서 정정사항 표를 찾지 못했습니다 — 서식이 다를 수 있습니다.";

interface CliOptions {
  readonly offerId: string;
  readonly dataDir: string;
  readonly forceFake: boolean;
  readonly write: boolean;
  readonly publish: boolean;
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    offerId: assertOfferId(valueOf("--offer") ?? DEFAULT_OFFER_ID),
    dataDir: valueOf("--dataDir") ?? "data",
    forceFake: argv.includes("--fake"),
    write: !argv.includes("--no-write"),
    publish: argv.includes("--publish"),
  };
};

const loadRawXml = async (
  rcpNo: string,
  dataDir: string,
): Promise<string | undefined> => {
  const files = await listRawDocuments(rcpNo, dataDir);
  const first = files[0];
  if (!first) return undefined;
  return readFile(path.join(rawDocumentDir(rcpNo, dataDir), first), "utf8");
};

const requireRawXml = async (
  rcpNo: string,
  dataDir: string,
): Promise<string> => {
  const xml = await loadRawXml(rcpNo, dataDir);
  if (!xml) {
    throw new Error(
      [
        `원문을 찾을 수 없습니다: ${rawDocumentDir(rcpNo, dataDir)}`,
        `먼저 원문을 수집하세요: npm run verify:collect -- ${rcpNo}`,
      ].join("\n"),
    );
  }
  return xml;
};

const toIsoFromYmd8 = (ymd: string): string =>
  /^\d{8}$/.test(ymd)
    ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
    : ymd;

const filingRecord = async (
  rcpNo: string,
  receivedOn: string,
  role: ReplayFilingRecord["role"],
  reportLabel: string,
  isRechecked: boolean,
  dataDir: string,
): Promise<ReplayFilingRecord> => {
  const base = {
    rcpNo,
    receivedOn: toIsoFromYmd8(receivedOn),
    role,
    reportLabel: maskFreeText(reportLabel),
    isRechecked,
  } as const;

  const empty = { correctionReason: "", correctionItems: [] } as const;

  if (role === "base") return { ...base, ...empty, correctionNotes: [] };

  const xml = await loadRawXml(rcpNo, dataDir);
  if (!xml) return { ...base, ...empty, correctionNotes: [RAW_MISSING_NOTE] };

  const notice = readCorrectionNotice(xml);
  if (!notice) return { ...base, ...empty, correctionNotes: [NOTICE_MISSING_NOTE] };

  return {
    ...base,
    correctionReason: maskFreeText(correctionReasonText(notice)),
    correctionItems: notice.items.map((item) =>
      maskFreeText(correctionItemLabel(item)),
    ),
    correctionNotes: [],
  };
};

const firstSubmissionNote = async (
  lineage: AmendmentLineage,
  dataDir: string,
): Promise<readonly string[]> => {
  const baseIso = toIsoFromYmd8(lineage.baseReceivedOn);
  const mismatched: string[] = [];

  for (const amendment of lineage.amendments) {
    const xml = await loadRawXml(amendment.rcpNo, dataDir);
    const printed = xml ? readCorrectionNotice(xml)?.firstSubmittedOnText : undefined;
    const iso = printed ? toIsoDate(printed) : "";
    if (iso.length > 0 && iso !== baseIso) {
      mismatched.push(
        `${toIsoFromYmd8(amendment.receivedOn)} 접수 정정신고서에는 최초제출일이 "${printed}"로 적혀 있으나 공시검색상 원 신고서 접수일은 ${baseIso}입니다.`,
      );
    }
  }
  return mismatched;
};

const runOnce = async (
  rcpNo: string,
  dataDir: string,
  forceFake: boolean,
  notes: readonly string[],
): Promise<VerifyReport> => {
  const xml = await requireRawXml(rcpNo, dataDir);
  const trace = await resolveLivestockTraceAdapter({ forceFake });
  const auction = await resolveAuctionPriceAdapter({ forceFake, dataDir });
  const extractor = forceFake
    ? createFakeClaimExtractionClient()
    : await resolveClaimExtractionClient();

  return runVerification({ rcpNo, xml, trace, auction, extractor, notes });
};

const disclosureOf = (amendmentCount: number): string =>
  `청약이 종료된 공모를 사후에 대조한 기록입니다 — 실제 접수된 정정신고서 ${amendmentCount}건 가운데 최종 정정본을 원 신고서와 같은 절차로 각각 다시 대조했고, 개체 원장 조회는 대조 실행 시각 기준입니다.`;

const POST_CLOSE_RUN_NOTE =
  "청약이 종료된 공모라 두 버전 모두 지금 시점의 원장과 대조했습니다 — 청약 당시의 원장 상태와는 다를 수 있습니다.";

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    throw new Error("DART_API_KEY 미설정 — 정정 계보를 조회할 수 없습니다. (.env 확인)");
  }

  const baseRcpNo = rcpNoForOffer(options.offerId);
  if (!baseRcpNo) {
    throw new Error(`공모 ${options.offerId}의 공시 접수번호 매핑이 없습니다`);
  }

  const lineage = await fetchAmendmentLineage(baseRcpNo, apiKey);
  const last = lineage.amendments.at(-1);
  if (!last) {
    throw new Error(
      `공모 ${options.offerId}에는 접수된 정정신고서가 없습니다 — 실제 정정 리플레이를 만들 수 없습니다`,
    );
  }

  console.log(`■ ${options.offerId} 정정 계보 (${lineage.sourceName})`);
  console.log(`  원 신고서 ${lineage.baseRcpNo} · ${lineage.baseReceivedOn} 접수`);
  for (const amendment of lineage.amendments) {
    console.log(
      `  정정 ${amendment.rcpNo} · ${amendment.receivedOn} 접수 · ${amendment.reportName}`,
    );
  }

  const before = await runOnce(
    baseRcpNo,
    options.dataDir,
    options.forceFake,
    [POST_CLOSE_RUN_NOTE],
  );
  const after = await runOnce(
    last.rcpNo,
    options.dataDir,
    options.forceFake,
    [POST_CLOSE_RUN_NOTE],
  );

  const isFakeRun = after.mode === "fake";
  const dataDir =
    isFakeRun && options.dataDir === "data" && !options.publish
      ? path.join("data", "scratch-fake")
      : options.dataDir;
  if (dataDir !== options.dataDir) {
    console.log(
      "fake 모드 산출물은 data/scratch-fake/에 저장됩니다 — data/public/ 최신본을 fake로 덮으려면 --publish를 명시하세요.",
    );
  }

  const filings = await Promise.all([
    filingRecord(
      lineage.baseRcpNo,
      lineage.baseReceivedOn,
      "base",
      lineage.baseReportName,
      true,
      options.dataDir,
    ),
    ...lineage.amendments.map((amendment) =>
      filingRecord(
        amendment.rcpNo,
        amendment.receivedOn,
        "amendment",
        amendment.reportName,
        amendment.rcpNo === last.rcpNo,
        options.dataDir,
      ),
    ),
  ]);

  const skipped = lineage.amendments.length - 1;
  const extraNotes = [
    POST_CLOSE_RUN_NOTE,
    ...(skipped > 0
      ? [
          `정정신고서 ${lineage.amendments.length}건 가운데 최종본만 다시 대조했습니다 — 나머지 ${skipped}건은 접수 사실과 정정 항목만 읽었습니다.`,
        ]
      : []),
    ...(await firstSubmissionNote(lineage, options.dataDir)),
    ...lineage.notes,
  ];

  const diff = buildVersionDiff(
    versionFromReport(toPublicReport(before)),
    versionFromReport(toPublicReport(after)),
    extraNotes,
  );
  const facts = describeVersionDiff(diff);
  for (const fact of facts) console.log(`  ${fact}`);

  if (!options.write) return;

  const internal = await writeReport(after, dataDir);
  const published = await writePublicReport(after, dataDir);
  console.log(`\n내부 리포트 저장(로컬 전용): ${internal}`);
  console.log(`공개 리포트 저장(마스킹·커밋 대상): ${published}`);

  const file = await writeReplayDiff(
    {
      kind: "actual-amendment-diff",
      offerId: options.offerId,
      generatedAt: after.generatedAt,
      disclosure: disclosureOf(lineage.amendments.length),
      sourceName: lineage.sourceName,
      filings,
      facts,
      diff,
    },
    dataDir,
  );
  console.log(`실제 정정 diff 저장(커밋 대상): ${file}`);
};

main().catch((error: unknown) => {
  console.error(
    "실제 정정 리플레이 생성 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
