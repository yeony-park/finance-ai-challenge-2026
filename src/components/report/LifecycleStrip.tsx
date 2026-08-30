import type { OfferSchedule } from "@/components/site/offers";
import {
  buildLifecycleStages,
  LIFECYCLE_TITLE,
} from "@/lib/content/lifecycle";
import type { AssetKind } from "@/lib/verify/types";

import s from "./report.module.css";

const STATE_CLASS = {
  done: s.lcDone,
  current: s.lcCurrent,
  pending: s.lcPending,
} as const;

export function LifecycleStrip({
  schedule,
  assetKind,
  isExitVerified = false,
}: {
  readonly schedule: OfferSchedule;
  readonly assetKind: AssetKind;
  readonly isExitVerified?: boolean;
}) {
  const stages = buildLifecycleStages({
    phase: schedule.phase,
    assetKind,
    isExitVerified,
  });

  return (
    <section className={s.lifecycle} aria-label={LIFECYCLE_TITLE}>
      <div className={`${s.wrap} ${s.lifecycleWrap}`}>
        <ol className={s.lcRow}>
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className={`${s.lcStage} ${STATE_CLASS[stage.state]}`}
              aria-current={stage.state === "current" ? "step" : undefined}
            >
              <span className={s.lcDot} aria-hidden="true">
                {index + 1}
              </span>
              <span className={s.lcLabel}>{stage.label}</span>
              {stage.note ? <span className={s.lcNote}>{stage.note}</span> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
