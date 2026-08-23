import type { TrackRecordCardView } from "@/lib/verify/track-record/view";

import { IconInfo } from "./icons";
import { TRACK_RECORD_HEADING_ID } from "./ids";
import s from "./report.module.css";

export function TrackRecordCard({
  card,
}: {
  readonly card: TrackRecordCardView;
}) {
  return (
    <section
      className={s.trackCard}
      aria-labelledby={TRACK_RECORD_HEADING_ID}
    >
      <header className={s.trackHead}>
        <h3 id={TRACK_RECORD_HEADING_ID} className={s.trackTitle}>
          {card.title}
        </h3>
        <p className={s.trackLead}>{card.lead}</p>
      </header>

      <ul className={s.trackFacts}>
        {card.facts.map((fact) => (
          <li className={s.trackFact} key={fact.id}>
            <p className={s.trackFactText}>{fact.text}</p>
            <p className={s.trackFactSource}>{fact.source}</p>
          </li>
        ))}
      </ul>

      <p className={s.trackMeta}>{card.meta}</p>

      <div className={s.honesty}>
        <IconInfo className={s.ic} />
        <span>{card.notice}</span>
      </div>
    </section>
  );
}
