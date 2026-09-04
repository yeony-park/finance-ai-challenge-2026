"use client";

import { type KeyboardEvent, useRef } from "react";

import type { ReportSection } from "./report-sections";
import s from "./report.module.css";

export function ReportChapterNav({
  sections,
  activeId,
  onSelect,
}: {
  readonly sections: readonly ReportSection[];
  readonly activeId: string;
  readonly onSelect: (sectionId: string) => void;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectByKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % sections.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + sections.length) % sections.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = sections.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    onSelect(sections[nextIndex].id);
  };

  return (
    <nav className={s.chapterNav} aria-label="리포트 목차">
      <div className={s.chapterNavRow} role="tablist" aria-label="리포트 섹션">
        {sections.map((section, index) => (
          <button
            key={section.id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={`report-tab-${section.id}`}
            type="button"
            role="tab"
            className={s.chapterLink}
            data-active={activeId === section.id}
            aria-selected={activeId === section.id}
            aria-controls="report-section-panel"
            tabIndex={activeId === section.id ? 0 : -1}
            onClick={() => onSelect(section.id)}
            onKeyDown={(event) => selectByKeyboard(event, index)}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
