import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import {
  VERDICT_SECTION_TITLE,
  verdictTotalsLead,
} from "@/lib/content/category-landing";
import { VERDICT_CAPTIONS } from "@/lib/content/verdict-captions";
import { formatKstDateTime } from "@/lib/verify/report/format";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import type { CategoryVerdictTotals } from "./category-landing-model";
import s from "./category.module.css";

const VERDICTS = ["match", "mismatch", "unverifiable"] as const;

const verdictMarkClass = (verdict: (typeof VERDICTS)[number]): string => {
  if (verdict === "match") return s.tileMarkMatch;
  if (verdict === "mismatch") return s.tileMarkMiss;
  return s.tileMarkUnknown;
};

export function CategoryVerdictSection({
  title,
  evidenceCount,
  totalItems,
  totals,
  latestGeneratedAt,
}: {
  readonly title: string;
  readonly evidenceCount: number;
  readonly totalItems: number;
  readonly totals: CategoryVerdictTotals;
  readonly latestGeneratedAt: string | undefined;
}) {
  return (
    <section className={s.slot} aria-labelledby={`${title}-verdicts`}>
      <Reveal className={s.slotGrid}>
        <h2 id={`${title}-verdicts`} className={s.slotTitle}>
          {VERDICT_SECTION_TITLE}
        </h2>
        {evidenceCount > 0 ? (
          <div>
            <p className={s.slotLead}>
              {verdictTotalsLead(evidenceCount, totalItems)}
            </p>
            <div className={s.tileRow}>
              {VERDICTS.map((verdict) => (
                <div key={verdict} className={s.tile}>
                  <span className={s.tileLabel}>
                    <span
                      className={`${s.tileMark} ${verdictMarkClass(verdict)}`}
                    />
                    {VERDICT_LABEL[verdict]}
                  </span>
                  <span className={s.tileNum}>
                    <CountUp value={totals[verdict]} />
                    <small>건</small>
                  </span>
                  <span className={s.tileCaption}>
                    {VERDICT_CAPTIONS[verdict]}
                  </span>
                </div>
              ))}
            </div>
            <p className={s.tallyMeta}>
              공개 리포트 {evidenceCount}건 합산 · 최근 대조{" "}
              {latestGeneratedAt ? formatKstDateTime(latestGeneratedAt) : "—"}
            </p>
          </div>
        ) : (
          <p className={s.emptyNote}>
            공개된 대조 결과가 아직 없습니다 — 검증 경로가 연결되면 같은 형식으로
            표시됩니다.
          </p>
        )}
      </Reveal>
    </section>
  );
}
