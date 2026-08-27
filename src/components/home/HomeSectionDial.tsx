"use client";

import { HOME_DIAL_SECTIONS } from "./home-hero-config";
import s from "./HomeHeroVisual.module.css";

export function HomeSectionDial({
  activeSection,
  onSelect,
}: {
  readonly activeSection: number;
  readonly onSelect: (index: number) => void;
}) {
  return (
    <nav className={s.sectionDial} aria-label="홈 구간 이동">
      {HOME_DIAL_SECTIONS.map((section, index) => (
        <button
          key={section.label}
          type="button"
          className={`${s.sectionDialButton} ${
            activeSection === index ? s.sectionDialButtonActive : ""
          }`}
          onClick={() => onSelect(index)}
          aria-current={activeSection === index ? "step" : undefined}
          aria-label={section.label}
          title={section.label}
        />
      ))}
    </nav>
  );
}
