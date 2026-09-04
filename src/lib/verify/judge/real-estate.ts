import {
  type BuildingHubCacheLookup,
  type BuildingRegisterAdapter,
  type BuildingRegisterTitle,
} from "../adapters/building-register";
import {
  THIN_COMPARABLE_THRESHOLD,
  monthOf,
  monthsBefore,
  rtmsQueryUrl,
  toComparable,
  type RtmsTradeAdapter,
  type RtmsWindow,
} from "../adapters/rtms-trade";
import type { RealEstateOffer } from "../claims/real-estate";
import type {
  AmountOrigin,
  Claim,
  Judgement,
  RealEstateComparable,
  RealEstatePlacement,
  UnjudgedClaim,
} from "../types";
import { createJudgement } from "../types";
import { judgeBuildingRegister } from "./real-estate-building";

export const COMPARABLE_WINDOW_MONTHS = 3;

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

const eok = (value: number): string =>
  `${(Math.round((value / 100_000_000) * 100) / 100).toLocaleString("ko-KR")}억원`;

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
}

const adjacentMonths = (month: string): readonly string[] => {
  const [year, monthNumber] = month.split("-").map(Number);
  return [-1, 0, 1].map((offset) => {
    const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};

const lookupLedger = (
  offer: RealEstateOffer,
  adapter: RtmsTradeAdapter,
): LedgerLookup => {
  if (!offer.sale) {
    throw new Error("매각 정보가 없는 상품은 매각 원장을 조회할 수 없습니다");
  }
  const sale = offer.sale;
  const month = monthOf(sale.dealOn);
  const around = adjacentMonths(month);
  const months = around.every((candidate) => adapter.months().includes(candidate))
    ? around
    : monthsBefore(month, COMPARABLE_WINDOW_MONTHS);
  const window = adapter.window({
    months,
    dong: offer.asset.dong,
  });
  return { window, month };
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
  readonly fingerprintNote?: string;
}

const ORIGIN_LABEL: Record<AmountOrigin, string> = {
  issuer: "발행사 제시(예상값)",
  market: "매각 자료 기재값",
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
        note: [
          thinSample
            ? `비교군 ${comparables.length}건 — ${THIN_COMPARABLE_THRESHOLD}건 미만이라 백분위 미산출`
            : `비교군 ${comparables.length}건 · 면적 보정 없는 거래 총액 기준`,
          input.fingerprintNote,
        ]
          .filter((note): note is string => note !== undefined)
          .join(" · "),
      },
    ],
    statement: statementOf(base),
  };
};

export interface RealEstateJudgeInput {
  readonly offer: RealEstateOffer;
  readonly claims: readonly Claim[];
  readonly trades: RtmsTradeAdapter;
  readonly buildingHub?: BuildingHubCacheLookup;
  readonly register?: BuildingRegisterAdapter;
}

const REGISTER_MISSING_REASON =
  "건축물대장 표제부 수집본이 없어 지번 단위 실재 대조를 하지 못했습니다(대조 불가).";

const REGISTER_NO_HIT_REASON =
  "건축물대장 표제부 수집본에서 해당 지번을 확인하지 못했습니다 — 수집이 부분적일 수 있어 판정하지 않습니다(대조 불가).";

const registerFactsOf = (title: BuildingRegisterTitle): string => {
  const parts = [
    title.mainUse === undefined ? "" : `주용도 ${title.mainUse}`,
    title.grossFloorAreaSqm === undefined
      ? ""
      : `연면적 ${title.grossFloorAreaSqm.toLocaleString("ko-KR")}㎡`,
    title.useApprovedOn === undefined ? "" : `사용승인일 ${title.useApprovedOn}`,
    title.structure === undefined ? "" : `구조 ${title.structure}`,
  ].filter((part) => part.length > 0);
  return parts.length === 0
    ? "표제부 등재 확인"
    : `표제부 등재 확인 — ${parts.join(" · ")}`;
};

const judgeAddress = (
  claim: Claim,
  offer: RealEstateOffer,
  register: BuildingRegisterAdapter,
): Judgement | UnjudgedClaim => {
  const lookup = register.lookup({ address: offer.asset.address });
  if (lookup.titles.length === 0) {
    return { claim, reason: REGISTER_NO_HIT_REASON };
  }
  const title = lookup.titles[0];
  return createJudgement({
    claim,
    verdict: "match",
    evidence: [
      {
        sourceId: register.sourceId,
        sourceName: register.sourceName,
        url: register.url,
        observedAt: lookup.retrievedAt,
        field: claim.field,
        claimed: claim.value,
        observed: registerFactsOf(title),
        stance: "supports",
        note: `${register.regionName} 표제부 ${lookup.titles.length}건 대조`,
      },
    ],
    rationale: "공시된 소재지 지번의 건축물대장 표제부가 존재합니다",
  });
};

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

