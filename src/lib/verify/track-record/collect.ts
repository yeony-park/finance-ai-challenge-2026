import { listFilings, toKstYmd, type DartFiling } from "../dart/list-filings";
import { buildTrackRecord, type ParsedResultReport } from "./build";
import { classifyFilings } from "./filings";
import { parseIssuanceResult } from "./issuance-result";
import type { TrackRecord } from "./schema";

export const TRACK_RECORD_WINDOW_FROM = "20240101";

export interface CollectTrackRecordInput {
  readonly issuerKey: string;
  readonly corpCode: string;
  readonly apiKey: string;
  readonly loadDocumentXml: (rcpNo: string) => Promise<string>;
  readonly fromYmd?: string;
  readonly now?: Date;
  readonly fetchImpl?: typeof fetch;
}

export interface CollectTrackRecordResult {
  readonly record: TrackRecord;
  readonly filings: readonly DartFiling[];
  readonly documentFetchCount: number;
}

export const collectTrackRecord = async (
  input: CollectTrackRecordInput,
): Promise<CollectTrackRecordResult> => {
  const fromYmd = input.fromYmd ?? TRACK_RECORD_WINDOW_FROM;
  const throughYmd = toKstYmd(input.now ?? new Date());

  const filings = await listFilings(
    { corpCode: input.corpCode, bgnDe: fromYmd, endDe: throughYmd },
    input.apiKey,
    input.fetchImpl ?? fetch,
  );

  const classified = classifyFilings(filings);
  const resultReports: ParsedResultReport[] = [];
  const notes: string[] = [];

  for (const filing of classified.latestResultFilings) {
    const xml = await input.loadDocumentXml(filing.rcpNo);
    const series = parseIssuanceResult(xml);
    if (series.length === 0) {
      notes.push(
        `증권발행실적보고서 ${filing.rcpNo}에서 청약·배정 표를 읽지 못해 회차 집계에서 빠졌습니다.`,
      );
      continue;
    }
    resultReports.push({ filing, series });
  }

  if (classified.latestResultFilings.length === 0) {
    notes.push(
      "조회 기간 안에 증권발행실적보고서가 없어 청약 결과는 집계하지 못했습니다.",
    );
  }

  return {
    record: buildTrackRecord({
      issuerKey: input.issuerKey,
      collectedAt: (input.now ?? new Date()).toISOString(),
      fromYmd,
      throughYmd,
      filings,
      resultReports,
      notes,
    }),
    filings,
    documentFetchCount: classified.latestResultFilings.length,
  };
};
