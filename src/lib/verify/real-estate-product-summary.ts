import {
  loadRealEstateOffer,
  type RealEstateOffer,
} from "./claims/real-estate";
import type { RealEstateSourceKind } from "./types";

export interface ProductSource {
  readonly label: string;
  readonly url: string;
  readonly asOf: string;
}

export interface ProductStatusSource extends ProductSource {
  readonly sourceKind: RealEstateSourceKind;
}

export interface ProductCheck {
  readonly status: "confirmed" | "unconfirmed";
  readonly value?: string;
  readonly note: string;
  readonly source?: ProductSource;
}

export interface RealEstateProductSummary {
  readonly offerId: string;
  readonly publicName: string;
  readonly platform?: { readonly label: string; readonly source: ProductSource };
  readonly offer: {
    readonly amountWon: number;
    readonly unitPriceWon: number;
    readonly unitCount: number;
  };
  readonly subscription: { readonly opensOn: string; readonly closesOn: string };
  readonly listedOn: string;
  readonly lifecycle: RealEstateOffer["assetLifecycle"];
  readonly tradabilityStatus: RealEstateOffer["tradabilityStatus"];
  readonly statusEvidence?: {
    readonly tradabilityStatus?: ProductStatusSource;
  };
  readonly sale?: {
    readonly amountWon: number;
    readonly dealOn: string;
    readonly dateLabel: "매각일" | "정리매매 종료일" | "매각대금 지급일";
    readonly source?: ProductSource;
  };
  readonly limitations: readonly string[];
  readonly tradingFee: ProductCheck & { readonly ratePercent?: number };
  readonly totalExpenseRates: readonly {
    readonly fundClass: string;
    readonly ratePercent: number;
    readonly source: ProductSource;
  }[];
  readonly frontEndSalesFeeRates: readonly {
    readonly fundClass: string;
    readonly ratePercent: number;
    readonly source: ProductSource;
  }[];
  readonly latestActualDistribution?: {
    readonly period: number;
    readonly totalAmountWon: number;
    readonly totalUnits: number;
    readonly sourceAmountPerUnitWon: number;
    readonly simpleCalculatedAmountPerUnitWon: number;
    readonly consistencyStatus: "consistent" | "inconsistent" | "not_checked";
    readonly warning: string;
    readonly operatingFrom: string;
    readonly operatingTo: string;
    readonly operatingDays: number;
    readonly paidOn: string;
    readonly source: ProductSource;
  };
  readonly expectedDistributionRate: ProductCheck;
  readonly contractualDistributionCycle: ProductCheck;
  readonly trustPeriod: ProductCheck;
  readonly saleLiquidationCondition: ProductCheck;
}

const MISSING = "미확인/투자설명서·규약 PDF 본문 확인 필요";

const unconfirmed = (): ProductCheck => ({ status: "unconfirmed", note: MISSING });

const productSource = <T extends { readonly label: string; readonly url: string; readonly asOf: string }>(
  source: T,
): ProductSource => ({ label: source.label, url: source.url, asOf: source.asOf });

export const toRealEstateProductSummary = (
  offer: RealEstateOffer,
): RealEstateProductSummary => {
  const details = offer.schemaVersion === 2 ? offer.productSummary : undefined;
  const tradingFee = details?.tradingFee;
  const distribution = details?.latestActualDistribution;
  const saleSource = offer.sources.find(
    (source) => source.url === offer.sale?.source,
  );
  const tradabilitySource =
    offer.schemaVersion === 2
      ? offer.sources.find(
          (source) => source.url === offer.statusSources?.tradabilityStatus,
        )
      : undefined;
  return {
    offerId: offer.offerId,
    publicName: offer.publicAlias,
    ...(details === undefined
      ? {}
      : {
          platform: {
            label: details.platform.label,
            source: productSource(details.platform.source),
          },
        }),
    offer: {
      amountWon: offer.offer.amountWon,
      unitPriceWon: offer.offer.unitPriceWon,
      unitCount: offer.offer.unitCount,
    },
    subscription: { opensOn: offer.offer.opensOn, closesOn: offer.offer.closesOn },
    listedOn: offer.offer.listedOn,
    lifecycle: offer.assetLifecycle,
    tradabilityStatus: offer.tradabilityStatus,
    ...(tradabilitySource
      ? {
          statusEvidence: {
            tradabilityStatus: {
              ...productSource(tradabilitySource),
              sourceKind: tradabilitySource.sourceKind,
            },
          },
        }
      : {}),
    ...(offer.sale === undefined
      ? {}
      : {
          sale: {
            amountWon: offer.sale.amountWon,
            dealOn: offer.sale.dealOn,
            dateLabel: offer.sale.dateLabel ?? "매각일",
            ...(saleSource ? { source: productSource(saleSource) } : {}),
          },
        }),
    limitations: offer.limits,
    tradingFee:
      tradingFee === undefined
        ? unconfirmed()
        : {
            status: "confirmed",
            ratePercent: tradingFee.ratePercent,
            note: "플랫폼 거래수수료입니다. 펀드 총보수·선취판매수수료와 구분됩니다.",
            source: productSource(tradingFee.source),
          },
    totalExpenseRates: (details?.totalExpenseRates ?? []).map((fee) => ({
      fundClass: fee.fundClass,
      ratePercent: fee.ratePercent,
      source: productSource(fee.source),
    })),
    frontEndSalesFeeRates: (details?.frontEndSalesFeeRates ?? []).map((fee) => ({
      fundClass: fee.fundClass,
      ratePercent: fee.ratePercent,
      source: productSource(fee.source),
    })),
    ...(distribution === undefined
      ? {}
      : {
          latestActualDistribution: {
            ...distribution,
            source: productSource(distribution.source),
          },
        }),
    expectedDistributionRate: details?.expectedDistributionRate ?? unconfirmed(),
    contractualDistributionCycle: details?.contractualDistributionCycle ?? unconfirmed(),
    trustPeriod: details?.trustPeriod ?? unconfirmed(),
    saleLiquidationCondition: details?.saleLiquidationCondition ?? unconfirmed(),
  };
};

export const loadRealEstateProductSummary = async (
  offerId: string,
  dataDir = "data",
): Promise<RealEstateProductSummary> =>
  toRealEstateProductSummary(await loadRealEstateOffer(offerId, dataDir));
