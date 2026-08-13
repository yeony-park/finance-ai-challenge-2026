import type { ReportContext } from "./context";
import { b, t } from "./labels";
import type { DemoView } from "./types";

export const buildRealitySection = (ctx: ReportContext): DemoView["reality"] => ({
  heading: `공시된 개체 ${ctx.headCount}두의 국가 원장 대조`,
  source: `출처 · ${ctx.sourceName}`,
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
});
