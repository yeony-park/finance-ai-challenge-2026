import { THIN_COMPARABLE_THRESHOLD } from "../../adapters/rtms-trade";
import { formatKstDateTime, formatKstShortDateTime } from "../format";
import { maskFreeText } from "../mask";
import type {
  JudgementRecord,
  RealEstatePlacementRecord,
  ReportSnapshot,
} from "../snapshot";
import type { ReportContext } from "./context";
import {
  b,
  mismatchFieldLabel,
  shortSourceName,
  t,
  VERDICT_LABEL,
} from "./labels";
import type {
  DemoView,
  EvidenceRowView,
  FocusView,
  NoteItemView,
  RichText,
  SubjectCardView,
} from "./types";

export const eok = (value: number): string =>
  `${(Math.round((value / 100_000_000) * 100) / 100).toLocaleString("en-US")}억원`;

const signed = (value: number): string =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

const presentRationale = (value: string): string =>
  maskFreeText(value).replaceAll("exact parcel", "동일 건물");

const placementOf = (
  report: ReportSnapshot,
  origin: RealEstatePlacementRecord["origin"],
): RealEstatePlacementRecord | undefined =>
  report.realEstatePlacements.find((item) => item.origin === origin);

const positionText = (placement: RealEstatePlacementRecord): string =>
  placement.topPercent === undefined
    ? `비교군 ${placement.comparableCount}건 (백분위 미산출)`
    : `비교군 ${placement.comparableCount}건 중 상위 ${placement.topPercent}%`;

export const realEstateVerdictLine = (ctx: ReportContext): string => {
  const actual = placementOf(ctx.report, "market");
  const expected = placementOf(ctx.report, "issuer");
  const placement = actual ?? expected;

  if (!placement) {
    return `이 공모의 공시 항목 ${ctx.report.summary.total + ctx.unjudgedCount}건 가운데 실거래 비교군을 만들 수 있는 항목이 없습니다.`;
  }

  const label = placement.origin === "market" ? "매각가" : "공모가";
  if (placement.topPercent === undefined) {
    return `이 공모의 ${label}는 같은 법정동 실거래 비교군 ${placement.comparableCount}건과 대조됐습니다.`;
  }
  return `이 공모의 ${label}는 같은 법정동 실거래 비교군 ${placement.comparableCount}건의 상위 ${placement.topPercent}%에 있습니다.`;
};

export const realEstatePriceSentence = (ctx: ReportContext): string => {
  const placed = ctx.realEstatePlacementCount;
  const unplaced = ctx.report.unjudged.filter(
    (item) => item.claim.kind === "offer_amount" || item.claim.kind === "sale_amount",
  ).length;
  if (placed === 0) {
    return " 공모가·매각가는 비교할 실거래 신고를 찾지 못해 위치를 제시하지 못했습니다.";
  }
  const tail = unplaced > 0 ? ` 나머지 ${unplaced}건은 대조 불가로 남아 있습니다.` : "";
  return ` 금액 ${placed}건은 같은 법정동 실거래 비교군 위에 위치로 표시했습니다(적정성 판단이 아닙니다).${tail}`;
};

