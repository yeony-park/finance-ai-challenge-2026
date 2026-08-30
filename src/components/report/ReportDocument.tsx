"use client";

import { Fragment, useState, type ReactNode } from "react";
import { useProfile } from "@/components/site/profile";
import type { NarrativeLevel } from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import type { ReportSection, ReportSectionKey } from "./report-sections";
import { VerdictHero } from "./VerdictHero";

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
  const level: ExplainLevel = levelOverride ?? profile.level ?? "easy";
  const content: Record<ReportSectionKey, ReactNode> = {
    verdict: (
      <VerdictHero
        view={view}
        level={level}
        narrative={narrative}
        lifecycle={lifecycle}
        onLevelChange={setLevelOverride}
      />
    ),
    filing: sectionContent.filing ?? null,
    watch: sectionContent.watch ?? null,
    history: sectionContent.history ?? null,
    reality: <RealitySection view={view} level={level} />,
    price: sectionContent.price ?? null,
  };

  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>{content[section.key]}</Fragment>
      ))}
    </>
  );
}
