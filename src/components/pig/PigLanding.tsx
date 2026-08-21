import {
  getPigProduct,
  PIG_AXES,
  PIG_DISCLOSURE_PRODUCTS,
} from "@/lib/content/pig";

import { PigDisclosureDetail } from "./PigDisclosureDetail";
import { PigDisclosureGallery } from "./PigDisclosureGallery";
import s from "./pig.module.css";

interface PigLandingProps {
  readonly selectedProductId?: string;
}

const dartAsOf = (): string => {
  const dates = PIG_DISCLOSURE_PRODUCTS.flatMap((product) =>
    product.documents.map((document) => document.filedAt),
  ).sort();
  return dates.at(-1) ?? "";
};

export function PigLanding({ selectedProductId }: PigLandingProps) {
  const selected = getPigProduct(selectedProductId);

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
    </div>
  );
}