export const realEstateOneLiner = (
  ctx: ReportContext,
): Record<"easy" | "pro", RichText> => {
  const { summary } = ctx.report;
  const noClaims = summary.total === 0 && ctx.unjudgedCount === 0;
  const onlyUnjudged = summary.total === 0 && ctx.unjudgedCount > 0;
  const expected = placementOf(ctx.report, "issuer");
  const actual = placementOf(ctx.report, "market");
  const gap =
    expected && actual
      ? ((actual.amountWon - expected.amountWon) / expected.amountWon) * 100
      : undefined;

  const ledgerSentence = noClaims
    ? "대조할 공시 항목이 없어 판정을 보류합니다. "
    : onlyUnjudged
      ? `공시 항목 ${ctx.unjudgedCount}건은 외부 원장 근거가 부족해 모두 대조 보류입니다. `
    : ctx.hasBuildingEvidence
      ? summary.mismatch > 0
        ? `상품 원문 항목 ${summary.total}건을 국토부 건축물대장과 대조한 결과 ${summary.match}건이 일치하고, ${mismatchFieldLabel(ctx.report)} ${summary.mismatch}건이 다릅니다. `
        : `상품 원문 항목 ${summary.match}건이 국토부 건축물대장과 일치합니다. `
      : summary.mismatch > 0
        ? `공시된 항목 ${summary.total}건 가운데 ${summary.mismatch}건이 국토부 실거래 원장에서 확인되지 않습니다. `
          : `공시된 매각 내역 ${summary.match}건이 국토부 실거래 원장에서 확인됩니다. `;

  const gapSentence =
    expected && actual && gap !== undefined
      ? `공모가 ${eok(expected.amountWon)}과 매각가 ${eok(actual.amountWon)}은 각각 공모·매각 공시 기재값입니다. 매각가와 일자를 외부 실거래 원장에서 동일 물건으로 확정한 결과가 아닙니다(단순 금액차 ${signed(gap)}).`
      : expected
        ? `공모금액 ${eok(expected.amountWon)}은 상품 원문 제시값이며, 동일 자산의 매각·정산 결과가 아닙니다.`
        : "공모·매각 공시 기재값과 외부 실거래 비교군을 분리해 적습니다.";

  return {
    easy: [t(ledgerSentence), b(gapSentence), t(realEstatePriceSentence(ctx))],
    pro: [
      t(
        `항목 ${summary.total}건 대조 결과 일치 ${summary.match} · 원장 불일치 ${summary.mismatch} · 대조 불가 ${ctx.unjudgedCount}. `,
      ),
      b(gapSentence),
      t(
        ctx.hasBuildingEvidence
          ? `${realEstatePriceSentence(ctx)} 건축물대장 대조는 권리·소유·임대차 상태를 확인하지 않습니다.`
          : `${realEstatePriceSentence(ctx)} 지번 단위 실재 대조는 실거래 신고 자료가 법정동까지만 공개돼 구조적으로 불가합니다.`,
      ),
    ],
  };
};

const comparableMix = (placement: RealEstatePlacementRecord): string => {
  const counts = new Map<string, number>();
  for (const item of placement.comparables) {
    const key = item.buildingUse || "유형 미기재";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, c) => c[1] - a[1])
    .map(([use, count]) => `${use} ${count}건`)
    .join(" · ");
};

const placementItems = (
  placements: readonly RealEstatePlacementRecord[],
): readonly NoteItemView[] =>
  placements.map((placement, index) => {
    const source = placement.evidence.find(
      (evidence) => evidence.sourceId === "molit-rtms-nrg-trade",
    );
    return {
      id: `real-estate-placement-${index}`,
      tone: "unknown" as const,
      title: `${placement.label} ${eok(placement.amountWon)} · ${positionText(placement)}`,
      meta: `${placement.origin === "market" ? "매각 공시 기재값" : placement.originLabel} · ${placement.windowMonths[0]}~${placement.windowMonths.at(-1)} ${placement.regionLabel} 신고 기준 · ${comparableMix(placement)}`,
      ...(source
        ? {
            source: {
              label: shortSourceName([source.sourceName]),
              url: source.url,
              asOf: formatKstDateTime(source.observedAt),
            },
          }
        : {}),
    };
  });

const rangeItems = (
  placements: readonly RealEstatePlacementRecord[],
): readonly NoteItemView[] =>
  placements.map((placement, index): NoteItemView =>
    placement.medianAmountWon === undefined
      ? {
          id: `real-estate-range-${index}`,
          tone: "warn",
          title: `${placement.label} 비교군 ${placement.comparableCount}건 · 백분위 미산출`,
          meta: `비교군이 ${THIN_COMPARABLE_THRESHOLD}건 미만이라 백분위 대신 건수만 적습니다`,
        }
      : {
          id: `real-estate-range-${index}`,
          tone: "good",
          title: `${placement.label} 비교군 중위값 ${eok(placement.medianAmountWon)} · 범위 ${eok(placement.minAmountWon ?? 0)}~${eok(placement.maxAmountWon ?? 0)}`,
          meta: `${placement.comparableCount}건 중 위에서 ${placement.rankFromTop}번째`,
        },
  );

