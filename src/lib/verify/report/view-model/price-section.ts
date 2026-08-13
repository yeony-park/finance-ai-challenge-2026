/**
 * ② 가격 위치 층위 — 경락가 어댑터가 붙기 전까지 취득원가에는 판정이 붙지 않는다.
 * 신고서 기재값은 "대조 전 값"임을 문구로 못 박아 판정 결과로 오독되지 않게 한다.
 */
import { formatWon } from "../format";
import { maskFreeText } from "../mask";
import type { ReportContext } from "./context";
import type { DemoView, NoteItemView } from "./types";

const NO_ADAPTER_REASON = "대조할 공공 데이터가 아직 연결되지 않았습니다.";

/** 신고서에 적힌 취득원가 — 0 이하는 파싱 실패로 보고 분포에서 뺀다 */
const claimedPrices = (ctx: ReportContext): readonly number[] =>
  ctx.report.unjudged
    .filter((item) => item.claim.kind === "acquisition_price")
    .map((item) => item.claim.numericValue ?? 0)
    .filter((value) => value > 0);

const distributionItems = (prices: readonly number[]): readonly NoteItemView[] => {
  if (prices.length === 0) return [];
  const sum = prices.reduce((acc, value) => acc + value, 0);
  return [
    {
      id: "price-sum",
      tone: "unknown",
      title: `신고서 기재 합계 ${formatWon(sum)}`,
      meta: `개체 ${prices.length}두 · 신고서 기재값이며 공공 데이터 대조 전입니다`,
    },
    {
      id: "price-range",
      tone: "unknown",
      title: `개체당 평균 ${formatWon(sum / prices.length)} · 범위 ${formatWon(Math.min(...prices))} ~ ${formatWon(Math.max(...prices))}`,
      meta: "신고서 기재값 분포 · 시장가 대조 결과가 아닙니다",
    },
  ];
};

export const buildPriceSection = (ctx: ReportContext): DemoView["price"] => {
  const reason = maskFreeText(
    ctx.report.unjudged.find((item) => item.claim.kind === "acquisition_price")
      ?.reason ?? NO_ADAPTER_REASON,
  );

  return {
    heading: "공시 취득원가의 시장가 대조",
    source: "출처 · 경락가 어댑터 미연결",
    items: [
      {
        id: "price-unjudged",
        tone: "unknown",
        title: `취득원가 ${ctx.unjudgedCount}건 · 대조 불가(미판정)`,
        meta: reason,
      },
      ...distributionItems(claimedPrices(ctx)),
    ],
    note: "도매시장 경락가 어댑터가 연결되기 전까지 취득원가에는 판정이 붙지 않습니다. 판정할 수 없는 항목은 일치·원장 미확인 어느 쪽으로도 세지 않고 대조 불가로 남습니다.",
  };
};
