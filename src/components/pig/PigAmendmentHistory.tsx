import {
  PIG_ISSUER,
  dartDocumentUrl,
  type PigDisclosureProduct,
} from "@/lib/content/pig";
import {
  PIG_EXTRA_DISTRIBUTION_FILING,
  PIG_REVIEW_COPY,
} from "@/lib/content/pig-review";

import s from "./pig.module.css";

export function PigAmendmentHistory({
  product,
}: {
  readonly product: PigDisclosureProduct;
}) {
  return (
    <div className={s.detail}>
      <section className={s.card} aria-labelledby="pig-amendment-title">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.sectionLabel}>{PIG_REVIEW_COPY.extraFiling.label}</p>
            <h3 className={s.sectionTitle} id="pig-amendment-title">
              {PIG_ISSUER.documentsHeading}
            </h3>
            <p className={s.sectionDescription}>
              {PIG_REVIEW_COPY.extraFiling.description}
            </p>
          </div>
          <span className={s.badge}>{PIG_REVIEW_COPY.extraFiling.badge}</span>
        </div>

        <div className={s.documentList}>
          <ul>
            {product.documents.map((document) => (
              <li key={document.rceptNo}>
                <div>
                  <strong>{document.label}</strong>
                  <span className={s.mono}>
                    {document.filedAt} · {document.rceptNo}
                  </span>
                </div>
                <a
                  href={dartDocumentUrl(document.rceptNo)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {PIG_ISSUER.documentLink}
                </a>
              </li>
            ))}
            <li>
              <div>
                <strong>{PIG_EXTRA_DISTRIBUTION_FILING.reportName}</strong>
                <span className={s.mono}>
                  {PIG_EXTRA_DISTRIBUTION_FILING.filedAt} ·{" "}
                  {PIG_EXTRA_DISTRIBUTION_FILING.rceptNo}
                </span>
              </div>
              <a
                href={dartDocumentUrl(PIG_EXTRA_DISTRIBUTION_FILING.rceptNo)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {PIG_REVIEW_COPY.extraFiling.linkLabel}
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
