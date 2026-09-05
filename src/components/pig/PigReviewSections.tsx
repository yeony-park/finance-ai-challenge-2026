import {
  PIG_MARKET,
  dartDocumentUrl,
  type PigDisclosureProduct,
} from "@/lib/content/pig";
import {
  LIVESTOCK_TRACE_URL,
  PIG_EXTRA_DISTRIBUTION_FILING,
  PIG_REVIEW_COPY,
  buildPigReviewInsights,
  buildPigReviewLayerRows,
  buildPigReviewLayerTitle,
  buildPigReviewSourceState,
} from "@/lib/content/pig-review";

import s from "./PigReviewSections.module.css";

export interface PigReviewSectionsProps {
  readonly product: PigDisclosureProduct;
  readonly summaryOnly?: boolean;
}

interface SectionHeadingProps {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly badge: string;
}

function SectionHeading({
  id,
  title,
  description,
  badge,
}: SectionHeadingProps) {
  return (
    <header className={s.sectionHeading}>
      <div>
        <h3 className={s.sectionTitle} id={id}>
          {title}
        </h3>
        <p className={s.sectionDescription}>{description}</p>
      </div>
      <span className={s.badge}>{badge}</span>
    </header>
  );
}

const insightClassName = (
  key: "document" | "constraint" | "next",
): string => {
  if (key === "document") return `${s.insightCard} ${s.insightDocument}`;
  if (key === "constraint") return `${s.insightCard} ${s.insightConstraint}`;
  return `${s.insightCard} ${s.insightNext}`;
};

