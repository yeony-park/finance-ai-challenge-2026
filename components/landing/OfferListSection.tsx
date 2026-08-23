import { Reveal } from "@/components/motion/Reveal";
import type { OfferCardView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";
import { OfferCard } from "./OfferCard";

interface OfferListSectionProps {
  readonly id: string;
  readonly title: string;
  readonly cards: readonly OfferCardView[];
  readonly isMuted?: boolean;
}

export function OfferListSection({ id, title, cards, isMuted }: OfferListSectionProps) {
  if (cards.length === 0) return null;

  const headingId = `${id}-title`;

  return (
    <section
      id={id}
      className={isMuted ? `${s.section} ${s.sectionMuted}` : s.section}
      aria-labelledby={headingId}
    >
      <Reveal className={s.wrap}>
        <h2 id={headingId} className={s.groupTitle}>
          {title}
        </h2>

        <div className={s.offerGrid}>
          {cards.map((card) => (
            <OfferCard key={card.id} card={card} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
