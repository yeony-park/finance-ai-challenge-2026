import type { OfferCardView } from "@/lib/verify/report/view-model";
import { ANALYSIS_CARD_COPY } from "@/lib/content/analysis-cards";
import { categoryById } from "@/lib/content/categories";

import {
  CategoryOfferCard,
  type CategoryOfferCardAppearance,
} from "./CategoryOfferCard";
import { OfferWatchIconButton } from "./OfferWatchControl";

export function OfferCard({
  card,
  appearance = "compact",
}: {
  readonly card: OfferCardView;
  readonly appearance?: CategoryOfferCardAppearance;
}) {
  const totalItems = card.tallies.reduce((sum, tally) => sum + tally.value, 0);
  const isFilingOnly = card.evidenceKind === "filing-excerpts";
  const isLivestock = card.assetLabel === categoryById("cattle").label;

  return (
    <CategoryOfferCard
      id={card.id}
      title={card.title}
      assetLabel={card.assetLabel}
      badge={card.schedule.badge}
      badgeTone={card.schedule.phase}
      meta={appearance === "analysis" ? null : card.schedule.label}
      metrics={card.tallies.map((tally) => ({
        label: tally.label,
        value: tally.value.toLocaleString("ko-KR"),
        tone: tally.tone === "unk" ? "unknown" : tally.tone,
      }))}
      note={card.amendment}
      noteAlert={card.amendmentIsAlert}
      href={card.href}
      appearance={appearance}
      description={appearance === "analysis" ? card.verdictLine : null}
      primaryMetric={
        appearance === "analysis"
          ? {
              label: isFilingOnly
                ? ANALYSIS_CARD_COPY.filingEvidenceLabel
                : isLivestock
                ? ANALYSIS_CARD_COPY.comparisonTargetLabel
                : ANALYSIS_CARD_COPY.totalItemsLabel,
              value: `${totalItems.toLocaleString("ko-KR")}${
                isLivestock && !isFilingOnly
                  ? ANALYSIS_CARD_COPY.headUnit
                  : ANALYSIS_CARD_COPY.itemUnit
              }`,
            }
          : null
      }
      facts={
        appearance === "analysis"
          ? [
              {
                label: ANALYSIS_CARD_COPY.subscriptionLabel,
                value: card.schedule.label,
              },
              {
                label: ANALYSIS_CARD_COPY.assetLabel,
                value: card.assetLabel,
              },
            ]
          : []
      }
      footerMeta={appearance === "analysis" ? card.lastVerifiedAt : null}
      ctaLabel={
        appearance === "analysis" ? ANALYSIS_CARD_COPY.reportCta : undefined
      }
      action={(
        <OfferWatchIconButton
          offerId={card.id}
          offerTitle={card.title}
        />
      )}
      media={
        appearance === "analysis"
          ? {
              src: isLivestock
                ? "/category-cattle.jpg"
                : "/category-real-estate-card-v2.png",
              alt: "",
              label: card.assetLabel,
            }
          : null
      }
    />
  );
}
