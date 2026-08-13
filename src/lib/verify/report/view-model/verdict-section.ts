/**
 * 판정 헤더 — 개체 단위 집계(3값)와 항목 단위 집계가 함께 붙는다.
 * 미판정 건수는 어느 쪽으로도 세지 않고 문구에 그대로 남는다.
 * 화면 판정 명칭은 「일치 / 원장 미확인 / 대조 불가」 3종뿐이다(홈-IA-개편 §2).
 */
import type { ReportContext } from "./context";
import { b, t, VERDICT_LABEL } from "./labels";
import type { DemoView } from "./types";

export const buildMetaSection = (ctx: ReportContext): DemoView["meta"] => ({
  badge: "검증 엔진 산출 리포트",
  items: [
    `대조 실행 ${ctx.generatedAt}`,
    ctx.modeLabel,
    `출처 ${ctx.sourceName}`,
    "익명화 적용",
  ],
});

export const buildOfferSection = (ctx: ReportContext): DemoView["offer"] => ({
  title: ctx.offerTitle,
  tag: `증권신고서 ${ctx.submittedOnShort} 접수`,
  meta: `개체 ${ctx.headCount}두 · 항목 판정 ${ctx.report.summary.total}건 · 미판정 ${ctx.unjudgedCount}건`,
});

export const buildVerdictSection = (ctx: ReportContext): DemoView["verdict"] => {
  const { summary } = ctx.report;
  return {
    eyebrow: `개체 ${ctx.headCount}두 전수 대조 · 국가 원장`,
    title: ctx.offerTitle,
    when: `신고서 제출 ${ctx.submittedOn} · 대조 실행 ${ctx.generatedAt}`,
    tallies: [
      { value: ctx.matched, label: VERDICT_LABEL.match, tone: "good" },
      { value: ctx.mismatched, label: VERDICT_LABEL.mismatch, tone: "warn" },
      { value: ctx.unverifiable, label: VERDICT_LABEL.unverifiable, tone: "unk" },
    ],
    itemLine: `개체 단위 집계 · 항목 판정 ${summary.total}건 — 일치 ${summary.match} · 원장 미확인 ${summary.mismatch} · 대조 불가 ${summary.unverifiable} · 미판정 ${ctx.unjudgedCount}`,
    oneLiner: {
      easy: [
        t(
          `공시된 개체 ${ctx.headCount}두 중 ${ctx.matched}두가 공공 데이터와 일치합니다. `,
        ),
        b(`${ctx.mismatched}두는 국가 이력 원장에서 확인되지 않습니다.`),
        t(
          ` 취득원가 ${ctx.unjudgedCount}건은 대조할 공공 데이터가 아직 연결되지 않아 대조 불가로 남아 있습니다.`,
        ),
      ],
      pro: [
        t(
          `개체 ${ctx.headCount}두 중 ${ctx.matched}두 전 항목 일치 · 항목 ${summary.total}건 대조 결과 일치 ${summary.match} · 원장 미확인 ${summary.mismatch} · 대조 불가 ${summary.unverifiable}. 미확인 개체의 사유는 `,
        ),
        b("보관장소(사육지) 미확인"),
        t(
          `이며, 취득원가 ${ctx.unjudgedCount}건은 어댑터가 연결되지 않아 판정 전입니다. 근거 카드에 원문 위치와 조회 응답이 함께 붙어 있습니다.`,
        ),
      ],
    },
  };
};
