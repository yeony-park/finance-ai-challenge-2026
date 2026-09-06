import { pigOfferingSchedule } from "@/lib/content/pig-offering-schedule";
import type { CategoryPageSearchParams } from "@/lib/content/category-tabs";
import type { SubscriptionPhase } from "@/components/site/offers";
import { searchPigDisclosureProducts } from "@/lib/content/pig";

import { PigDisclosureGallery } from "./PigDisclosureGallery";
import s from "./pig.module.css";

interface PigLandingProps {
  readonly analysisStatus?: SubscriptionPhase | null;
  readonly searchQuery?: string;
  readonly catalogSearchParams?: CategoryPageSearchParams;
}

export function PigLanding({
  analysisStatus = null,
  searchQuery = "",
  catalogSearchParams = {},
}: PigLandingProps) {
  const now = new Date();
  const visibleProducts = searchPigDisclosureProducts(searchQuery).filter(
    (product) => analysisStatus === null || pigOfferingSchedule(product, now).phase === analysisStatus,
  );

  return (
    <div className={s.landing}>
      <PigDisclosureGallery products={visibleProducts} catalogSearchParams={catalogSearchParams} now={now} />
    </div>
  );
}
