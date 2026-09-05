import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ChecklistBand } from "@/components/home/ChecklistBand";
import { HomeHero } from "@/components/home/HomeHero";
import { IntroBand } from "@/components/home/IntroBand";
import { latestOfferEntry, OFFERS } from "@/components/site/offers";
import type { ChecklistBridgeOffer } from "@/lib/content/checklist-links";
import { loadFilingFacts } from "@/lib/verify/report/filing-facts";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";

export default async function Home() {
  const latestOffer = latestOfferEntry(OFFERS);
  let bridgeOffer: ChecklistBridgeOffer | null = null;

  if (latestOffer) {
    const issuerKey = issuerKeyForOffer(latestOffer.id);
    const [filingFacts, trackRecord] = await Promise.all([
      loadFilingFacts(latestOffer.id),
      issuerKey ? loadTrackRecord(issuerKey).catch(() => undefined) : undefined,
    ]);
    bridgeOffer = {
      id: latestOffer.id,
      title: latestOffer.title,
      assetKind: latestOffer.assetKind,
      hasFilingFacts: filingFacts !== null,
      hasTrackRecord: trackRecord !== undefined,
    };
  }

  return (
    <>
      <HomeHero />
      <CategoryGrid />
      <IntroBand />
      <ChecklistBand bridgeOffer={bridgeOffer} />
    </>
  );
}
