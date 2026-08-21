import { buildOfferSchedule, type OfferEntry, type OfferSchedule } from "@/components/site/offers";

import type { WatchState } from "../../amend/watch-state";
import type { AssetKind } from "../../types";
import { formatKstShortDate, formatKstShortDateTime } from "../format";
import { buildReportContext, type ReportContext } from "./context";
import { mismatchFieldLabel } from "./labels";
import { realEstateVerdictLine } from "./real-estate";
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
  readonly hasAmendment: boolean;
}

export interface OfferCardInput extends DemoViewInput {
  readonly offer: OfferEntry;
  readonly now: Date;
  readonly watch?: WatchState | null;
}

const livestockLine = (ctx: ReportContext): string => {
  if (ctx.mismatched > 0) {
    return `이 공모의 개체 ${ctx.headCount}두 가운데 ${ctx.mismatched}두는 ${mismatchFieldLabel(ctx.report)} 기재가 국가 원장에서 확인되지 않습니다.`;
  }
  if (ctx.unverifiable > 0) {
    return `이 공모의 개체 ${ctx.headCount}두 중 ${ctx.unverifiable}두는 대조할 공공 데이터가 없습니다.`;
  }
  return `이 공모의 개체 ${ctx.headCount}두가 모두 국가 원장에서 확인됩니다.`;
};


const verdictLineOf = (ctx: ReportContext, assetKind: AssetKind): string => {
  switch (assetKind) {
    case "livestock":
      return livestockLine(ctx);
    case "real-estate":
      return realEstateVerdictLine(ctx);
    default: {
      const unreachable: never = assetKind;
      return unreachable;
    }
  }
};

const UNWATCHED_AMENDMENT_TEXT = "정정 접수 감시 미연결";

const amendmentLine = (
  versionCount: number,
  watch: WatchState | null | undefined,
): string => {
  if (!watch) return `리포트 ${versionCount}판 보관 · ${UNWATCHED_AMENDMENT_TEXT}`;

  const checkedOn = formatKstShortDate(watch.checkedAt);
  if (watch.detectionFailed) {
    return `정정 접수 여부 미확인 · 최근 조회 ${checkedOn}`;
  }
  if (watch.amendmentCount === 0) {
    return `정정 0건 · 최근 확인 ${checkedOn}`;
  }
  return `정정 ${watch.amendmentCount}건 접수 · 최근 확인 ${checkedOn}`;
};

export const buildOfferCard = (input: OfferCardInput): OfferCardView => {
  const { offer, now, watch } = input;
  const ctx = buildReportContext(input);

  return {
    id: offer.id,
    href: `/offers/${offer.id}`,
    title: offer.title,
    assetLabel: offer.assetLabel,
    schedule: buildOfferSchedule(offer, now),
    verdictLine: verdictLineOf(ctx, offer.assetKind),
    tallies: buildVerdictSection(ctx).tallies,
    lastVerifiedAt: `최근 재대조 ${formatKstShortDateTime(ctx.report.generatedAt)}`,
    amendment: amendmentLine(ctx.versionCount, watch),
    hasAmendment: (watch?.amendmentCount ?? 0) > 0,
  };
};
