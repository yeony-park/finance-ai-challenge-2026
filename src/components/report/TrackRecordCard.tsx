import type { TrackRecordCardView } from "@/lib/verify/track-record/view";

import { IconInfo } from "./icons";
import { TRACK_RECORD_HEADING_ID } from "./ids";
import s from "./report.module.css";

export function TrackRecordCard({
  card,
  sectionTitle = false,
  visualSummary = false,
  showLead = true,
  showMeta = true,
  showNotice = true,
}: {
  readonly card: TrackRecordCardView;
  readonly sectionTitle?: boolean;
  readonly visualSummary?: boolean;
  readonly showLead?: boolean;
  readonly showMeta?: boolean;
  readonly showNotice?: boolean;
}) {
  const Title = sectionTitle ? "h2" : "h3";

  return (
    <section
      className={visualSummary ? s.trackCardVisual : s.trackCard}
      aria-labelledby={TRACK_RECORD_HEADING_ID}
    >
      <header className={s.trackHead}>
        <Title
          id={TRACK_RECORD_HEADING_ID}
          className={`${s.trackTitle} ${sectionTitle ? s.trackSectionTitle : ""}`}
        >
          {card.title}
        </Title>
        {showLead ? <p className={s.trackLead}>{card.lead}</p> : null}
      </header>

      {visualSummary ? (
        <>
          <dl className={s.trackMetrics}>
            {card.metrics.map((metric) => (
              <div
                className={s.trackMetric}
                data-tone={metric.tone}
                key={metric.id}
              >
                <dt>{metric.label}</dt>
                <dd>
                  {metric.value.toLocaleString("ko-KR")}
                  <small>건</small>
                </dd>
              </div>
            ))}
          </dl>

          <details className={`${s.trackDetails} ${s.questionDetails}`}>
            <summary className={s.trackDetailsSummary}>
              집계 근거와 회차 기록 {card.facts.length}건 보기
            </summary>
            <ul className={s.trackFacts}>
              {card.facts.map((fact) => (
                <li className={s.trackFact} key={fact.id}>
                  <p className={s.trackFactText}>{fact.text}</p>
                  <p className={s.trackFactSource}>{fact.source}</p>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <ul className={s.trackFacts}>
          {card.facts.map((fact) => (
            <li className={s.trackFact} key={fact.id}>
              <p className={s.trackFactText}>{fact.text}</p>
              <p className={s.trackFactSource}>{fact.source}</p>
            </li>
          ))}
        </ul>
      )}

      {showMeta ? <p className={s.trackMeta}>{card.meta}</p> : null}

      {showNotice ? (
        <div className={s.honesty}>
          <IconInfo className={s.ic} />
          <span>{card.notice}</span>
        </div>
      ) : null}
    </section>
  );
}
