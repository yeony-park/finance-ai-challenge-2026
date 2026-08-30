"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { VERDICT_HEADING_ID } from "./ids";
import type { ReportSection } from "./report-sections";
import s from "./report.module.css";

export function ReportChapterNav({
  sections,
}: {
  readonly sections: readonly ReportSection[];
}) {
  const [activeId, setActiveId] = useState(VERDICT_HEADING_ID);

  const handleChapterClick = (
    event: MouseEvent<HTMLAnchorElement>,
    chapterId: string,
  ) => {
    const target = document.getElementById(chapterId);
    if (!target) return;

    event.preventDefault();

    const sectionStart =
      target.classList.contains(s.sectionAnchor) &&
      target.nextElementSibling instanceof HTMLElement
        ? target.nextElementSibling
        : target;
    const stickyBottom =
      event.currentTarget.closest("nav")?.getBoundingClientRect().bottom ?? 0;
    const targetTop = sectionStart.getBoundingClientRect().top + window.scrollY;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    window.history.pushState(null, "", `#${chapterId}`);
    window.scrollTo({
      top: Math.max(0, targetTop - stickyBottom),
      behavior,
    });
    setActiveId(chapterId);
  };

  useEffect(() => {
    let frame = 0;
    const visibleChapterIds = sections.map((section) => section.id);

    const updateActiveChapter = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const anchorOffset = Math.min(window.innerHeight * 0.42, 320);
        let nextId = visibleChapterIds[0] ?? VERDICT_HEADING_ID;

        visibleChapterIds.forEach((id) => {
          const heading = document.getElementById(id);
          if (heading && heading.getBoundingClientRect().top <= anchorOffset) {
            nextId = id;
          }
        });

        setActiveId(nextId);
      });
    };

    updateActiveChapter();
    window.addEventListener("scroll", updateActiveChapter, { passive: true });
    window.addEventListener("hashchange", updateActiveChapter);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveChapter);
      window.removeEventListener("hashchange", updateActiveChapter);
    };
  }, [sections]);

  return (
    <nav className={s.chapterNav} aria-label="리포트 목차">
      <div className={s.chapterNavRow}>
        {sections.map((section) => (
          <a
            key={section.id}
            className={s.chapterLink}
            href={`#${section.id}`}
            data-active={activeId === section.id}
            aria-current={activeId === section.id ? "location" : undefined}
            onClick={(event) => handleChapterClick(event, section.id)}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
