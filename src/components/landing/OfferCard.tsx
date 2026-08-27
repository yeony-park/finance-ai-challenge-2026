import Link from "next/link";

import { Pressable } from "@/components/motion/Pressable";
import type { OfferCardView } from "@/lib/verify/report/view-model";
import type { TallyView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";
import {
  OfferWatchControl,
  OfferWatchIconButton,
} from "./OfferWatchControl";
import { OfferWatchFlag } from "./OfferWatchFlag";

const TONE_CLASS: Record<TallyView["tone"], string> = {
  good: s.toneGood,
  warn: s.toneWarn,
  unk: s.toneUnk,
};

export function OfferCard({ card }: { readonly card: OfferCardView }) {
  const titleId = `offer-${card.id}-title`;
  const isOpen = card.schedule.phase === "open";
  const isUpcoming = card.schedule.phase === "upcoming";

  return (
    <Pressable hover={1.01} tap={0.99}>
      <article className={s.offerCard} aria-labelledby={titleId}>
        <div className={s.offerTop}>
          <p className={s.offerAsset}>{card.assetLabel}</p>
          <span className={s.offerFlags}>
            {!isUpcoming ? <OfferWatchFlag offerId={card.id} /> : null}
            <span className={isOpen ? `${s.dday} ${s.ddayOpen}` : s.dday}>
              {card.schedule.badge}
            </span>
            {isUpcoming ? (
              <OfferWatchIconButton
                offerId={card.id}
                offerTitle={card.title}
              />
            ) : null}
          </span>
        </div>

        <h3 id={titleId} className={s.offerTitle}>
          {card.title}
        </h3>
        <p className={s.schedule}>{card.schedule.label}</p>

        <p className={s.offerVerdict}>{card.verdictLine}</p>

        <ul className={s.tallyInline}>
          {card.tallies.map((tally) => (
            <li key={tally.label} className={s.tallyInlineItem}>
              <span className={`${s.tallyInlineValue} ${TONE_CLASS[tally.tone]}`}>
                {tally.value}
              </span>
              <span>{tally.label}</span>
            </li>
          ))}
        </ul>

        <p className={s.offerMeta}>{card.lastVerifiedAt}</p>

        <OfferWatchControl
          offerId={card.id}
          offerTitle={card.title}
          statusText={card.amendment}
          isAlert={card.hasAmendment}
          showToggle={!isUpcoming}
        />

        <Link href={card.href} className={s.offerLink}>
          리포트 열기
          <span className={s.arrow} aria-hidden="true">
            →
          </span>
        </Link>
      </article>
    </Pressable>
  );
}
