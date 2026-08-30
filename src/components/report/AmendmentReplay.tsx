import type {
  AmendmentReplayView,
  DiffTextSegment,
} from "@/lib/verify/amend/replay-view";

import s from "./report.module.css";

interface AmendmentReplayProps {
  readonly replay: AmendmentReplayView;
}

function DiffText({
  segments,
  fallback,
  markClass,
}: {
  readonly segments: readonly DiffTextSegment[];
  readonly fallback: string;
  readonly markClass: string;
}) {
  if (segments.length === 0) return <>{fallback}</>;
  return (
    <>
      {segments.map((segment, index) =>
        segment.isChanged ? (
          <mark key={index} className={markClass}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

export function AmendmentReplay({ replay }: AmendmentReplayProps) {
  return (
    <div className={s.replayCard}>
      <div className={s.replayHead}>
        <h3 className={s.replayTitle}>{replay.heading}</h3>
        <span className={s.replayBadge}>{replay.badge}</span>
      </div>
      <p className={s.replayLead}>{replay.lead}</p>

      <div className={s.stageStack}>
        {replay.stages.map((stage, index) => (
          <section key={stage.id} className={s.stageBlock} aria-label={stage.name}>
            <div className={s.stageBlockHead}>
              <span className={s.stageStep} aria-hidden="true">
                {index + 1}
              </span>
              <p className={s.stageBlockName}>{stage.name}</p>
            </div>
            <p className={s.stageTitle}>{stage.title}</p>
            <p className={s.stageSummary}>{stage.summary}</p>

            {stage.rows.length > 0 ? (
              <details className={s.stageDetails}>
                <summary className={s.stageDetailsSummary}>
                  세부 기록 {stage.rows.length}건 보기
                </summary>
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
                                  <DiffText
                                    segments={row.diff.beforeSegments}
                                    fallback="—"
                                    markClass={s.rowDiffMarkBefore}
                                  />
                                </p>
                              </div>
                              <div className={s.rowDiffCol}>
                                <span
                                  className={`${s.rowDiffTag} ${s.rowDiffTagAfter}`}
                                >
                                  정정 후
                                </span>
                                <p className={s.rowDiffText}>
                                  <DiffText
                                    segments={row.diff.afterSegments}
                                    fallback="—"
                                    markClass={s.rowDiffMarkAfter}
                                  />
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
              </details>
            ) : stage.emptyText ? (
              <p className={s.stageEmpty}>{stage.emptyText}</p>
            ) : null}
          </section>
        ))}
      </div>

      <details className={`${s.supportingDetails} ${s.questionDetails}`}>
        <summary className={s.supportingSummary}>재대조 기준 보기</summary>
        <div className={s.supportingTextBody}>
          <p>{replay.disclosure}</p>
        </div>
      </details>
    </div>
  );
}