const gapItem = (report: ReportSnapshot): readonly NoteItemView[] => {
  const expected = placementOf(report, "issuer");
  const actual = placementOf(report, "market");
  if (!expected || !actual) return [];
  const gap = ((actual.amountWon - expected.amountWon) / expected.amountWon) * 100;
  return [
    {
      id: "real-estate-gap",
      tone: "unknown",
      title: `공모금액 ${eok(expected.amountWon)} → 매각 공시 기재값 ${eok(actual.amountWon)} · 단순 금액차 ${signed(gap)}`,
      meta: "공모·매각 공시 기재값의 산술 차이입니다 — 외부 실거래 원장에서 동일 물건의 매각금액·일자를 확정한 값이 아니며, 수익률·성과 판정도 아닙니다",
    },
  ];
};

const unplacedItems = (ctx: ReportContext): readonly NoteItemView[] =>
  ctx.report.unjudged
    .filter(
      (item) =>
        item.claim.kind === "offer_amount" || item.claim.kind === "sale_amount",
    )
    .map((item, index) => ({
      id: `real-estate-unplaced-${index}`,
      tone: "warn" as const,
      title: `${item.claim.field} · 대조 불가`,
      meta: presentRationale(item.reason),
    }));

const BASIS_NOTE =
  "위 표시는 공시된 금액을 같은 법정동·같은 유형(상업업무용) 실거래 신고 위에 올려놓은 위치이며, 적정성 판단이 아닙니다. 면적 보정 없는 거래 총액 기준이고 비교군에는 규모·세부 용도가 다른 물건이 섞일 수 있습니다. 비교군이 얇은 구간은 백분위를 내지 않고 건수만 적습니다.";

export const buildRealEstatePriceSection = (
  ctx: ReportContext,
): DemoView["price"] => {
  const placements = ctx.report.realEstatePlacements;
  const source =
    ctx.report.sources.find((name) => name.includes("실거래")) ??
    "국토교통부 상업업무용 부동산 매매 신고 자료";

  if (placements.length === 0) {
    return {
      heading: "공시 금액의 실거래 비교군 내 위치",
      source: `출처 · 국토부 실거래 비교군 · ${source}`,
      items:
        unplacedItems(ctx).length > 0
          ? unplacedItems(ctx)
          : [
              {
                id: "real-estate-unplaced-0",
                tone: "warn",
                title: "공모가·매각가 · 대조 불가",
                meta: "비교할 실거래 신고를 찾지 못했습니다.",
              },
            ],
      note: BASIS_NOTE,
    };
  }

  return {
    heading: "공시 금액의 실거래 비교군 내 위치",
    source: `출처 · 국토부 실거래 비교군 · ${source}`,
    items: [
      ...placementItems(placements),
      ...rangeItems(placements),
      ...gapItem(ctx.report),
      ...unplacedItems(ctx),
    ],
    note: BASIS_NOTE,
  };
};

const claimRowsOf = (
  report: ReportSnapshot,
  subject: string,
): readonly EvidenceRowView[] => [
  ...report.judgements
    .filter((item) => item.claim.subject === subject)
    .map((item) => ({
      label: item.claim.field,
      value: item.claim.value,
      isAlert: false,
    })),
  ...report.unjudged
    .filter((item) => item.claim.subject === subject)
    .map((item) => ({
      label: item.claim.field,
      value: item.claim.value,
      isAlert: false,
      note: `대조 불가 · ${presentRationale(item.reason)}`,
    })),
];

const ledgerRowsOf = (
  judgements: readonly JudgementRecord[],
): readonly EvidenceRowView[] =>
  judgements.map((item) => ({
    label: item.claim.field,
    value: item.evidence[0]?.observed ?? VERDICT_LABEL[item.verdict],
    isAlert: item.verdict !== "match",
    ...(item.claim.kind === "real_estate_use_approved_month" &&
    item.verdict === "match"
      ? { note: "상품 원문은 월 단위이며, 건축물대장 사용승인일과 같은 달입니다." }
      : item.verdict === "match"
        ? {}
      : { note: presentRationale(item.rationale) }),
  }));

