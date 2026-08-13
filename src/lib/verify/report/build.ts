import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { offerDataDir } from "../paths";
import type {
  DocumentRef,
  Judgement,
  PricePlacement,
  UnjudgedClaim,
  VerifyReport,
} from "../types";
import { rollupBySubject, summarizeVerdicts } from "../types";

export interface BuildReportInput {
  readonly document: DocumentRef;
  readonly generatedAt: string;
  readonly mode: "fake" | "live";
  readonly sources: readonly string[];
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly pricePlacements?: readonly PricePlacement[];
  readonly notes: readonly string[];
}

export const buildReport = (input: BuildReportInput): VerifyReport => ({
  offerId: input.document.offerId,
  document: input.document,
  generatedAt: input.generatedAt,
  mode: input.mode,
  sources: input.sources,
  summary: summarizeVerdicts(input.judgements),
  bySubject: rollupBySubject(input.judgements),
  judgements: input.judgements,
  unjudged: input.unjudged,
  pricePlacements: input.pricePlacements ?? [],
  notes: input.notes,
});

export const reportFileName = (generatedAt: string): string =>
  `report-${generatedAt.replace(/[:.]/g, "-")}.json`;

export const reportDir = (offerId: string, dataDir = "data"): string =>
  offerDataDir("reports", offerId, dataDir);

export const writeReport = async (
  report: VerifyReport,
  dataDir = "data",
): Promise<string> => {
  const dir = reportDir(report.offerId, dataDir);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, reportFileName(report.generatedAt));
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return file;
};
