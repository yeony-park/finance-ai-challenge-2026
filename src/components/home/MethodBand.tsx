import Link from "next/link";

import { AI_ROLE_SENTENCE, METHOD_LAYERS, VERDICT_SENTENCE } from "@/lib/content/home";

import s from "./home.module.css";

export function MethodBand({ coverage }: { readonly coverage: string }) {
  return (
    <section
      className={`${s.section} ${s.sectionCloud}`}
      aria-labelledby="method-band-title"
    >
      <div className={s.wrap}>
        <h2 id="method-band-title" className={s.sectionTitle}>
          어떻게 검증하나
        </h2>
        <p className={s.sectionLead}>
          검증은 공시 내용과 공공 원장의 대조에 한정됩니다 — 세 층위로 나눠
          실측합니다.
        </p>
        <div className={s.methodGrid}>
          {METHOD_LAYERS.map((layer) => (
            <div key={layer.name} className={s.card}>
              <h3 className={s.methodName}>{layer.name}</h3>
              <p className={s.methodDetail}>{layer.detail}</p>
            </div>
          ))}
        </div>
        <p className={s.sectionLead}>{AI_ROLE_SENTENCE}</p>
        <p className={s.verdictLine}>{VERDICT_SENTENCE}</p>
        <p className={s.coverage}>{coverage}</p>
        <Link href="/methodology" className={s.bandLink}>
          판정 기준과 한계 전체 보기 →
        </Link>
      </div>
    </section>
  );
}