export function PigReviewGuide() {
  return (
    <div className={s.sections}>
      <section
        className={s.card}
        aria-labelledby="pig-review-beginner-title"
      >
        <SectionHeading
          id="pig-review-beginner-title"
          title={PIG_REVIEW_COPY.beginner.title}
          description={PIG_REVIEW_COPY.beginner.description}
          badge={PIG_REVIEW_COPY.beginner.badge}
        />

        <ol
          className={s.stepGrid}
          aria-label={PIG_REVIEW_COPY.beginner.stepsAriaLabel}
        >
          {PIG_REVIEW_COPY.beginner.steps.map((step) => (
            <li className={s.stepCard} key={step.number}>
              <span className={s.stepNumber}>{step.number}</span>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>

        <div className={s.equation}>
          <p className={s.srOnly}>
            {PIG_REVIEW_COPY.beginner.equationAriaLabel}
          </p>
          <div className={s.equationVisual} aria-hidden="true">
            {PIG_REVIEW_COPY.beginner.equation.map((part, index) => (
              <span
                className={
                  part.kind === "term" ? s.equationTerm : s.equationOperator
                }
                key={`${part.kind}-${index}`}
              >
                {part.text}
              </span>
            ))}
          </div>
        </div>

        <div className={s.termsBlock}>
          <h4>{PIG_REVIEW_COPY.beginner.termsTitle}</h4>
          <dl className={s.termGrid}>
            {PIG_REVIEW_COPY.beginner.terms.map((item) => (
              <div className={s.termCard} key={item.term}>
                <dt>{item.term}</dt>
                <dd>{item.definition}</dd>
              </div>
            ))}
          </dl>
          <a
            className={s.sourceLink}
            href={PIG_REVIEW_COPY.beginner.guideUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {PIG_REVIEW_COPY.beginner.guideLinkLabel}
          </a>
        </div>
      </section>
    </div>
  );
}

export function PigReviewSections({
  product,
  summaryOnly = false,
}: PigReviewSectionsProps) {
  const layerRows = buildPigReviewLayerRows(product);
  const insights = buildPigReviewInsights(product);
  const sourceState = buildPigReviewSourceState(product, PIG_MARKET);

  return (
    <div className={s.sections} id="pig-review">
      <section
        className={s.card}
        aria-labelledby="pig-review-layer-title"
      >
        <SectionHeading
          id="pig-review-layer-title"
          title={buildPigReviewLayerTitle(product)}
          description={PIG_REVIEW_COPY.layerReview.description}
          badge={PIG_REVIEW_COPY.layerReview.badge}
        />

        <div
          className={s.tableWrap}
          role="region"
          aria-label={PIG_REVIEW_COPY.layerReview.tableCaption}
          tabIndex={0}
        >
          <table className={s.layerTable}>
            <caption className={s.srOnly}>
              {PIG_REVIEW_COPY.layerReview.tableCaption}
            </caption>
            <thead>
              <tr>
                {PIG_REVIEW_COPY.layerReview.tableHeaders.map((header) => (
                  <th scope="col" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {layerRows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>
                    <span
                      className={
                        row.tone === "document"
                          ? `${s.status} ${s.statusDocument}`
                          : `${s.status} ${s.statusUnknown}`
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>{row.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={s.insightGrid}>
          {insights.map((insight) => (
            <article className={insightClassName(insight.key)} key={insight.key}>
              <span>{insight.label}</span>
              <h4>{insight.title}</h4>
              <p>{insight.body}</p>
            </article>
          ))}
        </div>
      </section>

      {!summaryOnly ? (
        <>
      <section
        className={`${s.card} ${s.compactCard}`}
        aria-labelledby="pig-review-extra-filing-title"
      >
        <SectionHeading
          id="pig-review-extra-filing-title"
          title={PIG_REVIEW_COPY.extraFiling.title}
          description={PIG_REVIEW_COPY.extraFiling.description}
          badge={PIG_REVIEW_COPY.extraFiling.badge}
        />

        <div className={s.filingNote}>
          <div>
            <time dateTime={PIG_EXTRA_DISTRIBUTION_FILING.filedAt}>
              {PIG_EXTRA_DISTRIBUTION_FILING.filedAt}
            </time>
            <strong>{PIG_EXTRA_DISTRIBUTION_FILING.reportName}</strong>
            <p>{PIG_REVIEW_COPY.extraFiling.body}</p>
          </div>
          <a
            className={s.sourceLink}
            href={dartDocumentUrl(PIG_EXTRA_DISTRIBUTION_FILING.rceptNo)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {PIG_REVIEW_COPY.extraFiling.linkLabel}
          </a>
        </div>
      </section>

      <section
        className={s.card}
        aria-labelledby="pig-review-questions-title"
      >
        <SectionHeading
          id="pig-review-questions-title"
          title={PIG_REVIEW_COPY.questions.title}
          description={PIG_REVIEW_COPY.questions.description}
          badge={PIG_REVIEW_COPY.questions.badge}
        />

        <ol
          className={s.questionList}
          aria-label={PIG_REVIEW_COPY.questions.listAriaLabel}
        >
          {PIG_REVIEW_COPY.questions.items.map((question, index) => (
            <li key={question}>
              <span aria-hidden="true">{index + 1}</span>
              <p>{question}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        className={s.card}
        aria-labelledby="pig-review-sources-title"
      >
        <SectionHeading
          id="pig-review-sources-title"
          title={PIG_REVIEW_COPY.sources.title}
          description={PIG_REVIEW_COPY.sources.description}
          badge={PIG_REVIEW_COPY.sources.badge}
        />

        <div
          className={s.sourceGrid}
          aria-label={PIG_REVIEW_COPY.sources.gridAriaLabel}
        >
          <article className={s.sourceCard}>
            <span>{PIG_REVIEW_COPY.sources.dart.label}</span>
            <strong>{sourceState.dartValue}</strong>
            <p>{PIG_REVIEW_COPY.sources.dart.detail}</p>
            <a
              className={s.sourceLink}
              href={product.settlement.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {PIG_REVIEW_COPY.sources.dart.linkLabel}
            </a>
          </article>

          <article className={s.sourceCard}>
            <span>{PIG_REVIEW_COPY.sources.livestockTrace.label}</span>
            <strong>{PIG_REVIEW_COPY.sources.livestockTrace.value}</strong>
            <p>{PIG_REVIEW_COPY.sources.livestockTrace.detail}</p>
            <a
              className={s.sourceLink}
              href={LIVESTOCK_TRACE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {PIG_REVIEW_COPY.sources.livestockTrace.linkLabel}
            </a>
          </article>

          <article className={s.sourceCard}>
            <span>{PIG_REVIEW_COPY.sources.market.label}</span>
            <strong>{sourceState.marketValue}</strong>
            <p>{sourceState.marketDetail}</p>
            <a
              className={s.sourceLink}
              href={PIG_MARKET.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {PIG_REVIEW_COPY.sources.market.linkLabel}
            </a>
          </article>
        </div>

        <p className={s.disclaimer}>{PIG_REVIEW_COPY.sources.disclaimer}</p>
      </section>
        </>
      ) : null}
    </div>
  );
}
