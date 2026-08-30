import type { SubscriptionPhase } from "@/components/site/offers";
import {
  getPigProduct,
  PIG_DISCLOSURE_PRODUCTS,
  PIG_FILING,
} from "@/lib/content/pig";
import { PIG_EXTRA_DISTRIBUTION_FILING } from "@/lib/content/pig-review";
import type { FilingFacts } from "@/lib/verify/report/filing-facts";
import type { Verdict } from "@/lib/verify/types";

import { PigDisclosureDetail } from "./PigDisclosureDetail";
import { PigDisclosureGallery } from "./PigDisclosureGallery";
import { PigReviewSections } from "./PigReviewSections";
import s from "./pig.module.css";

interface PigLandingProps {
  readonly selectedProductId?: string;
  readonly filingFacts?: readonly FilingFacts[];
  readonly analysisStatus?: SubscriptionPhase | null;
  readonly analysisVerdict?: Verdict | null;
}

const dartAsOf = (): string => {
  const dates = PIG_DISCLOSURE_PRODUCTS.flatMap((product) =>
    product.documents.map((document) => document.filedAt),
  )
    .concat(PIG_EXTRA_DISTRIBUTION_FILING.filedAt)
    .sort();
  return dates.at(-1) ?? "";
};

export function PigLanding({
  selectedProductId,
  filingFacts,
  analysisStatus = null,
  analysisVerdict = null,
}: PigLandingProps) {
  const selected = getPigProduct(selectedProductId);
  const matchesFilters =
    (analysisStatus === null || analysisStatus === "closed") &&
    (analysisVerdict === null || analysisVerdict === "unverifiable");
  const visibleProducts = matchesFilters ? PIG_DISCLOSURE_PRODUCTS : [];
  const selectedFacts = filingFacts?.find(
    (facts) => facts.offerId === `pig-${selected.round}`,
  );

  return (
    <div className={s.landing}>
      <PigDisclosureGallery
        products={visibleProducts}
        selectedProductId={selected.id}
        analysisStatus={analysisStatus}
        analysisVerdict={analysisVerdict}
      />

      <PigReviewSections product={selected} />

      <PigDisclosureDetail
        product={selected}
        allProducts={PIG_DISCLOSURE_PRODUCTS}
        dartAsOf={dartAsOf()}
      />

      {selectedFacts && selectedFacts.facts.length > 0 && (
        <section className={s.axes} aria-labelledby="pig-filing-title">
          <p className={s.sectionLabel}>{PIG_FILING.label}</p>
          <h3 className={s.sectionTitle} id="pig-filing-title">
            {PIG_FILING.title}
          </h3>
          <p>{PIG_FILING.description}</p>
          <dl>
            {selectedFacts.facts.map((fact) => (
              <div key={fact.id}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
