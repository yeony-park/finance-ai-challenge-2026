import { RichText } from "@/components/site/RichText";
import type { RichText as RichTextParts } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";

export function HeroSection({ coverage }: { readonly coverage: RichTextParts }) {
  return (
    <section className={`${s.section} ${s.hero}`} aria-labelledby="hero-title">
      <div className={`${s.wrap} ${s.heroCopy}`}>
        <h1 id="hero-title" className={s.heroTitle}>
          <span>증권신고서를</span>
          <span className={s.heroTitleLead}>
            <em className={s.mark}>국가 공공데이터</em>와 대조합니다
          </span>
        </h1>

        <p className={s.coverage}>
          <RichText parts={coverage} strongClassName={s.coverageStrong} />
        </p>
      </div>
    </section>
  );
}
