import { GuideIcon } from "@/components/site/icons";
import { INTRO_CARDS } from "@/lib/content/home";

import s from "./home.module.css";

export function IntroBand() {
  return (
    <section
      className={`${s.section} ${s.sectionCloud}`}
      aria-labelledby="intro-band-title"
    >
      <div className={s.wrap}>
        <h2 id="intro-band-title" className={s.sectionTitle}>
          조각투자 첫걸음
        </h2>
        <p className={s.sectionLead}>
          시작 여부와 무관하게, 구조를 알고 확인한 뒤 결정할 수 있도록 공적 출처가
          있는 사실만 안내합니다.
        </p>
        <div className={s.cardGrid}>
          {INTRO_CARDS.map((card) => (
            <article key={card.id} id={`guide-${card.id}`} className={s.card}>
              <span className={s.cardIcon}>
                <GuideIcon target={card.id} />
              </span>
              <h3 className={s.cardTitle}>{card.title}</h3>
              <div className={s.cardBody}>
                {card.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <ul className={s.sourceList}>
                {card.sources.map((source) => (
                  <li key={source.url}>
                    출처:{" "}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
