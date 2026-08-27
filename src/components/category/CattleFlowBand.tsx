import Image from "next/image";

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
      <div className={s.flowSection}>
        <p className={`${base.slotLead} ${s.flowLead}`}>
          {CATTLE_FLOW_LEAD}
        </p>
        <ol className={s.flowRow}>
          {CATTLE_FLOW_STEPS.map((step, index) => (
            <li key={step.id} className={s.flowStep}>
              <div className={s.flowMeta}>
                <h3 className={s.flowName}>
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}.
                  </span>
                  {step.name}
                </h3>
                <span className={s.flowLayer}>{step.layer}</span>
              </div>
              <p className={s.flowCheck}>{step.check}</p>
              <Image
                src={`/cattle-flow-${step.id}-3d.png`}
                alt=""
                width={512}
                height={512}
                sizes="(max-width: 640px) 12.75rem, (max-width: 900px) 15rem, 13.5rem"
                className={s.flowIcon}
              />
            </li>
          ))}
        </ol>
      </div>
      <section className={s.termSection} aria-labelledby="cattle-terms-title">
        <h3 id="cattle-terms-title" className={s.termTitle}>
          {CATTLE_TERMS_TITLE}
        </h3>
        <dl className={s.termList}>
          {CATTLE_TERMS.map((item) => (
            <div key={item.term} className={s.termItem}>
              <dt className={s.termName}>{item.term}</dt>
              <dd className={s.termEasy}>{item.easy}</dd>
              <dd className={s.termWhy}>
                {item.why} 자세한 기준은{" "}
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.source.label}
                </a>
                {"에서 확인할 수 있습니다."}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
