import type { ReportContext } from "./context";
import { b, mismatchFieldLabel, t, VERDICT_LABEL } from "./labels";
import { realEstateOneLiner } from "./real-estate";
import type { DemoView, TallyView } from "./types";

export const buildMetaSection = (ctx: ReportContext): DemoView["meta"] => ({
  badge: "검증 엔진 산출 리포트",
  items: [
    `대조 실행 ${ctx.generatedAt}`,
    ctx.modeLabel,
    `출처 ${ctx.sourceName}`,
    "익명화 적용",
  ],
});

export const buildOfferSection = (ctx: ReportContext): DemoView["offer"] =>
  ctx.assetKind === "real-estate"
    ? {
        title: ctx.offerTitle,
        tag: ctx.isOperatingRealEstate
          ? `상품 원문 ${ctx.submittedOnShort} 기준`
          : `매각 공시 ${ctx.submittedOnShort} 기준`,
        meta: `자산 ${ctx.headCount}건 · 항목 판정 ${ctx.report.summary.total}건 · 미판정 ${ctx.unjudgedCount}건 · 가격 위치 ${ctx.realEstatePlacementCount}건`,
      }
    : {
        title: ctx.offerTitle,
        tag: `증권신고서 ${ctx.submittedOnShort} 접수`,
        meta: `개체 ${ctx.headCount}두 · 항목 판정 ${ctx.report.summary.total}건 · 미판정 ${ctx.unjudgedCount}건 · 가격 위치 ${ctx.pricePlacementCount}건`,
      };

const priceSentence = (ctx: ReportContext): string => {
  const placed = ctx.pricePlacementCount;
  const unplaced = ctx.report.unjudged.filter(
    (item) => item.claim.kind === "acquisition_price",
  ).length;
  if (placed === 0) {
    return ` 취득원가 ${unplaced}건은 대조할 공공 데이터가 연결되지 않아 대조 불가로 남아 있습니다.`;
  }
  const tail =
    unplaced > 0 ? ` 나머지 ${unplaced}건은 대조 불가로 남아 있습니다.` : "";
  return ` 취득원가 ${placed}건은 취득한 달의 시장 경락가 위에 위치로 표시했습니다(적정성 판단이 아닙니다).${tail}`;
};

const talliesOf = (ctx: ReportContext): readonly TallyView[] => {
  const { summary } = ctx.report;
  if (ctx.assetKind === "real-estate") {
    return [
      { value: summary.match, label: VERDICT_LABEL.match, tone: "good" },
      { value: summary.mismatch, label: VERDICT_LABEL.mismatch, tone: "warn" },
      {
        value: summary.unverifiable + ctx.unjudgedCount,
        label: VERDICT_LABEL.unverifiable,
        tone: "unk",
      },
    ];
  }
  return [
    { value: ctx.matched, label: VERDICT_LABEL.match, tone: "good" },
    { value: ctx.mismatched, label: VERDICT_LABEL.mismatch, tone: "warn" },
    { value: ctx.unverifiable, label: VERDICT_LABEL.unverifiable, tone: "unk" },
  ];
};

export const buildVerdictSection = (ctx: ReportContext): DemoView["verdict"] => {
  const { summary } = ctx.report;

  if (ctx.assetKind === "real-estate") {
    return {
      eyebrow: ctx.isOperatingRealEstate
        ? `자산 ${ctx.headCount}건 대조 · ${ctx.hasBuildingEvidence ? "국토부 건축물대장" : "공개 근거"}`
        : `자산 ${ctx.headCount}건 사후 대조 · 국토부 실거래 원장`,
      title: ctx.offerTitle,
      when: ctx.isOperatingRealEstate
        ? `플랫폼 원문 확인일 ${ctx.submittedOn} · 대조 실행 ${ctx.generatedAt}`
        : `매각 공시 ${ctx.submittedOn} · 대조 실행 ${ctx.generatedAt}`,
      tallies: talliesOf(ctx),
      itemLine: `항목 단위 집계 · 항목 판정 ${summary.total}건 — 일치 ${summary.match} · 원장 불일치 ${summary.mismatch} · 대조 불가 ${summary.unverifiable + ctx.unjudgedCount} · 가격 위치 제시 ${ctx.realEstatePlacementCount}`,
      oneLiner: realEstateOneLiner(ctx),
    };
  }

  return {
    eyebrow: `개체 ${ctx.headCount}두 전수 대조 · 국가 원장`,
    title: ctx.offerTitle,
    when: `신고서 제출 ${ctx.submittedOn} · 대조 실행 ${ctx.generatedAt}`,
    tallies: talliesOf(ctx),
    itemLine: `개체 단위 집계 · 항목 판정 ${summary.total}건 — 일치 ${summary.match} · 원장 불일치 ${summary.mismatch} · 대조 불가 ${summary.unverifiable} · 미판정 ${ctx.unjudgedCount} · 가격 위치 제시 ${ctx.pricePlacementCount}`,
    oneLiner: {
      easy: [
        t(
          `공시된 개체 ${ctx.headCount}두 중 ${ctx.matched}두가 공공 데이터와 일치합니다. `,
        ),
        ctx.mismatched > 0
          ? b(
              `${ctx.mismatched}두는 ${mismatchFieldLabel(ctx.report)} 기재가 국가 이력 원장과 다릅니다.`,
            )
          : b("원장과 다르게 기재된 개체는 없습니다."),
        t(priceSentence(ctx)),
      ],
      pro:
        ctx.mismatched > 0
          ? [
              t(
                `개체 ${ctx.headCount}두 중 ${ctx.matched}두 전 항목 일치 · 항목 ${summary.total}건 대조 결과 일치 ${summary.match} · 원장 불일치 ${summary.mismatch} · 대조 불가 ${summary.unverifiable}. 불일치 개체의 사유는 `,
              ),
              b(`${mismatchFieldLabel(ctx.report)} 불일치`),
              t(
                `입니다.${priceSentence(ctx)} 근거 카드에 원문 위치와 조회 응답이 함께 붙어 있습니다.`,
              ),
            ]
          : [
              t(
                `개체 ${ctx.headCount}두 중 ${ctx.matched}두 전 항목 일치 · 항목 ${summary.total}건 대조 결과 일치 ${summary.match} · 원장 불일치 0 · 대조 불가 ${summary.unverifiable}.${priceSentence(ctx)} 근거 카드에 원문 위치와 조회 응답이 함께 붙어 있습니다.`,
              ),
            ],
    },
  };
};
