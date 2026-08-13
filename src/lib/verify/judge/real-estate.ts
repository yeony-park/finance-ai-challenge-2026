import {
  THIN_COMPARABLE_THRESHOLD,
  monthOf,
  monthsBefore,
  rtmsQueryUrl,
  toComparable,
  type RtmsTrade,
  type RtmsTradeAdapter,
  type RtmsWindow,
} from "../adapters/rtms-trade";
import type { RealEstateOffer } from "../claims/real-estate";
import type {
  AmountOrigin,
  Claim,
  Evidence,
  Judgement,
  RealEstateComparable,
  RealEstatePlacement,
  UnjudgedClaim,
} from "../types";
import { createJudgement } from "../types";

export const COMPARABLE_WINDOW_MONTHS = 3;

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

const eok = (value: number): string =>
  `${(Math.round((value / 100_000_000) * 100) / 100).toLocaleString("ko-KR")}억원`;

const dealLabel = (trade: RtmsTrade): string =>
  [
    `${trade.dealOn} ${trade.dong} ${trade.buildingUse || trade.buildingType}`,
    trade.floor === undefined ? "" : `${trade.floor}층`,
    trade.buildingAreaSqm === undefined ? "" : `${trade.buildingAreaSqm}㎡`,
    eok(trade.amountWon),
  ]
    .filter((part) => part.length > 0)
    .join(" · ");

const windowLabel = (window: RtmsWindow): string =>
  `${window.months[0]}~${window.months.at(-1)}`;

const queryUrlOf = (adapter: RtmsTradeAdapter, window: RtmsWindow): string =>
  rtmsQueryUrl({
    lawdCd: adapter.lawdCd,
    dealYmd: (window.months.at(-1) ?? "").replace("-", ""),
    numOfRows: 1000,
    pageNo: 1,
  });

interface LedgerLookup {
  readonly window: RtmsWindow;
  readonly month: string;
  readonly monthTrades: readonly RtmsTrade[];
  readonly exact: RtmsTrade | undefined;
  readonly sameAmount: RtmsTrade | undefined;
}

const lookupLedger = (
  offer: RealEstateOffer,
  adapter: RtmsTradeAdapter,
): LedgerLookup => {
  const month = monthOf(offer.sale.dealOn);
  const window = adapter.window({
    months: monthsBefore(month, COMPARABLE_WINDOW_MONTHS),
    dong: offer.asset.dong,
  });
  const monthTrades = window.trades.filter(
    (trade) => monthOf(trade.dealOn) === month,
  );
  const sameAmount = monthTrades.find(
    (trade) => trade.amountWon === offer.sale.amountWon,
  );
  const exact =
    sameAmount && sameAmount.dealOn === offer.sale.dealOn ? sameAmount : undefined;
  return { window, month, monthTrades, exact, sameAmount };
};

const ledgerEvidence = (
  claim: Claim,
  adapter: RtmsTradeAdapter,
  lookup: LedgerLookup,
  observed: string,
  stance: Evidence["stance"],
): Evidence => ({
  sourceId: adapter.sourceId,
  sourceName: adapter.sourceName,
  url: queryUrlOf(adapter, lookup.window),
  observedAt: lookup.window.collectedAt,
  field: claim.field,
  claimed: claim.value,
  observed,
  stance,
  note: `${adapter.sigunguName} ${lookup.window.dong} · ${lookup.month} 신고 ${lookup.monthTrades.length}건 대조`,
});

const judgeSaleAmount = (
  claim: Claim,
  adapter: RtmsTradeAdapter,
  lookup: LedgerLookup,
): Judgement => {
  const found = lookup.sameAmount;
  if (found) {
    return createJudgement({
      claim,
      verdict: "match",
      evidence: [
        ledgerEvidence(claim, adapter, lookup, dealLabel(found), "supports"),
      ],
      rationale: `공시된 매각금액과 같은 금액의 상업업무용 매매 신고가 ${lookup.month} 같은 법정동에 있습니다`,
    });
  }
  return createJudgement({
    claim,
    verdict: "mismatch",
    evidence: [
      ledgerEvidence(
        claim,
        adapter,
        lookup,
        `${lookup.month} 같은 법정동 상업업무용 신고 ${lookup.monthTrades.length}건 가운데 같은 금액의 거래가 없습니다`,
        "contradicts",
      ),
    ],
    rationale:
      "공시된 매각금액과 같은 금액의 매매 신고가 해당 월 실거래 원장에서 확인되지 않았습니다",
  });
};

