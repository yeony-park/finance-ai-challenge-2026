"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type UIEvent } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { AI_ROLE_SENTENCE, INTRO_CARDS, METHOD_STEP_TITLE } from "@/lib/content/home";

import s from "./home.module.css";

const stepNo = (index: number): string => String(index + 1).padStart(2, "0");
const AUTO_ADVANCE_MS = 30_000;

export function IntroBand() {
  const roadmapRef = useRef<HTMLOListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardCount = INTRO_CARDS.length + 1;

  const goToCard = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), cardCount - 1);
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const roadmap = roadmapRef.current;
      const card = roadmap?.children.item(activeIndex) as HTMLElement | null;
      if (!roadmap || !card) return;
      const centeredLeft =
        card.offsetLeft - Math.max((roadmap.clientWidth - card.offsetWidth) / 2, 0);
      roadmap.scrollTo({ left: Math.max(centeredLeft, 0), behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeIndex]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timerId = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % cardCount);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timerId);
  }, [activeIndex, cardCount]);

  const handleScroll = (event: UIEvent<HTMLOListElement>) => {
    if (!window.matchMedia("(max-width: 980px)").matches) return;
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
        <ol
          ref={roadmapRef}
          className={s.roadmap}
          onScroll={handleScroll}
          style={{ "--road-auto-duration": `${AUTO_ADVANCE_MS}ms` } as CSSProperties}
        >
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
                <svg className={s.roadNoRing} viewBox="0 0 48 48">
                  <circle className={s.roadNoTrack} cx="24" cy="24" r="22" />
                  <circle
                    className={s.roadNoProgress}
                    cx="24"
                    cy="24"
                    r="22"
                    pathLength="1"
                  />
                </svg>
                <span className={s.roadNoLabel}>{stepNo(index)}</span>
              </span>
              <div className={s.roadBody}>
                <h3 className={s.cardTitle}>{card.title}</h3>
                <div className={s.roadDetails}>
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
              </div>
              {activeIndex !== index ? (
                <button
                  type="button"
                  className={s.roadStepSelect}
                  onClick={() => goToCard(index)}
                  aria-label={`${card.title} 카드 펼치기`}
                />
              ) : null}
            </Reveal>
          ))}
          <Reveal
            as="li"
            className={`${s.roadStep} ${
              activeIndex === INTRO_CARDS.length ? s.roadStepActive : ""
            }`}
          >
            <span className={s.roadNo} aria-hidden="true">
              <svg className={s.roadNoRing} viewBox="0 0 48 48">
                <circle className={s.roadNoTrack} cx="24" cy="24" r="22" />
                <circle
                  className={s.roadNoProgress}
                  cx="24"
                  cy="24"
                  r="22"
                  pathLength="1"
                />
              </svg>
              <span className={s.roadNoLabel}>{stepNo(INTRO_CARDS.length)}</span>
            </span>
            <div className={s.roadBody}>
              <h3 className={s.cardTitle}>{METHOD_STEP_TITLE}</h3>
              <div className={s.roadDetails}>
                <div className={s.cardBody}>
                  <p>{AI_ROLE_SENTENCE}</p>
                </div>
                <Link href="/methodology" className={s.bandLink}>
                  판정 기준과 한계 전체 보기 →
                </Link>
              </div>
            </div>
            {activeIndex !== INTRO_CARDS.length ? (
              <button
                type="button"
                className={s.roadStepSelect}
                onClick={() => goToCard(INTRO_CARDS.length)}
                aria-label={`${METHOD_STEP_TITLE} 카드 펼치기`}
              />
            ) : null}
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