export const buildRealEstateFocus = (
  report: ReportSnapshot,
  subject: string,
  card: SubjectCardView,
): FocusView => {
  const judgements = report.judgements.filter(
    (item) => item.claim.subject === subject,
  );
  const flagged = judgements.find((item) => item.verdict !== "match");
  const anchor = flagged ?? judgements[0];
  const isBuildingFocus = judgements.some((item) =>
    item.evidence.some(
      (evidence) => evidence.sourceId === "molit-building-register-hub",
    ),
  );
  const location = anchor?.claim.location;
  const sourceDoc = anchor?.evidence.find((evidence) =>
    evidence.sourceId.startsWith("platform-claim:"),
  );
  const sourceLedger = anchor?.evidence.find((evidence) =>
    isBuildingFocus
      ? evidence.sourceId === "molit-building-register-hub"
      : evidence.sourceId === "molit-rtms-nrg-trade",
  );
  const observedAt = sourceLedger?.observedAt ?? report.generatedAt;

  return {
    no: card.no,
    title: `${card.label} · ${VERDICT_LABEL[card.verdict]}`,
    summary: flagged
      ? presentRationale(flagged.rationale)
      : isBuildingFocus
        ? "상품 원문 기재가 건축물대장과 대조됐습니다"
        : "공시된 내용이 실거래 원장과 대조됐습니다",
    claimHeading: location
      ? `${isBuildingFocus ? "상품 원문 기재" : "공시 기재"} · ${location.section} ${location.table}`
      : isBuildingFocus
        ? "상품 원문 기재"
        : "공시 기재",
    claimRows: claimRowsOf(report, subject),
    ledgerHeading: `${isBuildingFocus ? "국토부 건축물대장" : "국토부 실거래 원장"} · ${formatKstShortDateTime(observedAt)} 기준`,
    ledgerRows: ledgerRowsOf(judgements),
    foot: {
      easy: [
        ...(isBuildingFocus
          ? [
              t("상품 원문 기재를 국토부 건축물대장 표제부와 맞춰 본 결과입니다. "),
              b("건축물대장은 권리·소유·임대차 상태를 확인하지 않습니다."),
            ]
          : [
              t("공시된 매각 내역을 같은 법정동의 실거래 신고와 맞춰 본 결과입니다. "),
              b("지번 단위 대조는 실거래 신고 자료가 법정동까지만 공개돼 불가합니다."),
              t(" 같은 금액·같은 달의 신고가 있는지까지만 확인할 수 있습니다."),
            ]),
      ],
      pro: [
        ...(flagged
          ? [b(`${flagged.claim.field} — ${presentRationale(flagged.rationale)}`), t(" ")]
          : []),
        t(
          isBuildingFocus
            ? "상품 원문과 건축물대장 표제부의 소재지·면적·사용승인월을 항목별로 비교했습니다. 건물의 권리관계와 현재 임대차 상태는 별도 근거가 필요합니다."
            : "대조 키는 법정동·신고 월·거래금액입니다. 동일 금액의 다른 물건이 있을 가능성은 이 데이터만으로 배제할 수 없습니다.",
        ),
      ],
    },
    sourceDoc: location
      ? `${isBuildingFocus ? "상품 원문" : "공시 원문"} · ${location.section} · ${location.table} ${location.row}행`
      : isBuildingFocus
        ? "상품 원문"
        : "공시 원문",
    ...(sourceDoc?.url ? { sourceDocUrl: sourceDoc.url } : {}),
    sourceLedger: `${shortSourceName(
      sourceLedger?.sourceName ? [sourceLedger.sourceName] : report.sources,
    )} 조회 · ${formatKstDateTime(observedAt)}`,
    ...(sourceLedger?.url ? { sourceLedgerUrl: sourceLedger.url } : {}),
  };
};