const fingerprintNoteOf = (
  offer: RealEstateOffer,
  window: RtmsWindow,
): string | undefined => {
  const { parcelAreaSqm, totalAreaSqm, useApprovedYearMonth } = offer.asset;
  if (
    parcelAreaSqm === undefined ||
    totalAreaSqm === undefined ||
    useApprovedYearMonth === undefined
  ) {
    return undefined;
  }
  const year = Number(useApprovedYearMonth.slice(0, 4));
  const candidates = window.trades.filter(
    (trade) =>
      trade.buildingType === "일반" &&
      trade.landAreaSqm !== undefined &&
      trade.buildingAreaSqm !== undefined &&
      Math.abs(trade.landAreaSqm - parcelAreaSqm) <= 0.01 &&
      Math.abs(trade.buildingAreaSqm - totalAreaSqm) <= 0.01 &&
      trade.buildYear === year,
  );
  if (candidates.length === 0) return undefined;
  return `동일 자산 후보 거래 ${candidates.length}건 · ${candidates.map((trade) => eok(trade.amountWon)).join(", ")} · 지번 미공개로 동일 물건 확정 불가`;
};

export const judgeRealEstate = (
  input: RealEstateJudgeInput,
): RealEstateJudgeOutcome => {
  const { offer, claims, trades, register } = input;
  const claimOf = (kind: Claim["kind"]): Claim | undefined =>
    claims.find((claim) => claim.kind === kind);

  const judgements: Judgement[] = [];
  const unjudged: UnjudgedClaim[] = [];
  const placements: RealEstatePlacement[] = [];
  const notes: string[] = [];

  const lookup = offer.sale ? lookupLedger(offer, trades) : undefined;
  const ledgerBlocked =
    lookup === undefined ||
    lookup.window.missingMonths.includes(lookup.month) ||
    lookup.window.collectedAt === "";
  if (lookup && !ledgerBlocked) {
    notes.push(
      "RTMS 법정동 비교군에는 지번이 없어 매각금액·일자의 동일 물건 연결을 확인하지 않았습니다. 동일 물건 식별 근거가 추가되기 전에는 판정을 보류합니다.",
    );
  }

  for (const claim of claims) {
    if (claim.verifiability !== "verifiable") {
      unjudged.push({
        claim,
        reason: `${claim.demotionReason ?? "사유 미상"}(대조 불가)`,
      });
      continue;
    }

    if (claim.kind === "real_estate_address") {
      if (input.buildingHub !== undefined) continue;
      if (register === undefined) {
        unjudged.push({ claim, reason: REGISTER_MISSING_REASON });
        continue;
      }
      const outcome = judgeAddress(claim, offer, register);
      if ("verdict" in outcome) judgements.push(outcome);
      else unjudged.push(outcome);
      continue;
    }

    if (claim.kind === "sale_amount" || claim.kind === "sale_date") {
      if (!lookup) continue;
      if (ledgerBlocked) {
        unjudged.push({
          claim,
          reason: `${lookup.month} 같은 법정동 실거래 신고가 수집되지 않아 원장 대조를 하지 못했습니다(대조 불가).`,
        });
        continue;
      }
      unjudged.push({
        claim,
        reason:
          "RTMS 법정동 비교군에는 지번이 없어 동일 물건을 연결할 수 없습니다. 동일 물건 식별 근거가 없어 판정을 보류합니다(대조 불가).",
      });
    }
  }

  const buildingOutcome = input.buildingHub
    ? judgeBuildingRegister(offer, claims, input.buildingHub)
    : { judgements: [], unjudged: [] };
  judgements.push(...buildingOutcome.judgements);
  unjudged.push(...buildingOutcome.unjudged);

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
            fingerprintNote: fingerprintNoteOf(offer, offerWindow),
          },
          trades,
        ),
      );
    }
  }

  const saleClaim = claimOf("sale_amount");
  if (
    saleClaim &&
    saleClaim.verifiability === "verifiable" &&
    offer.sale &&
    lookup
  ) {
    const blocked = missingMonthsReason(lookup.window);
    if (lookup.window.trades.length === 0) {
      notes.push(
        `${blocked ?? `${windowLabel(lookup.window)} 같은 법정동 상업업무용 실거래 신고가 없어 비교군을 만들지 못했습니다`} — 매각금액 위치를 제시하지 않았습니다.`,
      );
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
