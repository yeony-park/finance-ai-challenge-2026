import { buildOfferSchedule, type OfferEntry, type OfferSchedule } from "@/components/site/offers";

import { formatKstShortDateTime } from "../format";
import { buildReportContext, type ReportContext } from "./context";
import type { DemoViewInput, TallyView } from "./types";
import { buildVerdictSection } from "./verdict-section";

export interface OfferCardView {
  readonly id: string;
  readonly href: string;
  readonly title: string;
  readonly assetLabel: string;
  readonly schedule: OfferSchedule;
  readonly verdictLine: string;
  readonly tallies: readonly TallyView[];
  readonly lastVerifiedAt: string;
  readonly amendment: string;
}

export interface OfferCardInput extends DemoViewInput {
  readonly offer: OfferEntry;
  readonly now: Date;
}

const livestockLine = (ctx: ReportContext): string => {
  if (ctx.mismatched > 0) {
    return `이 공모의 개체 ${ctx.headCount}두 중 ${ctx.mismatched}두가 국가 원장에서 확인되지 않습니다.`;
  }
  if (ctx.unverifiable > 0) {
    return `이 공모의 개체 ${ctx.headCount}두 중 ${ctx.unverifiable}두는 대조할 공공 데이터가 없습니다.`;
  }
  return `이 공모의 개체 ${ctx.headCount}두가 모두 국가 원장에서 확인됩니다.`;
};

const claimLine = (ctx: ReportContext): string => {
  const { summary } = ctx.report;
  if (summary.mismatch > 0) {
    return `이 공모의 공시 항목 ${summary.total}건 중 ${summary.mismatch}건이 공공 데이터에서 확인되지 않습니다.`;
  }
  return `이 공모의 공시 항목 ${summary.total}건이 모두 공공 데이터에서 확인됩니다.`;
};

const amendmentLine = (versionCount: number): string =>
  `리포트 ${versionCount}판 보관 · 정정 접수 감시 미연결`;

export const buildOfferCard = (input: OfferCardInput): OfferCardView => {
  const { offer, now } = input;
  const ctx = buildReportContext(input);

  return {
    id: offer.id,
    href: `/offers/${offer.id}`,
    title: offer.title,
    assetLabel: offer.assetLabel,
    schedule: buildOfferSchedule(offer, now),
    verdictLine: offer.assetKind === "livestock" ? livestockLine(ctx) : claimLine(ctx),
    tallies: buildVerdictSection(ctx).tallies,
    lastVerifiedAt: `최근 재대조 ${formatKstShortDateTime(ctx.report.generatedAt)}`,
    amendment: amendmentLine(ctx.versionCount),
  };
};
