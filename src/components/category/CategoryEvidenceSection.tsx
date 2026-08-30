import Link from "next/link";

import { CategoryOfferCardGrid } from "@/components/landing/CategoryOfferCard";
import { OfferCard } from "@/components/landing/OfferCard";
import { Reveal } from "@/components/motion/Reveal";
import { FILING_HEADING_ID } from "@/components/report/ids";
import {
  ACTIVE_GROUP_EMPTY,
  ACTIVE_GROUP_TITLE,
  CLOSED_GROUP_TITLE,
  FACT_STRIP_LINK,
  FACT_STRIP_TITLE,
  OFFERS_SECTION_LEAD,
  OFFERS_SECTION_TITLE,
} from "@/lib/content/category-landing";
import {
  TIMELINE_AMENDED,
  TIMELINE_FILED,
  TIMELINE_LEAD,
  TIMELINE_REPORT_LINK,
  TIMELINE_REVERIFIED,
  TIMELINE_REVERIFY_PENDING,
  TIMELINE_TITLE_SUFFIX,
} from "@/lib/content/event-timeline";
import type { SubscriptionPhase } from "@/components/site/offers";
import { formatKstDateTime, formatYmd8 } from "@/lib/verify/report/format";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";
import type { Verdict } from "@/lib/verify/types";

import homeContent from "@/components/home/home-content.module.css";
import type { OfferEvidence } from "./category-landing-model";
import base from "./category.module.css";
import s from "./CategoryEvidenceSection.module.css";

const countsSentence = (
  match: number,
  mismatch: number,
  unverifiable: number,
): string =>
  `${VERDICT_LABEL.match} ${match}건 · ${VERDICT_LABEL.mismatch} ${mismatch}건 · ${VERDICT_LABEL.unverifiable} ${unverifiable}건`;

function FactStrip({ entry }: { readonly entry: OfferEvidence }) {
  if (!entry.filingFacts) return null;
  const shorts = entry.filingFacts.facts.filter((fact) => fact.short);
  if (shorts.length === 0) return null;

  return (
    <div className={s.factStrip}>
      <span className={s.factStripTitle}>
        {entry.offer.title} {FACT_STRIP_TITLE}
      </span>
      {shorts.slice(0, 4).map((fact) => (
        <span key={fact.id} className={s.factStripItem}>
          {fact.short}
        </span>
      ))}
      <Link
        href={`/offers/${entry.offer.id}#${FILING_HEADING_ID}`}
        className={base.questionBridge}
      >
        {FACT_STRIP_LINK}
      </Link>
    </div>
  );
}

function OfferTimeline({ entry }: { readonly entry: OfferEvidence }) {
  if (!entry.watch || entry.watch.amendmentCount === 0) return null;
  const { watch } = entry;
  const isReverified =
    watch.amendments.at(-1)?.rcpNo === entry.loaded.report.document.rcpNo;

  return (
    <div className={base.timelineBlock}>
      <h4 className={base.timelineTitle}>
        {entry.offer.title} — {TIMELINE_TITLE_SUFFIX}
      </h4>
      <p className={base.slotLead}>{TIMELINE_LEAD}</p>
      <div className={s.timeline}>
        <div className={s.timelineEvent}>
          <span className={s.timelineDate}>
            {formatYmd8(watch.baseRcpNo.slice(0, 8))}
            <span className={s.timelineRcp}>rcpNo {watch.baseRcpNo}</span>
          </span>
          <span className={s.timelineName}>{TIMELINE_FILED}</span>
        </div>
        {watch.amendments.map((amendment) => (
          <div
            key={amendment.rcpNo}
            className={`${s.timelineEvent} ${s.timelineEventAmend}`}
          >
            <span className={s.timelineDate}>
              {formatYmd8(amendment.receivedOn)}
              <span className={s.timelineRcp}>rcpNo {amendment.rcpNo}</span>
            </span>
            <span className={s.timelineName}>{TIMELINE_AMENDED}</span>
            <span className={s.timelineDetail}>{amendment.reportName}</span>
          </div>
        ))}
        <div className={s.timelineEvent}>
          <span className={s.timelineDate}>
            {isReverified
              ? formatKstDateTime(entry.loaded.report.generatedAt)
              : formatKstDateTime(watch.checkedAt)}
          </span>
          <span className={s.timelineName}>
            {isReverified ? TIMELINE_REVERIFIED : TIMELINE_REVERIFY_PENDING}
          </span>
          {isReverified ? (
            <span className={s.timelineDetail}>
              {countsSentence(
                entry.loaded.report.summary.match,
                entry.loaded.report.summary.mismatch,
                entry.loaded.report.summary.unverifiable,
              )}
            </span>
          ) : null}
        </div>
      </div>
      <Link href={`/offers/${entry.offer.id}`} className={homeContent.bandLink}>
        {TIMELINE_REPORT_LINK}
      </Link>
    </div>
  );
}

