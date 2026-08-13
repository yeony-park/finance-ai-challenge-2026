import { formatWon } from "../format";
import { maskFreeText } from "../mask";
import type { PricePlacementRecord } from "../snapshot";
import type { ReportContext } from "./context";
import { buildRealEstatePriceSection } from "./real-estate";
import type { DemoView, NoteItemView } from "./types";

const NO_PLACEMENT_REASON = "대조할 공공 데이터가 아직 연결되지 않았습니다.";

const BASIS_NOTE =
  "위 표시는 신고서 기재 취득원가를 같은 달·같은 품종·성별의 소도체 경락가 위에 올려놓은 위치이며, 적정성 판단이 아닙니다. 취득원가는 생체 송아지 매입가이고 경락가는 도축 후 도체 낙찰가라 단위가 다릅니다 — 두 값을 같은 값으로 견주지 않았습니다. 위치를 만들 수 없는 개체는 일치·원장 미확인 어느 쪽으로도 세지 않고 대조 불가로 남습니다.";

const signed = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

const perKg = (value: number): string =>
  `${Math.round(value).toLocaleString("en-US")}원/kg`;

const heads = (value: number): string =>
  `${Math.round(value).toLocaleString("en-US")}두`;

const priceUnjudged = (ctx: ReportContext) =>
  ctx.report.unjudged.filter((item) => item.claim.kind === "acquisition_price");

const referenceItems = (
  placements: readonly PricePlacementRecord[],
): readonly NoteItemView[] => {
  const groups = new Map<string, PricePlacementRecord[]>();
  for (const placement of placements) {
    const key = `${placement.referenceMonth}|${placement.breedName}|${placement.sexName}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(placement);
    else groups.set(key, [placement]);
  }

  return [...groups.entries()].map(([key, group], index) => {
    const placement = group[0];
    const window =
      placement.monthVsWindowPercent === undefined
        ? "수집 구간 비교 없음"
        : `수집 구간(${placement.windowMonths[0]}~${placement.windowMonths.at(-1)}) 월평균의 단순평균 ${perKg(placement.windowAveragePricePerKg ?? 0)} 대비 ${signed(placement.monthVsWindowPercent)}`;
    return {
      id: `price-reference-${index}`,
      tone: "good" as const,
      title: `기준 ${placement.referenceMonth} · ${placement.breedName} ${placement.sexName} 소도체 전국 평균 경락가 ${perKg(placement.averagePricePerKg)}`,
      meta: `등급판정 ${heads(placement.sampleSize)} 기준 · ${window} · 개체 ${group.length}두에 적용 (${key.split("|")[0]} 취득분)`,
    };
  });
};

const gradeItem = (placement: PricePlacementRecord): readonly NoteItemView[] => {
  if (placement.grades.length === 0) return [];
  return [
    {
      id: "price-grades",
      tone: "unknown",
      title: placement.grades
        .map((grade) => `${grade.gradeName} ${perKg(grade.pricePerKg)}`)
        .join(" · "),
      meta: `${placement.referenceMonth} 육질등급별 전국 평균 (등급판정 두수 ${placement.grades.map((grade) => `${grade.gradeName} ${heads(grade.headCount)}`).join(", ")})`,
    },
  ];
};

const claimedItems = (
  placements: readonly PricePlacementRecord[],
): readonly NoteItemView[] => {
  if (placements.length === 0) return [];
  const prices = placements.map((placement) => placement.claimedPerHead);
  const sum = prices.reduce((acc, value) => acc + value, 0);
  const spread = placements.map((placement) => placement.vsOfferAveragePercent);
  return [
    {
      id: "price-sum",
      tone: "unknown",
      title: `신고서 기재 취득원가 합계 ${formatWon(sum)} · 개체당 평균 ${formatWon(sum / prices.length)}`,
      meta: `위치를 제시한 ${prices.length}두 기준 · 범위 ${formatWon(Math.min(...prices))} ~ ${formatWon(Math.max(...prices))}`,
    },
    {
      id: "price-spread",
      tone: "unknown",
      title: `개체별 취득원가는 공모 평균 대비 ${signed(Math.min(...spread))} ~ ${signed(Math.max(...spread))} 범위에 있습니다`,
      meta: "공모 내부 상대 위치 · 시장가 대비 적정성 판단이 아닙니다",
    },
  ];
};

const thinSampleItem = (
  placement: PricePlacementRecord | undefined,
): readonly NoteItemView[] =>
  placement?.thinSample
    ? [
        {
          id: "price-thin-sample",
          tone: "warn",
          title: `참조 모수가 ${heads(placement.sampleSize)}로 얇습니다`,
          meta: `${placement.breedName} ${placement.sexName}는 도축 두수 자체가 적어 평균가가 소수 개체에 좌우될 수 있습니다`,
        },
      ]
    : [];

const unplacedItems = (ctx: ReportContext): readonly NoteItemView[] => {
  const grouped = new Map<string, number>();
  for (const item of priceUnjudged(ctx)) {
    const reason = maskFreeText(item.reason);
    grouped.set(reason, (grouped.get(reason) ?? 0) + 1);
  }
  return [...grouped.entries()].map(([reason, count], index) => ({
    id: `price-unjudged-${index}`,
    tone: "warn" as const,
    title: `취득원가 ${count}건 · 대조 불가`,
    meta: reason,
  }));
};

export const buildPriceSection = (ctx: ReportContext): DemoView["price"] => {
  if (ctx.assetKind === "real-estate") return buildRealEstatePriceSection(ctx);

  const placements = ctx.report.pricePlacements;
  const first = placements[0];

  if (!first) {
    return {
      heading: "공시 취득원가의 시장 위치",
      source: "출처 · 경락가 참조 미연결",
      items:
        unplacedItems(ctx).length > 0
          ? unplacedItems(ctx)
          : [
              {
                id: "price-unjudged-0",
                tone: "warn",
                title: `취득원가 ${priceUnjudged(ctx).length}건 · 대조 불가`,
                meta: NO_PLACEMENT_REASON,
              },
            ],
      note: BASIS_NOTE,
    };
  }

  const auctionSource =
    ctx.report.sources.find((name) => name.includes("등급판정")) ??
    "축산물등급판정정보(축산물품질평가원) 월 집계";

  return {
    heading: "공시 취득원가의 시장 위치",
    source: `출처 · ${auctionSource}`,
    items: [
      ...referenceItems(placements),
      ...gradeItem(first),
      ...claimedItems(placements),
      ...thinSampleItem(first),
      ...unplacedItems(ctx),
    ],
    note: BASIS_NOTE,
  };
};
