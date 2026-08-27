import {
  CATTLE_FLOW_LEAD,
  CATTLE_FLOW_STEPS,
  CATTLE_TERMS,
  CATTLE_TERMS_TITLE,
} from "@/lib/content/cattle";

import base from "./category.module.css";
import s from "./CattleFlowBand.module.css";

export function CattleFlowBand() {
  return (
    <>
      <p className={base.slotLead}>{CATTLE_FLOW_LEAD}</p>
      <ol className={s.flowRow}>
        {CATTLE_FLOW_STEPS.map((step, index) => (
          <li key={step.id} className={s.flowStep}>
            <div className={s.flowVisual} aria-hidden="true">
              <span className={s.flowIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={s.flowLayer}>{step.layer}</span>
            </div>
            <h3 className={s.flowName}>{step.name}</h3>
            <p className={s.flowCheck}>{step.check}</p>
          </li>
        ))}
      </ol>
      <h3 className={base.groupTitle}>{CATTLE_TERMS_TITLE}</h3>
      <dl className={s.termList}>
        {CATTLE_TERMS.map((item) => (
          <div key={item.term} className={s.termItem}>
            <dt className={s.termName}>{item.term}</dt>
            <dd className={s.termEasy}>{item.easy}</dd>
            <dd className={s.termWhy}>
              {item.why} · 확인 경로:{" "}
              <a href={item.source.url} target="_blank" rel="noopener noreferrer">
                {item.source.label}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
