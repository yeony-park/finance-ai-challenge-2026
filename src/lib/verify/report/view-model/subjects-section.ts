import type { ReportContext } from "./context";
import { b, mismatchFieldLabel, shortSourceName, t } from "./labels";
import type { DemoView } from "./types";

const realEstateCaption = (ctx: ReportContext): DemoView["reality"]["caption"] =>
  ctx.report.summary.total === 0 && ctx.unjudgedCount === 0
    ? [
        t("대조할 공시 항목이 없어 판정을 보류합니다. "),
        b("확인된 항목이 있다는 뜻이 아닙니다."),
      ]
    : ctx.report.summary.total === 0 && ctx.unjudgedCount > 0
    ? [
        t("공시 항목은 외부 원장 근거가 부족해 모두 대조 보류입니다. "),
        b("대조 보류는 확정 판정이 아닙니다."),
      ]
    : ctx.hasBuildingEvidence && ctx.report.summary.mismatch > 0
    ? [
        t("상품 원문과 건축물대장을 항목별로 대조했습니다. "),
        b(`${mismatchFieldLabel(ctx.report)} 기재가 건축물대장과 다릅니다.`),
      ]
    : ctx.flaggedLabels.length > 0
    ? [
        t("자산을 선택하면 대조 근거가 표시됩니다. "),
        b(ctx.flaggedLabels.join(", ")),
        t("에서 확인되지 않은 기록이 발견되었습니다."),
      ]
    : [
        t("자산을 선택하면 대조 근거가 표시됩니다. 공시된 매각 내역이 실거래 원장과 일치합니다. "),
        b("지번 단위 실재 대조는 실거래 신고 자료가 법정동까지만 공개돼 불가합니다."),
      ];

export const buildRealitySection = (ctx: ReportContext): DemoView["reality"] =>
  ctx.assetKind === "real-estate"
    ? {
        heading: ctx.hasBuildingEvidence
          ? `상품 원문 자산 ${ctx.headCount}건의 국토부 건축물대장 대조`
          : `공시된 자산 ${ctx.headCount}건의 국토부 실거래 원장 대조`,
        source: `출처 · ${
          ctx.hasBuildingEvidence
            ? shortSourceName([ctx.buildingSourceName])
            : ctx.sourceName
        }`,
        countUnit: "건",
        comparisonDescription:
          ctx.hasBuildingEvidence
            ? "상품 원문의 자산 정보와 국토부 건축물대장을 같은 기준으로 대조했습니다."
            : "자산 단위로 공시값과 국토부 실거래 원장을 같은 기준으로 대조했습니다.",
        caption: realEstateCaption(ctx),
        subjects: ctx.subjects,
        focuses: ctx.focuses,
      }
    : {
        heading: `공시된 개체 ${ctx.headCount}두의 국가 원장 대조`,
        source: `출처 · ${ctx.sourceName}`,
        countUnit: "두",
        comparisonDescription:
          "개체 단위로 공시값과 국가 원장을 같은 기준으로 대조했습니다.",
        caption:
          ctx.flaggedLabels.length > 0
            ? [
                t("개체를 선택하면 대조 근거가 표시됩니다. "),
                b(ctx.flaggedLabels.join(", ")),
                t("에서 확인되지 않은 기록이 발견되었습니다."),
              ]
            : [t("모든 개체가 공공 데이터와 일치합니다.")],
        subjects: ctx.subjects,
        focuses: ctx.focuses,
      };
