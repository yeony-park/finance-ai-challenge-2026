"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  CARD_DESIGN_COPY as copy,
  CARD_DESIGN_OPTIONS,
  CARD_DESIGN_SAMPLES,
  type CardDesignSample,
  type CardDesignVariant,
} from "@/lib/content/card-designs";

import s from "./card-designs.module.css";

const variantClasses: Record<CardDesignVariant, string> = {
  yellowFrame: s.yellowFrame,
  passport: s.passport,
  splitBrief: s.splitBrief,
  categoryCanvas: s.categoryCanvas,
  guidedSteps: s.guidedSteps,
};

function VerificationSummary({ sample }: { readonly sample: CardDesignSample }) {
  return (
    <section className={s.verification} aria-label={copy.verificationStep}>
      <p className={s.stepLabel}>
        <span aria-hidden="true">3</span>
        {copy.verificationStep}
      </p>
      <p className={s.verificationNote}>{sample.verificationNote}</p>
      <dl className={s.verificationCounts}>
        <div className={s.matchCount}>
          <dt>{copy.match}</dt>
          <dd>{sample.verification.match}</dd>
        </div>
        <div className={s.mismatchCount}>
          <dt>{copy.mismatch}</dt>
          <dd>{sample.verification.mismatch}</dd>
        </div>
        <div className={s.unknownCount}>
          <dt>{copy.unknown}</dt>
          <dd>{sample.verification.unknown}</dd>
        </div>
      </dl>
    </section>
  );
}

function SampleCard({
  sample,
  optionId,
}: {
  readonly sample: CardDesignSample;
  readonly optionId: string;
}) {
  const titleId = `${optionId}-${sample.id}-title`;

  return (
    <article className={s.card} aria-labelledby={titleId}>
      <div className={s.media}>
        <Image
          src={sample.image}
          alt={sample.imageAlt}
          fill
          sizes="(max-width: 44rem) calc(100vw - 2rem), (max-width: 68rem) 44vw, 20rem"
          className={s.image}
        />
        <span className={s.assetCode}>{sample.code}</span>
        <div className={s.mediaBadges}>
          <span className={s.categoryBadge}>{sample.category}</span>
          <span className={s.statusBadge}>{sample.status}</span>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.textBadges} aria-hidden="true">
          <span className={s.categoryBadge}>{sample.category}</span>
          <span className={s.statusBadge}>{sample.status}</span>
        </div>

        <header className={s.cardHeader}>
          <p className={s.provider}>{sample.provider}</p>
          <h3 id={titleId}>{sample.title}</h3>
          <p className={s.description}>{sample.description}</p>
        </header>

        <section className={s.primaryFact} aria-label={copy.primaryStep}>
          <p className={s.stepLabel}>
            <span aria-hidden="true">1</span>
            {copy.primaryStep}
          </p>
          <span>{sample.primaryLabel}</span>
          <strong>{sample.primaryValue}</strong>
        </section>

        <section className={s.factsSection} aria-label={copy.assetStep}>
          <p className={s.stepLabel}>
            <span>2</span>
            {copy.assetStep}
          </p>
          <dl className={s.facts}>
            {sample.facts.map((fact) => (
              <div className={s.fact} key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <VerificationSummary sample={sample} />

        <footer className={s.cardFooter}>
          <span>
            {copy.checkedAt} {sample.checkedAt}
          </span>
          <Link href={sample.href} className={s.cardLink}>
            {copy.reportLink} <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </div>
    </article>
  );
}

export function CardDesignLab() {
  const [activeId, setActiveId] = useState(CARD_DESIGN_OPTIONS[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeOption =
    CARD_DESIGN_OPTIONS.find((option) => option.id === activeId) ??
    CARD_DESIGN_OPTIONS[0];
  const selectedOption = CARD_DESIGN_OPTIONS.find(
    (option) => option.id === selectedId,
  );

  return (
    <div className={s.page}>
      <section className={s.hero} aria-labelledby="card-design-title">
        <p className={s.eyebrow}>{copy.eyebrow}</p>
        <div className={s.heroGrid}>
          <h1 id="card-design-title">
            {copy.titleLineOne}
            <span>{copy.titleLineTwo}</span>
          </h1>
          <div className={s.heroCopy}>
            <p>
              {copy.leadPrefix}
              <strong>{copy.leadStrong}</strong>
              {copy.leadSuffix}
            </p>
            <p className={s.notice}>{copy.sampleNotice}</p>
          </div>
        </div>
      </section>

      <nav className={s.tabs} aria-label={copy.tabLabel}>
        <div>
          {CARD_DESIGN_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              id={`${option.id}-tab`}
              aria-controls={`${option.id}-panel`}
              aria-pressed={activeId === option.id}
              className={activeId === option.id ? s.activeTab : s.tab}
              onClick={() => setActiveId(option.id)}
            >
              <span>{option.number}</span>
              {option.name}
            </button>
          ))}
        </div>
      </nav>

      <section
        id={`${activeOption.id}-panel`}
        aria-labelledby={`${activeOption.id}-tab`}
        className={`${s.panel} ${variantClasses[activeOption.variant]}`}
      >
        <header className={s.optionHeader}>
          <div className={s.optionIdentity}>
            <span className={s.optionNumber}>{activeOption.number}</span>
            <div>
              <div className={s.optionName}>
                <h2>{activeOption.name}</h2>
                {activeOption.baseline ? (
                  <span className={s.baseline}>{copy.baseline}</span>
                ) : null}
              </div>
              <p>{activeOption.summary}</p>
            </div>
          </div>
          <button
            type="button"
            className={
              selectedId === activeOption.id
                ? s.selectedButton
                : s.selectButton
            }
            aria-pressed={selectedId === activeOption.id}
            onClick={() => setSelectedId(activeOption.id)}
          >
            {selectedId === activeOption.id ? copy.selected : copy.select}
          </button>
        </header>

        <div className={s.rationale}>
          <p>
            <strong>{copy.strength}</strong>
            {activeOption.strength}
          </p>
          <p>
            <strong>{copy.tradeoff}</strong>
            {activeOption.tradeoff}
          </p>
        </div>

        <div className={s.grid}>
          {CARD_DESIGN_SAMPLES.map((sample) => (
            <SampleCard
              key={`${activeOption.id}-${sample.id}`}
              sample={sample}
              optionId={activeOption.id}
            />
          ))}
        </div>
      </section>

      <aside className={s.selection} aria-live="polite">
        <div>
          <span>{copy.selectionLabel}</span>
          <strong>
            {selectedOption
              ? `${selectedOption.number} · ${selectedOption.name}`
              : copy.selectionEmpty}
          </strong>
          <p>
            {selectedOption ? copy.selectionDoneNote : copy.selectionEmptyNote}
          </p>
        </div>
        {selectedOption ? (
          <button type="button" onClick={() => setSelectedId(null)}>
            {copy.clearSelection}
          </button>
        ) : (
          <span className={s.selectionHint}>01—05</span>
        )}
      </aside>
    </div>
  );
}
