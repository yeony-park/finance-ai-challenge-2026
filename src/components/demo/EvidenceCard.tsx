/**
 * 근거 병치 카드 — 신고서 기재(좌)와 국가 원장 관측(우)을 나란히 놓는다.
 * 개체 버튼의 aria-controls가 가리키는 대상이므로 id는 개체 번호에서 파생한다.
 */
import { Fragment, type Ref } from "react";

import type { ExplainLevel, FocusView } from "@/lib/verify/report/view-model";

import { IconAlert, IconDb, IconDoc } from "./icons";
import { Rich } from "./Rich";
import { evidenceCardId } from "./screens";
import s from "./demo.module.css";

export function EvidenceCard({
  focus,
  level,
  ref,
}: {
  focus: FocusView;
  level: ExplainLevel;
  ref: Ref<HTMLDivElement>;
}) {
  return (
    <div className={s.evidence} id={evidenceCardId(focus.no)} ref={ref}>
      <h5>
        <IconAlert className={s.ic} /> {focus.title}
      </h5>
      <div className={s.evCols}>
        <div className={s.evCol}>
          <div className={s.evColH}>{focus.claimHeading}</div>
          <dl>
            {focus.claimRows.map((row) => (
              <Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd className={row.isAlert ? s.ddAlert : undefined}>
                  {row.value}
                  {row.note && <small className={s.rowNote}>{row.note}</small>}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
        <div className={s.evCol}>
          <div className={s.evColH}>{focus.ledgerHeading}</div>
          <dl>
            {focus.ledgerRows.map((row) => (
              <Fragment key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <span className={row.isAlert ? s.ddAlert : undefined}>
                    {row.value}
                  </span>
                  {row.note && <small className={s.rowNote}>{row.note}</small>}
                </dd>
              </Fragment>
            ))}
          </dl>
        </div>
      </div>
      <p className={s.evFoot}>
        <Rich parts={focus.foot[level]} />
      </p>
      <div className={s.srcLine}>
        <span>
          <IconDoc className={s.ic} /> {focus.sourceDoc}
        </span>
        <span>
          <IconDb className={s.ic} /> {focus.sourceLedger}
        </span>
      </div>
    </div>
  );
}
