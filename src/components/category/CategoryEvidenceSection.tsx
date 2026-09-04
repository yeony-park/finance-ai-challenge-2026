import { CategoryOfferCardGrid } from "@/components/landing/CategoryOfferCard";
import { OfferCard } from "@/components/landing/OfferCard";
import offerStyles from "@/components/landing/landing.module.css";
import { Reveal } from "@/components/motion/Reveal";
import { OFFERS_SECTION_TITLE } from "@/lib/content/category-landing";
import type { SubscriptionPhase } from "@/components/site/offers";

import type { OfferEvidence } from "./category-landing-model";
import base from "./category.module.css";

interface CategoryEvidenceSectionProps {
  readonly className?: string;
  readonly title: string;
  readonly evidence: readonly OfferEvidence[];
  readonly visibleEvidence: readonly OfferEvidence[];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly preview: readonly string[] | null;
}

export function CategoryEvidenceSection({
  className,
  title,
  evidence,
  visibleEvidence,
  analysisStatus,
  preview,
}: CategoryEvidenceSectionProps) {
  const listedEvidence = [...visibleEvidence]
    .sort(
      (left, right) =>
        Date.parse(right.offer.subscription.opensAt) -
        Date.parse(left.offer.subscription.opensAt),
    );

  return (
    <section
      className={`${base.slot} ${className ?? ""}`}
      aria-labelledby={`${title}-evidence`}
    >
      <Reveal className={base.slotGrid}>
        <h2
          id={`${title}-evidence`}
          className={offerStyles.categoryOfferSectionTitle}
        >
          {OFFERS_SECTION_TITLE}
        </h2>
        {listedEvidence.length > 0 ? (
          <CategoryOfferCardGrid>
            {listedEvidence.map((entry) => (
              <OfferCard key={entry.offer.id} card={entry.card} />
            ))}
          </CategoryOfferCardGrid>
        ) : analysisStatus !== null && evidence.length > 0 ? (
          <p className={base.emptyNote}>선택한 상태에 해당하는 공모가 없습니다.</p>
        ) : preview ? (
          <ul className={base.previewList}>
            {preview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className={base.emptyNote}>
            이 카테고리에는 아직 공개 리포트가 없습니다.
          </p>
        )}
      </Reveal>
    </section>
  );
}
