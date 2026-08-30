import type { OfferSchedule } from "@/components/site/offers";
import {
  buildLifecycleStages,
  LIFECYCLE_TITLE,
  type LifecycleStageView,
} from "@/lib/content/lifecycle";
import type { AssetKind, RealEstateAssetLifecycle } from "@/lib/verify/types";

import s from "./report.module.css";

const STATE_CLASS = {
  done: s.lcDone,
  current: s.lcCurrent,
  pending: s.lcPending,
} as const;

export function LifecycleStrip({
  schedule,
  assetKind,
  assetLifecycle,
  isExitVerified = false,
}: {
  readonly schedule: OfferSchedule;
  readonly assetKind: AssetKind;
  readonly assetLifecycle?: RealEstateAssetLifecycle;
  readonly isExitVerified?: boolean;
}) {
  const stages =
    assetKind === "real-estate" &&
    assetLifecycle === "settled" &&
    !isExitVerified
      ? ([
          { id: "subscription", label: "청약", state: "done", note: "종료" },
          { id: "allotment", label: "배정·납입", state: "done", note: "경과" },
          {
            id: "holding",
            label: "운영·보유",
            state: "done",
            note: "운영사 발표 기준 완료",
          },
          {
            id: "exit",
            label: "매각·정산",
            state: "current",
            note: "외부 종료 검증 미확인",
          },
        ] satisfies readonly LifecycleStageView[])
      : buildLifecycleStages({
          phase: schedule.phase,
          assetKind,
          assetLifecycle,
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
