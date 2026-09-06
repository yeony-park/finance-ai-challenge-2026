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
                sizes="(max-width: 640px) 16.5rem, (max-width: 1100px) 20rem, 20.25rem"
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
        <div className={s.termProse}>
          {CATTLE_TERMS.map((item) => (
            <p key={item.source.url}>{item.text}</p>
          ))}
        </div>
        <div className={s.termSources}>
          {CATTLE_TERMS.map((item) => (
            <a
              key={item.source.url}
              href={item.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.source.label}
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
