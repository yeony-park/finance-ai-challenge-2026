"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useProfile } from "@/components/site/profile";
import type { NarrativeLevel } from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { ReportChapterNav } from "./ReportChapterNav";
import type { ReportSection, ReportSectionKey } from "./report-sections";
import { VerdictHero } from "./VerdictHero";

const REPORT_SECTION_PANEL_ID = "report-section-panel";

export const reportSectionIdFromHash = (
  hash: string,
  sections: readonly ReportSection[],
): string | null => {
  const sectionId = hash.startsWith("#") ? hash.slice(1) : hash;
  return sections.some((section) => section.id === sectionId) ? sectionId : null;
};

export type ReportSectionContent = Partial<
  Record<ReportSectionKey, ReactNode>
>;

export function ReportDocument({
  view,
  narrative = null,
  lifecycle,
  sections,
  sectionContent,
}: {
  readonly view: DemoView;
  readonly narrative?: Readonly<Record<ExplainLevel, NarrativeLevel>> | null;
  readonly lifecycle?: ReactNode;
  readonly sections: readonly ReportSection[];
  readonly sectionContent: ReportSectionContent;
}) {
  const profile = useProfile();
  const [levelOverride, setLevelOverride] = useState<ExplainLevel | null>(null);
  const defaultSectionId = sections[0]?.id ?? "";
  const [activeId, setActiveId] = useState(defaultSectionId);
  const level: ExplainLevel = levelOverride ?? profile.level ?? "easy";
  const content: ReportSectionContent = {
    ...sectionContent,
    verdict: (
      <VerdictHero
        view={view}
        level={level}
        narrative={narrative}
        lifecycle={lifecycle}
        onLevelChange={setLevelOverride}
      />
    ),
    reality: <RealitySection view={view} level={level} />,
  };
  const activeSection =
    sections.find((section) => section.id === activeId) ?? sections[0];

  useEffect(() => {
    const syncSectionFromHash = () => {
      setActiveId(
        reportSectionIdFromHash(window.location.hash, sections) ?? defaultSectionId,
      );
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("popstate", syncSectionFromHash);

    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("popstate", syncSectionFromHash);
    };
  }, [defaultSectionId, sections]);

  const handleSectionSelect = (sectionId: string) => {
    if (!sections.some((section) => section.id === sectionId)) return;
    if (sectionId === activeSection.id) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    setActiveId(sectionId);
    const hash = `#${sectionId}`;
    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, "", hash);
    }
  };

  if (!activeSection) return null;

  return (
    <>
      <ReportChapterNav
        sections={sections}
        activeId={activeSection.id}
        onSelect={handleSectionSelect}
      />
      <div
        id={REPORT_SECTION_PANEL_ID}
        role="tabpanel"
        aria-labelledby={`report-tab-${activeSection.id}`}
      >
        {content[activeSection.key] ?? null}
      </div>
    </>
  );
}
