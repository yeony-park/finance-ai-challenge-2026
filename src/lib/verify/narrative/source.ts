import { toPublicReport } from "../report/public-report";
import { residualTokensOf, scrubResidualJson } from "../report/residual";
import type {
  PricePlacementRecord,
  RealEstatePlacementRecord,
  ReportSnapshot,
} from "../report/snapshot";
import { VERDICT_LABEL } from "../report/view-model/labels";
import type { Verdict } from "../types";

const MAX_FLAGGED = 5;
const MAX_POSITIONS = 4;
const MAX_NOTES = 6;

const PRICE_BASIS_LIVESTOCK =
  "취득원가는 생체 매입가이고 경락가는 도축 후 도체 낙찰가라 단위가 달라 같은 값으로 견주지 않았습니다. 이 표시는 위치이며 적정성 판단이 아닙니다.";

const PRICE_BASIS_REAL_ESTATE =
  "면적 보정 없는 거래 총액 기준 위치이며 적정성 판단이 아닙니다.";

const AMENDMENT_WATCH_NOTE =
  "정정신고서를 자동으로 다시 대조하는 감시는 아직 연결되지 않았습니다.";

const VERSION_MEANING =
  "이 공모의 리포트가 보관된 개수이며, 공시가 정정된 횟수가 아닙니다.";

const GRADING_MEANING =
  "경락가 평균을 낸 등급판정 두수(시장 표본 크기)이며, 이 공모의 개체 수가 아닙니다.";

const VS_OFFER_AVERAGE_MEANING =
  "같은 공모 안에서 위치를 제시한 개체들의 평균 취득원가 대비 편차이며, 시장 경락가 대비 편차가 아닙니다.";

const PLACED_COUNT_MEANING_LIVESTOCK =
  "시장 데이터 위에 위치를 표시한 개체 수입니다.";

const ORIGIN_MEANING: Readonly<Record<"issuer" | "market", string>> = {
  issuer: "공모 시점에 발행사가 제시한 예상 금액입니다.",
  market:
    "매각 공시에 기재된 실제 거래 금액입니다. 이 금액이 실거래 원장에서 확인됐다는 뜻은 아닙니다.",
};

export interface FlaggedItemDigest {
  readonly subject: string;
  readonly field: string;
  readonly verdictLabel: string;
  readonly rationale: string;
  readonly observed: string;
}

export interface UnjudgedDigest {
  readonly field: string;
  readonly reason: string;
  readonly count: number;
}

export interface LivestockPriceDigest {
  readonly kind: "livestock";
  readonly placedCount: number;
  readonly placedCountMeaning: string;
  readonly unplacedCount: number;
  readonly claimedPerHeadWon: {
    readonly min: number;
    readonly max: number;
    readonly average: number;
  } | null;
  readonly vsOfferAveragePercent: {
    readonly min: number;
    readonly max: number;
    readonly meaning: string;
  } | null;
  readonly reference: {
    readonly month: string;
    readonly breedName: string;
    readonly sexName: string;
    readonly averagePricePerKg: number;
    readonly gradingHeadCount: number;
    readonly gradingHeadCountMeaning: string;
    readonly thinSample: boolean;
  } | null;
  readonly basis: string;
}

export interface RealEstatePositionDigest {
  readonly label: string;
  readonly originLabel: string;
  readonly originMeaning: string;
  readonly amountWon: number;
  readonly comparableCount: number;
  readonly windowMonths: readonly string[];
  readonly topPercent: number | null;
  readonly medianAmountWon: number | null;
}

export interface RealEstatePriceDigest {
  readonly kind: "real-estate";
  readonly unplacedCount: number;
  readonly positions: readonly RealEstatePositionDigest[];
  readonly basis: string;
}

export type PriceDigest = LivestockPriceDigest | RealEstatePriceDigest;

export interface NarrativeDigest {
  readonly offerId: string;
  readonly assetKind: ReportSnapshot["assetKind"];
  readonly submittedOn: string;
  readonly reportGeneratedAt: string;
  readonly mode: ReportSnapshot["mode"];
  readonly sources: readonly string[];
  readonly reality: {
    readonly subjectLevel: VerdictTally;
    readonly itemLevel: VerdictTally;
    readonly flagged: readonly FlaggedItemDigest[];
    readonly unjudged: readonly UnjudgedDigest[];
  };
  readonly price: PriceDigest;
  readonly history: {
    readonly documentBasis: string;
    readonly storedReportVersions: number;
    readonly storedReportVersionsMeaning: string;
    readonly engineNotes: readonly string[];
    readonly amendmentWatch: string;
  };
}

export interface VerdictTally {
  readonly 합계: number;
  readonly 일치: number;
  readonly "원장 미확인": number;
  readonly "대조 불가": number;
}

const tallyOf = (verdicts: readonly Verdict[]): VerdictTally => ({
  합계: verdicts.length,
  일치: verdicts.filter((verdict) => verdict === "match").length,
  "원장 미확인": verdicts.filter((verdict) => verdict === "mismatch").length,
  "대조 불가": verdicts.filter((verdict) => verdict === "unverifiable").length,
});

