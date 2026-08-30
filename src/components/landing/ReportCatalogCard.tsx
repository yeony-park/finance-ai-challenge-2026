import { CategoryOfferCard } from "./CategoryOfferCard";
import type { ReportCatalogCardView } from "./report-catalog";

export function ReportCatalogCard({
  card,
}: {
  readonly card: ReportCatalogCardView;
}) {
  return (
    <CategoryOfferCard
      id={card.id}
      title={card.title}
      assetLabel={card.assetLabel}
      badge={card.badge}
      badgeTone={card.phase}
      meta={card.meta}
      metrics={card.tallies.map((tally) => ({
        label: tally.label,
        value: tally.value.toLocaleString("ko-KR"),
        tone: tally.tone === "unk" ? "unknown" : tally.tone,
      }))}
      note={card.summary}
      href={card.href}
    />
  );
}
