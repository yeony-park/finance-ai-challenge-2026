import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ChecklistBand } from "@/components/home/ChecklistBand";
import { HomeHero } from "@/components/home/HomeHero";
import { IntroBand } from "@/components/home/IntroBand";
import { MethodBand } from "@/components/home/MethodBand";
import { OnboardingBand } from "@/components/home/OnboardingBand";
import { WatchBand } from "@/components/home/WatchBand";
import { loadWatchSummaries } from "@/components/home/watch-summary";
import { OFFERS, TOTAL_2026_OFFER_COUNT } from "@/components/site/offers";
import { coverageSentence } from "@/lib/content/home";

const isCohort2026 = (closesAt: string): boolean =>
  new Date(closesAt).getFullYear() === 2026;

export default async function Home() {
  const cohort2026 = OFFERS.filter((offer) =>
    isCohort2026(offer.subscription.closesAt),
  ).length;
  const pastClosed = OFFERS.length - cohort2026;
  const watchSummaries = await loadWatchSummaries();

  return (
    <>
      <HomeHero />
      <WatchBand entries={watchSummaries} />
      <OnboardingBand />
      <IntroBand />
      <CategoryGrid />
      <MethodBand
        coverage={coverageSentence(cohort2026, TOTAL_2026_OFFER_COUNT, pastClosed)}
      />
      <ChecklistBand />
    </>
  );
}
