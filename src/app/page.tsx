import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ChecklistBand } from "@/components/home/ChecklistBand";
import { HomeHero } from "@/components/home/HomeHero";
import { IntroBand } from "@/components/home/IntroBand";
import { latestOfferEntry, OFFERS } from "@/components/site/offers";

export default function Home() {
  const bridgeOffer = latestOfferEntry(OFFERS);

  return (
    <>
      <HomeHero />
      <CategoryGrid />
      <IntroBand />
      <ChecklistBand
        bridgeOffer={
          bridgeOffer ? { id: bridgeOffer.id, title: bridgeOffer.title } : null
        }
      />
    </>
  );
}
