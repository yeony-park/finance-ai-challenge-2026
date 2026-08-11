/**
 * ③ 이행 이력 층위 — 어떤 문서를 언제 대조했는지, 엔진이 남긴 실행 기록은 무엇인지.
 * 아직 연결되지 않은 감시 기능은 숨기지 않고 마지막 항목으로 드러낸다.
 */
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
      title: `증권신고서 ${ctx.submittedOn} 제출본 대조`,
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
      title: "정정신고서 감시는 아직 연결되지 않았습니다",
      meta: "정정 접수 시 자동 재검증·알림은 다음 단계 범위입니다",
    },
  ],
});
