import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { isEnoent, ioErrorMessage } from "../adapters/io-errors";
import { assertOfferId } from "../paths";

const filingFactSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  section: z.string().min(1),
  short: z.string().min(1).optional(),
});

const filingFactsSchema = z.object({
  schemaVersion: z.literal(1),
  offerId: z.string().min(1),
  rcpNo: z.string().regex(/^\d{14}$/),
  submittedOn: z.string().regex(/^\d{8}$/),
  facts: z.array(filingFactSchema).min(1),
});

export type FilingFact = z.infer<typeof filingFactSchema>;

export type FilingFacts = z.infer<typeof filingFactsSchema>;

export const filingFactsPath = (offerId: string, dataDir = "data"): string =>
  path.resolve(dataDir, "offers", "filing-facts", `${assertOfferId(offerId)}.json`);

export const parseFilingFacts = (value: unknown): FilingFacts =>
  filingFactsSchema.parse(value);

export const loadFilingFacts = async (
  offerId: string,
  dataDir = "data",
): Promise<FilingFacts | null> => {
  let raw: string;
  try {
    raw = await readFile(filingFactsPath(offerId, dataDir), "utf8");
  } catch (error) {
    if (!isEnoent(error)) {
      console.error(
        `[filing-facts] ${offerId} 읽기 실패: ${ioErrorMessage(error)}`,
      );
    }
    return null;
  }
  try {
    const parsed = parseFilingFacts(JSON.parse(raw));
    if (parsed.offerId !== offerId) {
      console.warn(
        `[filing-facts] ${offerId} offerId 불일치(${parsed.offerId}) — 건너뜀`,
      );
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(
      `[filing-facts] ${offerId} 파싱·스키마 실패 — 건너뜀: ${ioErrorMessage(error)}`,
    );
    return null;
  }
};
