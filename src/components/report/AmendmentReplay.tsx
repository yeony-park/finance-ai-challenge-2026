import type { AmendmentReplayView } from "@/lib/verify/amend/replay-view";

import { IconAlert } from "./icons";
import s from "./report.module.css";

interface AmendmentReplayProps {
  readonly replay: AmendmentReplayView;
}

export function AmendmentReplay({ replay }: AmendmentReplayProps) {
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

      <div className={s.stageStack}>
        {replay.stages.map((stage) => (
          <section key={stage.id} className={s.stageBlock} aria-label={stage.name}>
            <p className={s.stageBlockName}>{stage.name}</p>
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
                              <span
                                className={`${s.rowDiffTag} ${s.rowDiffTagAfter}`}
                              >
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
          </section>
        ))}
      </div>
    </div>
  );
}
