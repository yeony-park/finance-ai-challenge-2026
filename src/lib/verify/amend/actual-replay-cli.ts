import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildOfferSchedule,
  OFFERS,
  type SubscriptionPhase,
} from "../../../components/site/offers";
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
import {
  activeRcpNoForProduct,
  candidateRcpNosForProduct,
} from "../dart/onboarding-catalog";
import { listRawDocuments, rawDocumentDir } from "../dart/fetch-document";
import { assertOfferId, assertRcpNo } from "../paths";
import { runVerification } from "../pipeline";
import { writeReport } from "../report/build";
import { maskFreeText } from "../report/mask";
import { toPublicReport, writePublicReport } from "../report/public-report";
import type { VerifyReport } from "../types";
import {
  correctionDetailOf,
  correctionItemLabel,
  correctionReasonText,
  focusExcerptPair,
  readCorrectionNotice,
  toIsoDate,
} from "./correction-notice";
import { buildVersionDiff, describeVersionDiff, versionFromReport } from "./diff";
import {
  writeReplayDiff,
  type ReplayFilingRecord,
} from "./replay-fixture";
import { replayDisclosureOf, replayRunNoteOf } from "./replay-notes";

const RAW_MISSING_NOTE =
  "원문을 수집하지 않아 이 신고서의 정정 항목 표는 읽지 못했습니다.";

const EXCERPT_LIMIT = 600;

const truncateExcerpt = (text: string): string =>
  text.length > EXCERPT_LIMIT
    ? `${text.slice(0, EXCERPT_LIMIT).trimEnd()} … (이하 생략)`
    : text;

const NOTICE_MISSING_NOTE =
  "이 신고서에서 정정사항 표를 찾지 못했습니다 — 서식이 다를 수 있습니다.";

export interface CliOptions {
  readonly offerId: string;
  readonly baseRcpNo: string;
  readonly dataDir: string;
  readonly forceFake: boolean;
  readonly write: boolean;
  readonly publish: boolean;
}

export const requireReplayScope = (
  rawOfferId: string | undefined,
  rawBaseRcpNo: string | undefined,
  write: boolean,
): Pick<CliOptions, "offerId" | "baseRcpNo"> => {
  if (!rawOfferId) throw new Error("--offer <상품 ID>를 명시해야 합니다.");
  if (!rawBaseRcpNo) {
    throw new Error("--base-rcp-no <원 신고서 접수번호>를 명시해야 합니다.");
  }
  const offerId = assertOfferId(rawOfferId);
  const baseRcpNo = assertRcpNo(rawBaseRcpNo);
  const candidates = candidateRcpNosForProduct("cattle", offerId);
  if (!candidates) {
    throw new Error(`공모 ${offerId}는 onboarding catalog에 없습니다.`);
  }
  if (!candidates.includes(baseRcpNo)) {
    throw new Error(`접수번호 ${baseRcpNo}는 공모 ${offerId}의 후보 RCP가 아닙니다.`);
  }
  if (write && !activeRcpNoForProduct("cattle", offerId)) {
    throw new Error(`공모 ${offerId}는 ready-local 상품이 아니므로 --no-write가 필요합니다.`);
  }
  return { offerId, baseRcpNo };
};

export const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const write = !argv.includes("--no-write");
  const scope = requireReplayScope(
    valueOf("--offer"),
    valueOf("--base-rcp-no"),
    write,
  );
  return {
    ...scope,
    dataDir: valueOf("--dataDir") ?? "data",
    forceFake: argv.includes("--fake"),
    write,
    publish: argv.includes("--publish"),
  };
};

export const loadReplayLineage = async (
  options: Pick<CliOptions, "offerId" | "baseRcpNo" | "write">,
  apiKey: string,
  fetcher: typeof fetchAmendmentLineage = fetchAmendmentLineage,
): Promise<AmendmentLineage> => {
  if (options.write && !activeRcpNoForProduct("cattle", options.offerId)) {
    throw new Error(`공모 ${options.offerId}는 ready-local 상품이 아니므로 조회 결과를 기록할 수 없습니다.`);
  }
  return fetcher(options.baseRcpNo, apiKey);
};

