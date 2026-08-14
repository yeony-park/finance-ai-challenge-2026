import { maskFreeText } from "../mask";
import type { ReportContext } from "./context";
import type { DemoView, NoteItemView } from "./types";

export const buildHistorySection = (ctx: ReportContext): DemoView["history"] => ({
  heading: "검증 대상 문서와 재검증 이력",
  source: "출처 · 리포트 버전링",
  items: [
    {
      id: "document",
      tone: "good",
      title:
        ctx.assetKind === "real-estate"
          ? `공모 공고·매각 공시(${ctx.submittedOn} 기준) 대조`
          : `증권신고서 ${ctx.submittedOn} 제출본 대조`,
      meta: `대조 실행 ${ctx.generatedAt} · 리포트 버전 ${ctx.versionCount}건 보관`,
    },
    ...ctx.report.notes.map(
      (note, index): NoteItemView => ({
        id: `engine-note-${index}`,
        tone: "unknown",
        title: maskFreeText(note),
        meta: "엔진 실행 기록",
      }),
    ),
    {
      id: "amendment-watch",
      tone: "warn",
      title: "정정 접수 감시와 재대조는 주 2회 자동 실행되고, 알림 발송 채널은 아직 연결되지 않았습니다",
      meta: "정정 접수 조회 · 재대조는 자동 실행 · 알림 발송은 다음 단계 범위입니다",
    },
  ],
});
