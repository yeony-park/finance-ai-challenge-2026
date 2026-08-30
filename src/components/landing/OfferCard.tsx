import type { OfferCardView } from "@/lib/verify/report/view-model";

import { CategoryOfferCard } from "./CategoryOfferCard";
import { OfferWatchIconButton } from "./OfferWatchControl";

export function OfferCard({ card }: { readonly card: OfferCardView }) {
  return (
    <CategoryOfferCard
      id={card.id}
      title={card.title}
      assetLabel={card.assetLabel}
      badge={card.schedule.badge}
      badgeTone={card.schedule.phase}
      meta={card.schedule.label}
      metrics={card.tallies.map((tally) => ({
        label: tally.label,
        value: tally.value.toLocaleString("ko-KR"),
        tone: tally.tone === "unk" ? "unknown" : tally.tone,
      }))}
      note={card.amendment}
      noteAlert={card.amendmentIsAlert}
      href={card.href}
      action={(
        <OfferWatchIconButton
          offerId={card.id}
          offerTitle={card.title}
        />
      )}
    />
  );
}
