"use client";

import { useState } from "react";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { VerdictHero } from "./VerdictHero";

export function ReportDocument({ view }: { readonly view: DemoView }) {
  const [level, setLevel] = useState<ExplainLevel>("easy");

  return (
    <>
      <VerdictHero view={view} level={level} onLevelChange={setLevel} />
      <RealitySection view={view} level={level} />
    </>
  );
}
