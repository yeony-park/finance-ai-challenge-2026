"use client";

import Link from "next/link";
import { useRef, useState, type UIEvent } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { AI_ROLE_SENTENCE, INTRO_CARDS, METHOD_STEP_TITLE } from "@/lib/content/home";

import s from "./home.module.css";

const stepNo = (index: number): string => String(index + 1).padStart(2, "0");

export function IntroBand() {
  const roadmapRef = useRef<HTMLOListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardCount = INTRO_CARDS.length + 1;

  const goToCard = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), cardCount - 1);
    const roadmap = roadmapRef.current;
    const card = roadmap?.children.item(nextIndex) as HTMLElement | null;
    if (roadmap && card) {
      roadmap.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
      setActiveIndex(nextIndex);
    }
  };

  const handleScroll = (event: UIEvent<HTMLOListElement>) => {
    const roadmap = event.currentTarget;
    const cards = Array.from(roadmap.children) as HTMLElement[];
    if (cards.length === 0) return;
    const nearest = cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - roadmap.scrollLeft) <
      Math.abs(cards[best]!.offsetLeft - roadmap.scrollLeft)
        ? index
        : best,
    0);
    setActiveIndex(nearest);
  };

  return (
    <section
      className={`${s.section} ${s.sectionCloud} ${s.introSection}`}
      aria-labelledby="intro-band-title"
    >
      <div className={s.wrap}>
        <header className={`${s.sectionHead} ${s.introSectionHead}`}>
          <h2 id="intro-band-title" className={s.sectionTitle}>
            조각투자 첫걸음
          </h2>
        </header>
        <ol ref={roadmapRef} className={s.roadmap} onScroll={handleScroll}>
          {INTRO_CARDS.map((card, index) => (
            <Reveal
              key={card.id}
              as="li"
              id={`guide-${card.id}`}
              className={`${s.roadStep} ${
                activeIndex === index ? s.roadStepActive : ""
              }`}
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
          <Reveal
            as="li"
            className={`${s.roadStep} ${
              activeIndex === INTRO_CARDS.length ? s.roadStepActive : ""
            }`}
          >
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
        <div className={s.roadControls} aria-label="첫걸음 카드 이동">
          <button
            type="button"
            className={s.roadControlButton}
            onClick={() => goToCard(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="이전 카드"
          >
            ←
          </button>
          <button
            type="button"
            className={s.roadControlButton}
            onClick={() => goToCard(activeIndex + 1)}
            disabled={activeIndex === cardCount - 1}
            aria-label="다음 카드"
          >
            →
          </button>
          <span className={s.roadPosition} aria-live="polite">
            {stepNo(activeIndex)} / {stepNo(cardCount - 1)}
          </span>
        </div>
      </div>
    </section>
  );
}
