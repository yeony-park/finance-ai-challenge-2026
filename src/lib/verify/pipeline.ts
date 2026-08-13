import { runExtraction, type ExtractionMode } from "./claims/extract";
import type { ClaimExtractionClient } from "./claims/llm-client";
import { judgeClaims } from "./judge/engine";
import { buildReport } from "./report/build";
import { submittedOnFromRcpNo, type DocumentRef, type VerifyReport } from "./types";
import type { LivestockTraceAdapter } from "./adapters/livestock-trace";
import type { AuctionPriceAdapter } from "./adapters/auction-price";

const OFFER_REGISTRY: Readonly<Record<string, string>> = {
  "20260806000159": "livestock-9",
};

export const resolveOfferId = (rcpNo: string): string =>
  OFFER_REGISTRY[rcpNo] ?? `offer-${rcpNo}`;

export const rcpNoForOffer = (offerId: string): string | undefined =>
  Object.keys(OFFER_REGISTRY).find((rcpNo) => OFFER_REGISTRY[rcpNo] === offerId);

export const documentRefOf = (rcpNo: string): DocumentRef => ({
  offerId: resolveOfferId(rcpNo),
  rcpNo,
  submittedOn: submittedOnFromRcpNo(rcpNo),
});

export interface VerifyInput {
  readonly rcpNo: string;
  readonly xml: string;
  readonly trace: LivestockTraceAdapter;
  readonly auction?: AuctionPriceAdapter;
  readonly generatedAt?: string;
  readonly extractionMode?: ExtractionMode;
  readonly extractor?: ClaimExtractionClient;
}

export const runVerification = async (
  input: VerifyInput,
): Promise<VerifyReport> => {
  const document = documentRefOf(input.rcpNo);
  const extraction = await runExtraction(input.xml, document, {
    ...(input.extractionMode === undefined
      ? {}
      : { mode: input.extractionMode }),
    ...(input.extractor === undefined ? {} : { extractor: input.extractor }),
  });
  const outcome = await judgeClaims(extraction.claims, {
    trace: input.trace,
    ...(input.auction === undefined ? {} : { auction: input.auction }),
  });

  const demotionNotes = extraction.demotions.map(
    (demotion) => `대조 불가 강등: ${demotion.claimId} — ${demotion.reason}`,
  );

  return buildReport({
    document,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: input.trace.name === "fake" ? "fake" : "live",
    sources: [
      input.trace.sourceName,
      ...(input.auction ? [input.auction.sourceName] : []),
    ],
    judgements: outcome.judgements,
    unjudged: outcome.unjudged,
    pricePlacements: outcome.pricePlacements,
    notes: [`추출 모드: ${extraction.mode}`, ...extraction.notes, ...demotionNotes],
  });
};