export const writeReplayOutputs = async <T>(
  options: Pick<CliOptions, "offerId" | "write">,
  after: Pick<VerifyReport, "document">,
  writer: () => Promise<T>,
): Promise<T | undefined> => {
  if (!options.write) return undefined;
  const activeRcpNo = activeRcpNoForProduct("cattle", options.offerId);
  if (
    !activeRcpNo ||
    after.document.offerId !== options.offerId ||
    after.document.rcpNo !== activeRcpNo
  ) {
    throw new Error(`공개 기록은 ready-local 상품의 active RCP 검증 결과만 저장할 수 있습니다.`);
  }
  return writer();
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
    correctionDetails: notice.items.map((item) => {
      const detail = correctionDetailOf(notice, item);
      const focused = focusExcerptPair(detail.before, detail.after);
      return {
        label: maskFreeText(correctionItemLabel(item)),
        isOrderRelated: item.isOrderRelated,
        before: maskFreeText(truncateExcerpt(focused.before)),
        after: maskFreeText(truncateExcerpt(focused.after)),
        isExcerpt:
          detail.isExcerpt ||
          focused.before.length > EXCERPT_LIMIT ||
          focused.after.length > EXCERPT_LIMIT,
      };
    }),
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

const subscriptionPhaseOf = (offerId: string): SubscriptionPhase => {
  const offer = OFFERS.find((entry) => entry.id === offerId);
  return offer ? buildOfferSchedule(offer, new Date()).phase : "open";
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const phase = subscriptionPhaseOf(options.offerId);
  const runNote = replayRunNoteOf(phase);
  const baseRcpNo = options.baseRcpNo;

  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    throw new Error("DART_API_KEY 미설정 — 정정 계보를 조회할 수 없습니다. (.env 확인)");
  }

  const lineage = await loadReplayLineage(options, apiKey);
  if (lineage.amendments.length === 0) {
    throw new Error(
      `공모 ${options.offerId}에는 접수된 정정신고서가 없습니다 — 실제 정정 리플레이를 만들 수 없습니다`,
    );
  }

  const withRaw = await Promise.all(
    lineage.amendments.map(async (amendment) => ({
      amendment,
      hasRaw: (await loadRawXml(amendment.rcpNo, options.dataDir)) !== undefined,
    })),
  );
  const last = withRaw.filter((entry) => entry.hasRaw).at(-1)?.amendment;
  if (!last) {
    throw new Error(
      `공모 ${options.offerId}의 정정신고서 원문이 하나도 수집되지 않았습니다 — npm run verify:collect 후 다시 실행하세요`,
    );
  }
  const skippedTail = lineage.amendments.slice(
    lineage.amendments.findIndex((amendment) => amendment.rcpNo === last.rcpNo) + 1,
  );

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
    [runNote],
  );
  const after = await runOnce(
    last.rcpNo,
    options.dataDir,
    options.forceFake,
    [runNote],
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
    runNote,
    ...(skipped > 0
      ? [
          `정정신고서 ${lineage.amendments.length}건 가운데 최종본만 다시 대조했습니다 — 나머지 ${skipped}건은 접수 사실과 정정 항목만 읽었습니다.`,
        ]
      : []),
    ...(skippedTail.length > 0
      ? [
          `최종 정정본(${skippedTail.map((amendment) => amendment.reportName).join(", ")})은 DART가 원문 파일을 제공하지 않아, 원문이 있는 직전 정정본을 다시 대조했습니다.`,
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

  await writeReplayOutputs(options, after, async () => {
    const internal = await writeReport(after, dataDir);
    const published = await writePublicReport(after, dataDir);
    console.log(`\n내부 리포트 저장(로컬 전용): ${internal}`);
    console.log(`공개 리포트 저장(마스킹·커밋 대상): ${published}`);

    const file = await writeReplayDiff(
      {
        kind: "actual-amendment-diff",
        offerId: options.offerId,
        generatedAt: after.generatedAt,
        disclosure: replayDisclosureOf(lineage.amendments.length, phase),
        sourceName: lineage.sourceName,
        filings,
        facts,
        diff,
      },
      dataDir,
    );
    console.log(`실제 정정 diff 저장(커밋 대상): ${file}`);
  });
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(
      "실제 정정 리플레이 생성 실패:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  });
}
