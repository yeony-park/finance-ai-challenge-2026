import { readFile } from "node:fs/promises";
import path from "node:path";

import { findFilingByRcpNo } from "../dart/amendment-lineage";
import {
  collectRawDocument,
  listRawDocuments,
  rawDocumentDir,
} from "../dart/fetch-document";
import { rcpNoForOffer } from "../pipeline";
import { collectTrackRecord } from "./collect";
import { offerIdsForIssuer, trackedIssuerKeys } from "./registry";
import { assertMaskedTrackRecord } from "./schema";
import { writeTrackRecord } from "./store";
import { describeTrackRecord } from "./view";

const LIST_CALL_COUNT = 2;

interface CliOptions {
  readonly dataDir: string;
  readonly write: boolean;
  readonly issuerKeys: readonly string[];
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const valueOf = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const issuerKey = valueOf("--issuer");
  return {
    dataDir: valueOf("--dataDir") ?? "data",
    write: !argv.includes("--no-write"),
    issuerKeys: issuerKey === undefined ? trackedIssuerKeys : [issuerKey],
  };
};

const baseRcpNoForIssuer = (issuerKey: string): string => {
  const offerIds = offerIdsForIssuer(issuerKey);
  for (const offerId of offerIds) {
    const rcpNo = rcpNoForOffer(offerId);
    if (rcpNo) return rcpNo;
  }
  throw new Error(
    `발행사 ${issuerKey}에 연결된 공모의 공시 접수번호 매핑이 없습니다`,
  );
};

const loadDocumentXml = async (
  rcpNo: string,
  dataDir: string,
): Promise<string> => {
  await collectRawDocument(rcpNo, { dataDir });
  const files = await listRawDocuments(rcpNo, dataDir);
  const first = files[0];
  if (!first) {
    throw new Error(`원문 xml을 찾지 못했습니다: ${rawDocumentDir(rcpNo, dataDir)}`);
  }
  return readFile(path.join(rawDocumentDir(rcpNo, dataDir), first), "utf8");
};

const runIssuer = async (
  issuerKey: string,
  options: CliOptions,
  apiKey: string,
): Promise<void> => {
  const baseRcpNo = baseRcpNoForIssuer(issuerKey);
  const baseFiling = await findFilingByRcpNo(baseRcpNo, apiKey);
  if (!baseFiling) {
    throw new Error(
      `공시검색에서 접수번호 ${baseRcpNo}의 신고서를 찾지 못해 발행사를 특정할 수 없습니다`,
    );
  }

  const collected = await collectTrackRecord({
    issuerKey,
    corpCode: baseFiling.corpCode,
    apiKey,
    loadDocumentXml: (rcpNo) => loadDocumentXml(rcpNo, options.dataDir),
  });

  const record = assertMaskedTrackRecord(collected.record, {
    forbiddenValues: [baseFiling.corpCode, baseFiling.corpName],
  });

  console.log(`■ 발행사 트랙레코드 — ${issuerKey}`);
  console.log(`  출처: ${record.sourceName}`);
  console.log(
    `  조회 기간: ${record.window.fromYmd} ~ ${record.window.throughYmd} · 공시 ${collected.filings.length}건`,
  );
  console.log(
    `  DART 호출: 공시검색 ${LIST_CALL_COUNT}회 · 원문 ${collected.documentFetchCount}건(로컬 원문이 있으면 재사용)`,
  );
  for (const line of describeTrackRecord(record)) console.log(`    ${line}`);
  for (const note of record.notes) console.log(`    note: ${note}`);

  if (!options.write) return;
  const file = await writeTrackRecord(record, options.dataDir);
  console.log(`  트랙레코드 저장(커밋 대상): ${file}`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DART_API_KEY 미설정 — 발행사 공시를 조회할 수 없습니다. (.env 확인)",
    );
  }

  for (const issuerKey of options.issuerKeys) {
    await runIssuer(issuerKey, options, apiKey);
  }
};

main().catch((error: unknown) => {
  console.error(
    "발행사 트랙레코드 수집 실패:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
