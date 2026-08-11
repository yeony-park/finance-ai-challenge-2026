/**
 * 감지 리플레이 — 실제 대조 실행을 시간 순으로 재생한다.
 * 마지막 "알림 발송"만 미연결(예정) 단계이며, 문구로 미리보기임을 밝힌다.
 */
import { formatKstShortDateTime } from "../format";
import type { ReportContext } from "./context";
import type { DemoView, ReplayStepView } from "./types";

export const buildReplaySection = (ctx: ReportContext): DemoView["replay"] => {
  const { summary } = ctx.report;
  const runAt = formatKstShortDateTime(ctx.report.generatedAt);

  const steps: readonly ReplayStepView[] = [
    {
      id: "filing",
      date: ctx.submittedOnShort,
      title: `증권신고서 접수 · 주장 ${ctx.claimTotal}건 추출`,
      detail:
        "이력번호·품종·성별·취득시기·보관장소·취득원가를 검증 가능한 단위로 구조화",
      isWarned: false,
    },
    {
      id: "crosscheck",
      date: runAt,
      title: `국가 원장 개체 ${ctx.headCount}두 전수 대조`,
      detail: `항목 ${summary.total}건 판정 — 일치 ${summary.match} · 불일치 ${summary.mismatch} · 확인 불가 ${summary.unverifiable}`,
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
        ? `개체 ${ctx.flaggedLabels.join(", ")}의 원장 미확인 기록이 발견되기까지의 과정입니다.`
        : "이번 대조에서는 확인되지 않은 기록이 없었습니다.",
    steps,
    push: {
      title: `${ctx.offerTitle.split(" · ")[0]} 판정 변동`,
      body: `개체 ${ctx.flaggedLabels.length}건이 원장에서 확인되지 않습니다. 근거 카드를 확인하세요.`,
      meta: "미리보기 · 관심 공모 알림",
    },
  };
};
