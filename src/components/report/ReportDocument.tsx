"use client";

import { useState, type ReactNode } from "react";
import { useProfile } from "@/components/site/profile";
import type { NarrativeLevel } from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { VerdictHero } from "./VerdictHero";

export function ReportDocument({
  view,
  narrative = null,
  overview = null,
  lifecycle = null,
  children,
}: {
  readonly view: DemoView;
  readonly narrative?: Readonly<Record<ExplainLevel, NarrativeLevel>> | null;
  readonly overview?: ReactNode;
  readonly lifecycle?: ReactNode;
  readonly children?: ReactNode;
}) {
  const profile = useProfile();
  const [levelOverride, setLevelOverride] = useState<ExplainLevel | null>(null);
  const level: ExplainLevel = levelOverride ?? profile.level ?? "easy";

  return (
    <>
      <VerdictHero
        view={view}
        level={level}
        narrative={narrative}
        overview={overview}
        lifecycle={lifecycle}
        onLevelChange={setLevelOverride}
      />
      {children}
      <RealitySection view={view} level={level} />
    </>
  );
}
