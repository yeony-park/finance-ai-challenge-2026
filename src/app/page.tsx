import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ChecklistBand } from "@/components/home/ChecklistBand";
import { HomeHero } from "@/components/home/HomeHero";
import { IntroBand } from "@/components/home/IntroBand";
import { WatchBand } from "@/components/home/WatchBand";
import { loadWatchSummaries } from "@/components/home/watch-summary";

export default async function Home() {
  const watchSummaries = await loadWatchSummaries();

  return (
    <>
      <HomeHero />
      <WatchBand entries={watchSummaries} />
      <IntroBand />
      <CategoryGrid />
      <ChecklistBand />
    </>
  );
}
