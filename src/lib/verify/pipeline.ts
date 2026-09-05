import { runExtraction, type ExtractionMode } from "./claims/extract";
import type { ClaimExtractionClient } from "./claims/llm-client";
import {
  buildRealEstateClaims,
  realEstateDocumentRef,
  realEstateReportMetadataOf,
  type RealEstateOffer,
} from "./claims/real-estate";
import { judgeClaims } from "./judge/engine";
import { judgeRealEstate } from "./judge/real-estate";
import { buildReport } from "./report/build";
import { submittedOnFromRcpNo, type DocumentRef, type VerifyReport } from "./types";
import type { LivestockTraceAdapter } from "./adapters/livestock-trace";
import type { AuctionPriceAdapter } from "./adapters/auction-price";
import type {
  BuildingHubCacheLookup,
  BuildingRegisterAdapter,
} from "./adapters/building-register";
import type { RtmsTradeAdapter } from "./adapters/rtms-trade";
import { activeRcpNoForProduct } from "./dart/onboarding-catalog";
import { CATTLE_RCP_NO_TO_OFFER } from "./dart/cattle-rcp-candidates";

export { CATTLE_RCP_NO_TO_OFFER } from "./dart/cattle-rcp-candidates";

export const offerIdForRcpNo = (rcpNo: string): string | undefined =>
  CATTLE_RCP_NO_TO_OFFER[rcpNo];

export const resolveOfferId = (rcpNo: string): string => {
  const offerId = offerIdForRcpNo(rcpNo);
  if (!offerId) throw new Error(`승인된 상품 매핑이 없는 RCP입니다: ${rcpNo}`);
  return offerId;
};

export const rcpNoForOffer = (offerId: string): string | undefined =>
  activeRcpNoForProduct("cattle", offerId);

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
  readonly notes?: readonly string[];
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
    assetKind: "livestock",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: input.trace.name === "fake" ? "fake" : "live",
    sources: [
      input.trace.sourceName,
      ...(input.auction ? [input.auction.sourceName] : []),
    ],
    judgements: outcome.judgements,
    unjudged: outcome.unjudged,
    pricePlacements: outcome.pricePlacements,
    notes: [
      ...(input.notes ?? []),
      `추출 모드: ${extraction.mode}`,
      ...extraction.notes,
      ...demotionNotes,
    ],
  });
};

export interface RealEstateVerifyInput {
  readonly offer: RealEstateOffer;
  readonly trades: RtmsTradeAdapter;
  readonly buildingHub?: BuildingHubCacheLookup;
  readonly register?: BuildingRegisterAdapter;
  readonly generatedAt?: string;
}

export const runRealEstateVerification = (
  input: RealEstateVerifyInput,
): VerifyReport => {
  const document = realEstateDocumentRef(input.offer);
  const extraction = buildRealEstateClaims(input.offer);
  const register =
    input.register === undefined
      ? undefined
      : input.register.name === "cache" || input.trades.name === "fake"
        ? input.register
        : undefined;
  const outcome = judgeRealEstate({
    offer: input.offer,
    claims: extraction.claims,
    trades: input.trades,
    buildingHub: input.buildingHub,
    ...(register === undefined ? {} : { register }),
  });

  const modeNote =
    input.trades.name === "fake"
      ? [
          "국토부 실거래가 API 활용신청이 승인되지 않아 실호출이 거부됐습니다(등록되지 않은 서비스키 · returnReasonCode=30). 이 리포트의 비교군과 원장 대조는 픽스처로 실행한 것이며 실측 데이터가 아닙니다.",
        ]
      : [];
  const registerNote =
    register !== undefined && register.name === "fake"
      ? [
          "건축물대장 표제부 대조는 픽스처로 실행한 것이며 실측 데이터가 아닙니다.",
        ]
      : [];

  return buildReport({
    document,
    assetKind: "real-estate",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: input.trades.name === "fake" ? "fake" : "live",
    sources: [
      input.trades.sourceName,
      ...(input.buildingHub?.cache
        ? [input.buildingHub.cache.sourceName]
        : []),
      ...(register === undefined ? [] : [register.sourceName]),
    ],
    judgements: outcome.judgements,
    unjudged: outcome.unjudged,
    realEstatePlacements: outcome.placements,
    realEstate: realEstateReportMetadataOf(input.offer),
    notes: [...modeNote, ...registerNote, ...extraction.notes, ...outcome.notes],
  });
};
