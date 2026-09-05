import { PIG_AXES, PIG_DISCLOSURE_PRODUCTS } from "@/lib/content/pig";

import { PigDisclosureSummary } from "./PigDisclosureSummary";
import { PigReviewGuide } from "./PigReviewSections";
import s from "./pig.module.css";

export function PigAboutContent() {
  return (
    <div className={s.landing}>
      <section className={s.axes} aria-labelledby="pig-axes-title">
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

      <PigDisclosureSummary products={PIG_DISCLOSURE_PRODUCTS} />
      <PigReviewGuide />
    </div>
  );
}