const flaggedOf = (report: ReportSnapshot): readonly FlaggedItemDigest[] =>
  report.judgements
    .filter((judgement) => judgement.verdict !== "match")
    .slice(0, MAX_FLAGGED)
    .map((judgement) => ({
      subject: judgement.claim.subject,
      field: judgement.claim.field,
      verdictLabel: VERDICT_LABEL[judgement.verdict],
      rationale: judgement.rationale,
      observed: judgement.evidence[0]?.observed ?? "",
    }));

const unjudgedOf = (report: ReportSnapshot): readonly UnjudgedDigest[] => {
  const grouped = new Map<string, UnjudgedDigest>();
  for (const item of report.unjudged) {
    const key = `${item.claim.field}|${item.reason}`;
    const found = grouped.get(key);
    grouped.set(key, {
      field: item.claim.field,
      reason: item.reason,
      count: (found?.count ?? 0) + 1,
    });
  }
  return [...grouped.values()];
};

const round1 = (value: number): number => Math.round(value * 10) / 10;


const livestockPrice = (
  placements: readonly PricePlacementRecord[],
  unplacedCount: number,
): LivestockPriceDigest => {
  const first = placements[0];
  const prices = placements.map((placement) => placement.claimedPerHead);
  const spread = placements.map((placement) => placement.vsOfferAveragePercent);

  return {
    kind: "livestock",
    placedCount: placements.length,
    placedCountMeaning: PLACED_COUNT_MEANING_LIVESTOCK,
    unplacedCount,
    claimedPerHeadWon:
      prices.length === 0
        ? null
        : {
            min: Math.min(...prices),
            max: Math.max(...prices),
            average: Math.round(
              prices.reduce((acc, value) => acc + value, 0) / prices.length,
            ),
          },
    vsOfferAveragePercent:
      spread.length === 0
        ? null
        : {
            min: round1(Math.min(...spread)),
            max: round1(Math.max(...spread)),
            meaning: VS_OFFER_AVERAGE_MEANING,
          },
    reference: first
      ? {
          month: first.referenceMonth,
          breedName: first.breedName,
          sexName: first.sexName,
          averagePricePerKg: Math.round(first.averagePricePerKg),
          gradingHeadCount: first.sampleSize,
          gradingHeadCountMeaning: GRADING_MEANING,
          thinSample: placements.some((placement) => placement.thinSample),
        }
      : null,
    basis: PRICE_BASIS_LIVESTOCK,
  };
};

const realEstatePrice = (
  placements: readonly RealEstatePlacementRecord[],
  unplacedCount: number,
): RealEstatePriceDigest => ({
  kind: "real-estate",
  unplacedCount,
  positions: placements.slice(0, MAX_POSITIONS).map((placement) => ({
    label: placement.label,
    originLabel: placement.originLabel,
    originMeaning: ORIGIN_MEANING[placement.origin],
    amountWon: placement.amountWon,
    comparableCount: placement.comparableCount,
    windowMonths: placement.windowMonths,
    topPercent: placement.topPercent ?? null,
    medianAmountWon: placement.medianAmountWon ?? null,
  })),
  basis: PRICE_BASIS_REAL_ESTATE,
});

const priceDigestOf = (report: ReportSnapshot): PriceDigest => {
  const isRealEstate = report.assetKind === "real-estate";
  const priceKinds = isRealEstate
    ? ["offer_amount", "sale_amount"]
    : ["acquisition_price"];
  const unplacedCount = report.unjudged.filter((item) =>
    priceKinds.includes(item.claim.kind),
  ).length;

  return isRealEstate
    ? realEstatePrice(report.realEstatePlacements, unplacedCount)
    : livestockPrice(report.pricePlacements, unplacedCount);
};

const buildDigest = (
  report: ReportSnapshot,
  versionCount: number,
): NarrativeDigest => {
  const isRealEstate = report.assetKind === "real-estate";

  return {
    offerId: report.offerId,
    assetKind: report.assetKind,
    submittedOn: report.document.submittedOn,
    reportGeneratedAt: report.generatedAt,
    mode: report.mode,
    sources: report.sources,
    reality: {
      subjectLevel: tallyOf(report.bySubject.map((head) => head.verdict)),
      itemLevel: tallyOf(
        report.judgements.map((judgement) => judgement.verdict),
      ),
      flagged: flaggedOf(report),
      unjudged: unjudgedOf(report),
    },
    price: priceDigestOf(report),
    history: {
      documentBasis: isRealEstate
        ? `공모 공고·매각 공시(${report.document.submittedOn} 기준)`
        : `증권신고서 ${report.document.submittedOn} 제출본`,
      storedReportVersions: versionCount,
      storedReportVersionsMeaning: VERSION_MEANING,
      engineNotes: report.notes.slice(0, MAX_NOTES),
      amendmentWatch: AMENDMENT_WATCH_NOTE,
    },
  };
};

export const buildNarrativeDigest = (
  input: ReportSnapshot,
  versionCount: number,
): NarrativeDigest =>
  scrubResidualJson(
    buildDigest(toPublicReport(input), versionCount),
    residualTokensOf(input),
  );
