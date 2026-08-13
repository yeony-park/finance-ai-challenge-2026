import { formatKstShortDateTime } from "../format";
import type { ReportContext } from "./context";
import type { DemoView, ReplayStepView } from "./types";

export const buildReplaySection = (ctx: ReportContext): DemoView["replay"] => {
  const { summary } = ctx.report;
  const runAt = formatKstShortDateTime(ctx.report.generatedAt);

  const isRealEstate = ctx.assetKind === "real-estate";

  const steps: readonly ReplayStepView[] = [
    {
      id: "filing",
      date: ctx.submittedOnShort,
      title: isRealEstate
        ? `공모 공고·매각 공시 · 주장 ${ctx.claimTotal}건 추출`
        : `증권신고서 접수 · 주장 ${ctx.claimTotal}건 추출`,
      detail: isRealEstate
        ? "소재지·공모금액·매각금액·매각일을 검증 가능한 단위로 구조화"
        : "이력번호·품종·성별·취득시기·보관장소·취득원가를 검증 가능한 단위로 구조화",
      isWarned: false,
    },
    {
      id: "crosscheck",
      date: runAt,
      title: isRealEstate
        ? `국토부 실거래 원장 대조 · 자산 ${ctx.headCount}건`
        : `국가 원장 개체 ${ctx.headCount}두 전수 대조`,
      detail: `항목 ${summary.total}건 판정 — 일치 ${summary.match} · 원장 미확인 ${summary.mismatch} · 대조 불가 ${isRealEstate ? summary.unverifiable + ctx.unjudgedCount : summary.unverifiable}`,
      isWarned: false,
    },
    ...ctx.focuses.map(
      (focus): ReplayStepView => ({
        id: `focus-${focus.no}`,
        date: runAt,
        title: focus.title,
        detail: focus.summary,
        isWarned: true,
      }),
    ),
    {
      id: "notify",
      date: "예정",
      title: "관심 등록자에게 알림 발송",
      detail: "알림 발송은 아직 연결되지 않았습니다 — 아래는 동작 미리보기입니다",
      isWarned: false,
    },
  ];

  return {
    heading: "감지 리플레이 · 실제 대조 실행 재생 (익명화)",
    lead:
      ctx.flaggedLabels.length > 0
        ? `${isRealEstate ? "" : "개체 "}${ctx.flaggedLabels.join(", ")}의 원장 미확인 기록이 발견되기까지의 과정입니다.`
        : "이번 대조에서는 확인되지 않은 기록이 없었습니다.",
    steps,
    push: {
      title: `${ctx.offerTitle.split(" · ")[0]} 판정 변동`,
      body: `${isRealEstate ? "항목" : "개체"} ${ctx.flaggedLabels.length}건이 원장에서 확인되지 않습니다. 근거 카드를 확인하세요.`,
      meta: "미리보기 · 관심 공모 알림",
    },
  };
};