interface CategoryEvidenceSectionProps {
  readonly className?: string;
  readonly title: string;
  readonly evidence: readonly OfferEvidence[];
  readonly visibleEvidence: readonly OfferEvidence[];
  readonly activeEvidence: readonly OfferEvidence[];
  readonly closedEvidence: readonly OfferEvidence[];
  readonly analysisStatus: SubscriptionPhase | null;
  readonly analysisVerdict: Verdict | null;
  readonly preview: readonly string[] | null;
}

export function CategoryEvidenceSection({
  className,
  title,
  evidence,
  visibleEvidence,
  activeEvidence,
  closedEvidence,
  analysisStatus,
  analysisVerdict,
  preview,
}: CategoryEvidenceSectionProps) {
  return (
    <section
      className={`${base.slot} ${className ?? ""}`}
      aria-labelledby={`${title}-evidence`}
    >
      <Reveal className={base.slotGrid}>
        <h2 id={`${title}-evidence`} className={base.slotTitle}>
          {OFFERS_SECTION_TITLE}
        </h2>
        <p className={base.slotLead}>{OFFERS_SECTION_LEAD}</p>
        {visibleEvidence.length > 0 ? (
          <>
            {analysisStatus !== "closed" ? (
              <>
                <h3 className={base.groupTitle}>{ACTIVE_GROUP_TITLE}</h3>
                {activeEvidence.length > 0 ? (
                  <>
                    <CategoryOfferCardGrid>
                      {activeEvidence.map((entry) => (
                        <OfferCard key={entry.offer.id} card={entry.card} />
                      ))}
                    </CategoryOfferCardGrid>
                    {activeEvidence.map((entry) => (
                      <FactStrip key={`facts-${entry.offer.id}`} entry={entry} />
                    ))}
                    {activeEvidence.map((entry) => (
                      <OfferTimeline key={entry.offer.id} entry={entry} />
                    ))}
                  </>
                ) : (
                  <p className={base.emptyNote}>{ACTIVE_GROUP_EMPTY}</p>
                )}
              </>
            ) : null}
            {analysisStatus === null || analysisStatus === "closed" ? (
              <>
                <h3 className={base.groupTitle}>{CLOSED_GROUP_TITLE}</h3>
                {closedEvidence.length > 0 ? (
                  <CategoryOfferCardGrid>
                    {closedEvidence.map((entry) => (
                      <OfferCard key={entry.offer.id} card={entry.card} />
                    ))}
                  </CategoryOfferCardGrid>
                ) : (
                  <p className={base.emptyNote}>
                    이 카테고리에는 아직 청약이 종료된 공모가 없습니다.
                  </p>
                )}
              </>
            ) : null}
          </>
        ) : (analysisStatus !== null || analysisVerdict !== null) &&
          evidence.length > 0 ? (
          <p className={base.emptyNote}>선택한 필터에 해당하는 공모가 없습니다.</p>
        ) : preview ? (
          <ul className={base.previewList}>
            {preview.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className={base.emptyNote}>
            이 카테고리에는 아직 공개 리포트가 없습니다.
          </p>
        )}
      </Reveal>
    </section>
  );
}
