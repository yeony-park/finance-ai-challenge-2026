"use client";

import { m } from "motion/react";
import { useState } from "react";

import { MOTION_DURATION, MOTION_EASE } from "@/components/motion/tokens";
import { useReducedMotionSafe } from "@/components/motion/useReducedMotionSafe";
import type { AmendmentReplayView } from "@/lib/verify/amend/replay-view";

import { IconAlert } from "./icons";
import s from "./report.module.css";

const PANEL_RISE = 6;

interface AmendmentReplayProps {
  readonly replay: AmendmentReplayView;
}

export function AmendmentReplay({ replay }: AmendmentReplayProps) {
  const isReduced = useReducedMotionSafe();
  const [index, setIndex] = useState(0);

  const stages = replay.stages;
  const current = Math.min(index, stages.length - 1);
  const stage = stages[current];
  if (!stage) return null;

  const hover = isReduced ? undefined : { scale: 1.02 };
  const tap = isReduced ? undefined : { scale: 0.97 };
  const transition = { duration: MOTION_DURATION.fast, ease: MOTION_EASE };

  return (
    <div className={s.replayCard}>
      <div className={s.replayHead}>
        <h3 className={s.replayTitle}>{replay.heading}</h3>
        <span className={s.replayBadge}>{replay.badge}</span>
      </div>
      <p className={s.replayLead}>{replay.lead}</p>

      <p className={s.replayDisclosure}>
        <IconAlert className={s.ic} />
        <span>{replay.disclosure}</span>
      </p>

      <ol className={s.stageNav}>
        {stages.map((item, i) => (
          <li key={item.id}>
            <m.button
              type="button"
              className={s.stageChip}
              aria-current={i === current ? "step" : undefined}
              onClick={() => setIndex(i)}
              whileHover={hover}
              whileTap={tap}
              transition={transition}
            >
              <span className={s.stageChipNo}>{i + 1}</span>
              {item.name}
            </m.button>
          </li>
        ))}
      </ol>

      <div className={s.stagePanel} aria-live="polite">
        <m.div
          key={stage.id}
          initial={isReduced ? false : { opacity: 0, y: PANEL_RISE }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE }}
        >
          <p className={s.stageTitle}>{stage.title}</p>
          <p className={s.stageSummary}>{stage.summary}</p>

          {stage.rows.length > 0 ? (
            <dl className={s.stageRows}>
              {stage.rows.map((row) => (
                <div key={row.id} className={s.stageRow}>
                  <dt className={s.stageRowLabel}>{row.label}</dt>
                  <dd className={s.stageRowDetail}>
                    {row.detail}
                    {row.diff ? (
                      <details className={s.rowDiff}>
                        <summary className={s.rowDiffSummary}>
                          정정 전 → 후 발췌 보기
                        </summary>
                        <div className={s.rowDiffBody}>
                          <div className={s.rowDiffCol}>
                            <span className={s.rowDiffTag}>정정 전</span>
                            <p className={s.rowDiffText}>
                              {row.diff.before.length > 0 ? row.diff.before : "—"}
                            </p>
                          </div>
                          <div className={s.rowDiffCol}>
                            <span className={`${s.rowDiffTag} ${s.rowDiffTagAfter}`}>
                              정정 후
                            </span>
                            <p className={s.rowDiffText}>
                              {row.diff.after.length > 0 ? row.diff.after : "—"}
                            </p>
                          </div>
                          <p className={s.rowDiffSource}>{row.diff.sourceNote}</p>
                        </div>
                      </details>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : stage.emptyText ? (
            <p className={s.stageEmpty}>{stage.emptyText}</p>
          ) : null}
        </m.div>
      </div>

      <div className={s.stageFoot}>
        <span className={s.stageStep}>
          {current + 1} / {stages.length}
        </span>
        <div className={s.stageMove}>
          <m.button
            type="button"
            className={s.stageButton}
            onClick={() => setIndex(current - 1)}
            disabled={current === 0}
            whileHover={current === 0 ? undefined : hover}
            whileTap={current === 0 ? undefined : tap}
            transition={transition}
          >
            이전 단계
          </m.button>
          <m.button
            type="button"
            className={`${s.stageButton} ${s.stageButtonPrimary}`}
            onClick={() => setIndex(current + 1)}
            disabled={current === stages.length - 1}
            whileHover={current === stages.length - 1 ? undefined : hover}
            whileTap={current === stages.length - 1 ? undefined : tap}
            transition={transition}
          >
            다음 단계
          </m.button>
        </div>
      </div>
    </div>
  );
}
