"use client";

import { useState } from "react";
import type { NarrativeLevel } from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { VerdictHero } from "./VerdictHero";

export function ReportDocument({
  view,
  narrative = null,
}: {
  readonly view: DemoView;
  readonly narrative?: Readonly<Record<ExplainLevel, NarrativeLevel>> | null;
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
      <RealitySection view={view} level={level} />
    </>
  );
}
