"use client";

import { useState, type ReactNode } from "react";
import type { NarrativeLevel } from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { VerdictHero } from "./VerdictHero";

export function ReportDocument({
  view,
  narrative = null,
  children,
}: {
  readonly view: DemoView;
  readonly narrative?: Readonly<Record<ExplainLevel, NarrativeLevel>> | null;
  readonly children?: ReactNode;
}) {
  const [level, setLevel] = useState<ExplainLevel>("easy");

  return (
    <>
      <VerdictHero
        view={view}
        level={level}
        narrative={narrative}
        onLevelChange={setLevel}
      />
      {children}
      <RealitySection view={view} level={level} />
    </>
  );
}
