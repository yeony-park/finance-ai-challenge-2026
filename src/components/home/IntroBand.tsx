import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { AI_ROLE_SENTENCE, INTRO_CARDS, METHOD_STEP_TITLE } from "@/lib/content/home";

import s from "./home.module.css";

const stepNo = (index: number): string => String(index + 1).padStart(2, "0");

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
          있는 사실만 순서대로 안내합니다.
        </p>
        <ol className={s.roadmap}>
          {INTRO_CARDS.map((card, index) => (
            <Reveal
              key={card.id}
              as="li"
              id={`guide-${card.id}`}
              className={s.roadStep}
            >
              <span className={s.roadNo} aria-hidden="true">
                {stepNo(index)}
              </span>
              <div className={s.roadBody}>
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
                {card.id === "checklist" ? (
                  <a href="#checklist" className={s.bandLink}>
                    확인 질문 8가지 보기 →
                  </a>
                ) : null}
              </div>
            </Reveal>
          ))}
          <Reveal as="li" className={s.roadStep}>
            <span className={s.roadNo} aria-hidden="true">
              {stepNo(INTRO_CARDS.length)}
            </span>
            <div className={s.roadBody}>
              <h3 className={s.cardTitle}>{METHOD_STEP_TITLE}</h3>
              <div className={s.cardBody}>
                <p>{AI_ROLE_SENTENCE}</p>
              </div>
              <Link href="/methodology" className={s.bandLink}>
                판정 기준과 한계 전체 보기 →
              </Link>
            </div>
          </Reveal>
        </ol>
      </div>
    </section>
  );
}
