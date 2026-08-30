"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type UIEvent } from "react";

import { AI_ROLE_SENTENCE, INTRO_CARDS, METHOD_STEP_TITLE } from "@/lib/content/home";

import content from "./home-content.module.css";
import layout from "./home.module.css";
import { IntroRoadStep } from "./IntroRoadStep";
import { HomeSectionFrame, HomeSectionHeader } from "./HomeSection";
import s from "./IntroBand.module.css";

const AUTO_ADVANCE_MS = 30_000;

export function IntroBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const roadmapRef = useRef<HTMLOListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSectionInView, setIsSectionInView] = useState(false);
  const [sectionVisit, setSectionVisit] = useState(0);
  const cardCount = INTRO_CARDS.length + 1;

  const goToCard = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), cardCount - 1);
    setActiveIndex(nextIndex);
  };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let wasInView = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && !wasInView) {
          wasInView = true;
          setActiveIndex(0);
          setSectionVisit((visit) => visit + 1);
          setIsSectionInView(true);
          return;
        }
        if (!entry.isIntersecting) {
          wasInView = false;
          setIsSectionInView(false);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

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
    if (
      !isSectionInView ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const timerId = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % cardCount);
    }, AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timerId);
  }, [activeIndex, cardCount, isSectionInView]);

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
    <HomeSectionFrame
      sectionRef={sectionRef}
      className={`${layout.sectionCloud} ${s.introSection}`}
      containerClassName={s.wrap}
      labelledBy="intro-band-title"
    >
        <HomeSectionHeader
          titleId="intro-band-title"
          title="조각투자 첫걸음"
          className={s.introSectionHead}
          titleClassName={s.sectionTitle}
        />
        <ol
          key={sectionVisit}
          ref={roadmapRef}
          className={s.roadmap}
          onScroll={handleScroll}
          style={{ "--road-auto-duration": `${AUTO_ADVANCE_MS}ms` } as CSSProperties}
        >
          {INTRO_CARDS.map((card, index) => (
            <IntroRoadStep
              key={card.id}
              id={`guide-${card.id}`}
              index={index}
              title={card.title}
              body={card.body}
              sources={card.sources}
              action={
                card.id === "checklist" ? (
                  <a
                    href="#checklist"
                    className={`${content.bandLink} ${s.bandLink}`}
                  >
                    확인 질문 8가지 보기 →
                  </a>
                ) : null
              }
              isActive={activeIndex === index}
              onSelect={() => goToCard(index)}
            />
          ))}
          <IntroRoadStep
            index={INTRO_CARDS.length}
            title={METHOD_STEP_TITLE}
            body={[AI_ROLE_SENTENCE]}
            action={
              <Link
                href="/methodology"
                className={`${content.bandLink} ${s.bandLink}`}
              >
                판정 기준과 한계 전체 보기 →
              </Link>
            }
            isActive={activeIndex === INTRO_CARDS.length}
            onSelect={() => goToCard(INTRO_CARDS.length)}
          />
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
        </div>
    </HomeSectionFrame>
  );
}
