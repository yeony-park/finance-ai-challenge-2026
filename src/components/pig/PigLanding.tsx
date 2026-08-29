import {
  getPigProduct,
  PIG_AXES,
  PIG_DISCLOSURE_PRODUCTS,
  PIG_FILING,
} from "@/lib/content/pig";
import type { FilingFacts } from "@/lib/verify/report/filing-facts";

import { PigDisclosureDetail } from "./PigDisclosureDetail";
import { PigDisclosureGallery } from "./PigDisclosureGallery";
import s from "./pig.module.css";

interface PigLandingProps {
  readonly selectedProductId?: string;
  readonly filingFacts?: readonly FilingFacts[];
}

const dartAsOf = (): string => {
  const dates = PIG_DISCLOSURE_PRODUCTS.flatMap((product) =>
    product.documents.map((document) => document.filedAt),
  ).sort();
  return dates.at(-1) ?? "";
};

export function PigLanding({
  selectedProductId,
  filingFacts,
}: PigLandingProps) {
  const selected = getPigProduct(selectedProductId);
  const selectedFacts = filingFacts?.find(
    (facts) => facts.offerId === `pig-${selected.round}`,
  );

  return (
    <div className={s.landing}>
      <section className={s.axes} aria-labelledby="pig-axes-title">
        <p className={s.sectionLabel}>{PIG_AXES.eyebrow}</p>
        <h3 className={s.sectionTitle} id="pig-axes-title">
          {PIG_AXES.title}
        </h3>
        <div className={s.axesGrid}>
          <article className={s.axisFilled}>
            <span className={s.axisTag}>{PIG_AXES.disclosureLabel}</span>
            <p>{PIG_AXES.disclosureBody}</p>
          </article>
          <article className={s.axisPending}>
            <span className={s.axisTag}>
              {PIG_AXES.ledgerLabel}
              <b className={s.axisVerdict}>{PIG_AXES.ledgerVerdict}</b>
            </span>
            <p>{PIG_AXES.ledgerBody}</p>
          </article>
        </div>
      </section>

      <PigDisclosureGallery
        products={PIG_DISCLOSURE_PRODUCTS}
        selectedProductId={selected.id}
      />

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