const judgeSaleDate = (
  claim: Claim,
  adapter: RtmsTradeAdapter,
  lookup: LedgerLookup,
): Judgement => {
  if (lookup.exact) {
    return createJudgement({
      claim,
      verdict: "match",
      evidence: [
        ledgerEvidence(claim, adapter, lookup, dealLabel(lookup.exact), "supports"),
      ],
      rationale: "공시된 매각일과 실거래 신고의 계약일이 같습니다",
    });
  }
  if (lookup.sameAmount) {
    return createJudgement({
      claim,
      verdict: "mismatch",
      evidence: [
        ledgerEvidence(
          claim,
          adapter,
          lookup,
          dealLabel(lookup.sameAmount),
          "contradicts",
        ),
      ],
      rationale:
        "같은 금액의 신고는 있으나 계약일이 공시된 매각일과 달라 같은 거래로 확정하지 못했습니다",
    });
  }
  return createJudgement({
    claim,
    verdict: "mismatch",
    evidence: [
      ledgerEvidence(
        claim,
        adapter,
        lookup,
        `${lookup.month} 같은 법정동 상업업무용 신고 ${lookup.monthTrades.length}건 가운데 대응하는 거래가 없습니다`,
        "contradicts",
      ),
    ],
    rationale: "공시된 매각일의 매매 신고가 실거래 원장에서 확인되지 않았습니다",
  });
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

interface PlacementInput {
  readonly claim: Claim;
  readonly label: string;
  readonly origin: AmountOrigin;
  readonly amountWon: number;
  readonly window: RtmsWindow;
}

const ORIGIN_LABEL: Record<AmountOrigin, string> = {
  issuer: "발행사 제시(예상값)",
  market: "실거래 확정(실제값)",
};

const statementOf = (
  placement: Omit<RealEstatePlacement, "statement" | "evidence">,
): string => {
  const head = `${placement.originLabel} ${placement.label} ${eok(placement.amountWon)}`;
  const group = `같은 법정동·같은 유형(상업업무용) 실거래 신고 비교군 ${placement.comparableCount}건(${placement.windowMonths[0]}~${placement.windowMonths.at(-1)})`;

  if (placement.topPercent === undefined) {
    return `${head} · ${group} · 비교군이 ${THIN_COMPARABLE_THRESHOLD}건 미만이라 백분위를 내지 않고 건수만 적습니다. 이 표시는 위치이며 적정성 판단이 아닙니다.`;
  }

  return [
    head,
    group,
    `금액 기준 위에서 ${placement.rankFromTop}번째(상위 ${placement.topPercent}%)`,
    `비교군 중위값 ${eok(placement.medianAmountWon ?? 0)} · 범위 ${eok(placement.minAmountWon ?? 0)}~${eok(placement.maxAmountWon ?? 0)}`,
    "면적 보정 없는 거래 총액 기준. 이 표시는 위치이며 적정성 판단이 아닙니다.",
  ].join(" · ");
};

const buildPlacement = (
  input: PlacementInput,
  adapter: RtmsTradeAdapter,
): RealEstatePlacement => {
  const comparables: readonly RealEstateComparable[] =
    input.window.trades.map(toComparable);
  const amounts = comparables.map((item) => item.amountWon);
  const thinSample = comparables.length < THIN_COMPARABLE_THRESHOLD;
  const rankFromTop = amounts.filter((value) => value >= input.amountWon).length;

  const base: Omit<RealEstatePlacement, "statement" | "evidence"> = {
    claim: input.claim,
    label: input.label,
    origin: input.origin,
    originLabel: ORIGIN_LABEL[input.origin],
    amountWon: input.amountWon,
    regionLabel: `${adapter.sigunguName} ${input.window.dong}`,
    windowMonths: input.window.months,
    comparableCount: comparables.length,
    thinSample,
    ...(thinSample
      ? {}
      : {
          medianAmountWon: median(amounts),
          minAmountWon: Math.min(...amounts),
          maxAmountWon: Math.max(...amounts),
          rankFromTop,
          topPercent: Math.round((rankFromTop / comparables.length) * 100),
        }),
    comparables,
  };

  return {
    ...base,
    evidence: [
      {
        sourceId: adapter.sourceId,
        sourceName: adapter.sourceName,
        url: queryUrlOf(adapter, input.window),
        observedAt: input.window.collectedAt,
        field: input.claim.field,
        claimed: won(input.amountWon),
        observed: `${windowLabel(input.window)} ${adapter.sigunguName} ${input.window.dong} 상업업무용 매매 신고 ${comparables.length}건`,
        stance: "context",
        note: thinSample
          ? `비교군 ${comparables.length}건 — ${THIN_COMPARABLE_THRESHOLD}건 미만이라 백분위 미산출`
          : `비교군 ${comparables.length}건 · 면적 보정 없는 거래 총액 기준`,
      },
    ],
    statement: statementOf(base),
  };
};

export interface RealEstateJudgeInput {
  readonly offer: RealEstateOffer;
  readonly claims: readonly Claim[];
  readonly trades: RtmsTradeAdapter;
}

export interface RealEstateJudgeOutcome {
  readonly judgements: readonly Judgement[];
  readonly unjudged: readonly UnjudgedClaim[];
  readonly placements: readonly RealEstatePlacement[];
  readonly notes: readonly string[];
}

const missingMonthsReason = (window: RtmsWindow): string | undefined =>
  window.missingMonths.length === 0
    ? undefined
    : `실거래 신고 수집본에 ${window.missingMonths.join(", ")}가 없어 비교군을 채울 수 없습니다`;

export const judgeRealEstate = (
  input: RealEstateJudgeInput,
): RealEstateJudgeOutcome => {
  const { offer, claims, trades } = input;
  const claimOf = (kind: Claim["kind"]): Claim | undefined =>
    claims.find((claim) => claim.kind === kind);

  const judgements: Judgement[] = [];
  const unjudged: UnjudgedClaim[] = [];
  const placements: RealEstatePlacement[] = [];
  const notes: string[] = [];

  const lookup = lookupLedger(offer, trades);
  const ledgerBlocked =
    lookup.window.missingMonths.includes(lookup.month) ||
    lookup.window.collectedAt === "";

  for (const claim of claims) {
    if (claim.verifiability !== "verifiable") {
      unjudged.push({
        claim,
        reason: `${claim.demotionReason ?? "사유 미상"}(대조 불가)`,
      });
      continue;
    }

    if (claim.kind === "sale_amount" || claim.kind === "sale_date") {
      if (ledgerBlocked) {
        unjudged.push({
          claim,
          reason: `${lookup.month} 같은 법정동 실거래 신고가 수집되지 않아 원장 대조를 하지 못했습니다(대조 불가).`,
        });
        continue;
      }
      judgements.push(
        claim.kind === "sale_amount"
          ? judgeSaleAmount(claim, trades, lookup)
          : judgeSaleDate(claim, trades, lookup),
      );
    }
  }

  const offerClaim = claimOf("offer_amount");
  if (offerClaim && offerClaim.verifiability === "verifiable") {
    const offerWindow = trades.window({
      months: monthsBefore(monthOf(offer.offer.closesOn), COMPARABLE_WINDOW_MONTHS),
      dong: offer.asset.dong,
    });
    const blocked = missingMonthsReason(offerWindow);
    if (offerWindow.trades.length === 0) {
      unjudged.push({
        claim: offerClaim,
        reason: `${blocked ?? `${windowLabel(offerWindow)} 같은 법정동 상업업무용 실거래 신고가 없어 비교군을 만들지 못했습니다`}(대조 불가).`,
      });
    } else {
      if (blocked) notes.push(`${blocked} — 공모 시점 비교군은 남은 달로만 만들었습니다.`);
      placements.push(
        buildPlacement(
          {
            claim: offerClaim,
            label: "공모금액",
            origin: "issuer",
            amountWon: offerClaim.numericValue ?? offer.offer.amountWon,
            window: offerWindow,
          },
          trades,
        ),
      );
    }
  }

  const saleClaim = claimOf("sale_amount");
  if (saleClaim && saleClaim.verifiability === "verifiable") {
    const blocked = missingMonthsReason(lookup.window);
    if (lookup.window.trades.length === 0) {
      unjudged.push({
        claim: saleClaim,
        reason: `${blocked ?? `${windowLabel(lookup.window)} 같은 법정동 상업업무용 실거래 신고가 없어 비교군을 만들지 못했습니다`}(대조 불가).`,
      });
    } else {
      if (blocked) notes.push(`${blocked} — 매각 시점 비교군은 남은 달로만 만들었습니다.`);
      placements.push(
        buildPlacement(
          {
            claim: saleClaim,
            label: "매각금액",
            origin: "market",
            amountWon: saleClaim.numericValue ?? offer.sale.amountWon,
            window: lookup.window,
          },
          trades,
        ),
      );
    }
  }

  return { judgements, unjudged, placements, notes };
};
