import type { SubscriptionPhase } from "@/components/site/offers";
import { PIG_DISCLOSURE_PRODUCTS } from "@/lib/content/pig";

import { PigDisclosureGallery } from "./PigDisclosureGallery";
import s from "./pig.module.css";

interface PigLandingProps {
  readonly analysisStatus?: SubscriptionPhase | null;
  readonly searchQuery?: string;
}

export function PigLanding({
  analysisStatus = null,
  searchQuery = "",
}: PigLandingProps) {
  const matchesFilters = analysisStatus === null || analysisStatus === "closed";
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR");
  const visibleProducts = matchesFilters
    ? PIG_DISCLOSURE_PRODUCTS.filter((product) =>
        normalizedQuery === ""
          ? true
          : [
              product.productName,
              `한돈 ${product.round}호`,
              product.statusLabel,
              product.farm.name,
              product.farm.region,
              product.farm.supplier,
            ].some((value) =>
              value.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
            ),
      )
    : [];

  return (
    <div className={s.landing}>
      <PigDisclosureGallery products={visibleProducts} />
    </div>
  );
}
