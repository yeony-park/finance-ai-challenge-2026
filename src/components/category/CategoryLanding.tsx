import Link from "next/link";
import type { ReactNode } from "react";

import { CategoryMotif } from "@/components/site/icons";
import type { OfferEntry, OfferSchedule } from "@/components/site/offers";
import { buildOfferSchedule } from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";
import {
  ACTIVE_GROUP_EMPTY,
  ACTIVE_GROUP_TITLE,
  CLOSED_GROUP_TITLE,
  LAYER_EASY_QUESTIONS,
  LAYERS_SECTION_LEAD,
  LAYERS_SECTION_TITLE,
  OFFERS_SECTION_LEAD,
  OFFERS_SECTION_TITLE,
  VERDICT_SECTION_TITLE,
  verdictTotalsLead,
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
import { VERDICT_CAPTIONS } from "@/lib/content/verdict-captions";
import {
  WATCH_NO_AMENDMENTS,
  WATCH_NO_RECORD,
  watchAmendmentLine,
} from "@/lib/content/watch-band";
import {
  loadLatestWatchState,
  type WatchState,
} from "@/lib/verify/amend/watch-state";
import {
  LAYER_LABELS,
  LAYER_SUPPORT_LABELS,
  type CategoryDescriptor,
  type VerificationLayer,
} from "@/lib/verify/contract/category";
import { loadLatestReport, type LoadedReport } from "@/lib/verify/report/load";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";
import { formatKstDateTime, formatYmd8 } from "@/lib/verify/report/format";

import home from "@/components/home/home.module.css";
import { CategoryQuestions } from "./CategoryQuestions";
import s from "./category.module.css";

const ALL_LAYERS: readonly VerificationLayer[] = [
  "existence",
  "price",
  "performance",
];

export interface CategoryLandingProps {
  readonly categoryId: CategoryId;
  readonly title: string;
  readonly lead: string;
  readonly descriptor: CategoryDescriptor | null;
  readonly offers: readonly OfferEntry[];
  readonly preview?: readonly string[] | null;
  readonly market?: ReactNode;
}

interface OfferEvidence {
  readonly offer: OfferEntry;
  readonly loaded: LoadedReport;
  readonly watch: WatchState | null;
  readonly schedule: OfferSchedule;
}

const countsSentence = (
  match: number,
  mismatch: number,
  unverifiable: number,
): string =>
  `${VERDICT_LABEL.match} ${match}건 · ${VERDICT_LABEL.mismatch} ${mismatch}건 · ${VERDICT_LABEL.unverifiable} ${unverifiable}건`;

const amendmentLine = (watch: WatchState | null): string => {
  if (watch === null) return WATCH_NO_RECORD;
  if (watch.amendmentCount === 0) return WATCH_NO_AMENDMENTS;
  const latest = watch.amendments.at(-1)?.receivedOn;
  return watchAmendmentLine(
    watch.amendmentCount,
    latest ? formatYmd8(latest) : null,
  );
};

const loadEvidence = async (
  offers: readonly OfferEntry[],
  now: Date,
): Promise<readonly OfferEvidence[]> =>
  Promise.all(
    offers.map(async (offer) => {
      const [loaded, watch] = await Promise.all([
        loadLatestReport(offer.id),
        loadLatestWatchState(offer.id),
      ]);
      return {
        offer,
        loaded,
        watch: watch ?? null,
        schedule: buildOfferSchedule(offer, now),
      };
    }),
  );

function OfferEvidenceCard({ entry }: { readonly entry: OfferEvidence }) {
  const { summary } = entry.loaded.report;
  return (
    <Link href={`/offers/${entry.offer.id}`} className={s.offerCard}>
      <span className={s.offerCardHead}>
        <span className={s.offerCardName}>{entry.offer.title}</span>
        <span
          className={
            entry.schedule.phase === "open" ? s.offerBadgeOpen : s.offerBadge
          }
        >
          {entry.schedule.badge}
        </span>
      </span>
      <span className={s.offerCardStats}>
        <span className={s.offerStat}>
          <span className={s.offerStatLabel}>
            <span className={`${s.tileMark} ${s.tileMarkMatch}`} />
            {VERDICT_LABEL.match}
          </span>
          <span className={s.offerStatNum}>
            {summary.match.toLocaleString("ko-KR")}
          </span>
        </span>
        <span className={s.offerStat}>
          <span className={s.offerStatLabel}>
            <span className={`${s.tileMark} ${s.tileMarkMiss}`} />
            {VERDICT_LABEL.mismatch}
          </span>
          <span className={s.offerStatNum}>
            {summary.mismatch.toLocaleString("ko-KR")}
          </span>
        </span>
        <span className={s.offerStat}>
          <span className={s.offerStatLabel}>
            <span className={`${s.tileMark} ${s.tileMarkUnknown}`} />
            {VERDICT_LABEL.unverifiable}
          </span>
          <span className={s.offerStatNum}>
            {summary.unverifiable.toLocaleString("ko-KR")}
          </span>
        </span>
      </span>
      <span className={s.offerCardMeta}>{amendmentLine(entry.watch)}</span>
      <span className={s.offerCardMeta}>청약 {entry.schedule.label}</span>
    </Link>
  );
}

function OfferTimeline({ entry }: { readonly entry: OfferEvidence }) {
  if (!entry.watch || entry.watch.amendmentCount === 0) return null;
  const { watch } = entry;
  const isReverified =
    watch.amendments.at(-1)?.rcpNo === entry.loaded.report.document.rcpNo;

  return (
    <div className={s.timelineBlock}>
      <h4 className={s.timelineTitle}>
        {entry.offer.title} — {TIMELINE_TITLE_SUFFIX}
      </h4>
      <p className={s.slotLead}>{TIMELINE_LEAD}</p>
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
      <Link href={`/offers/${entry.offer.id}`} className={home.bandLink}>
        {TIMELINE_REPORT_LINK}
      </Link>
    </div>
  );
}

export async function CategoryLanding({
  categoryId,
  title,
  lead,
  descriptor,
  offers,
  preview = null,
  market = null,
}: CategoryLandingProps) {
  const byOpenAsc = [...offers].sort(
    (a, b) =>
      Date.parse(a.subscription.opensAt) - Date.parse(b.subscription.opensAt),
  );
  const evidence = await loadEvidence(byOpenAsc, new Date());

  const active = evidence.filter((entry) => entry.schedule.phase !== "closed");
  const closed = evidence.filter((entry) => entry.schedule.phase === "closed");

  const totals = evidence.reduce(
    (sum, entry) => ({
      match: sum.match + entry.loaded.report.summary.match,
      mismatch: sum.mismatch + entry.loaded.report.summary.mismatch,
      unverifiable: sum.unverifiable + entry.loaded.report.summary.unverifiable,
    }),
    { match: 0, mismatch: 0, unverifiable: 0 },
  );
  const totalItems = totals.match + totals.mismatch + totals.unverifiable;
  const latestGeneratedAt = evidence
    .map((entry) => entry.loaded.report.generatedAt)
    .sort()
    .at(-1);

  return (
    <div className={home.section}>
      <div className={home.wrap}>
        <div className={s.titleRow}>
          <span className={s.titleMotif}>
            <CategoryMotif id={categoryId} />
          </span>
          <h1 className={home.sectionTitle}>{title}</h1>
        </div>
        <p className={home.sectionLead}>{lead}</p>

        <section className={s.slot} aria-labelledby={`${title}-evidence`}>
          <h2 id={`${title}-evidence`} className={s.slotTitle}>
            {OFFERS_SECTION_TITLE}
          </h2>
          <p className={s.slotLead}>{OFFERS_SECTION_LEAD}</p>
          {evidence.length > 0 ? (
            <>
              <h3 className={s.groupTitle}>{ACTIVE_GROUP_TITLE}</h3>
              {active.length > 0 ? (
                <>
                  <div className={s.offerGrid}>
                    {active.map((entry) => (
                      <OfferEvidenceCard key={entry.offer.id} entry={entry} />
                    ))}
                  </div>
                  {active.map((entry) => (
                    <OfferTimeline key={entry.offer.id} entry={entry} />
                  ))}
                </>
              ) : (
                <p className={s.emptyNote}>{ACTIVE_GROUP_EMPTY}</p>
              )}
              <h3 className={s.groupTitle}>{CLOSED_GROUP_TITLE}</h3>
              {closed.length > 0 ? (
                <div className={s.offerGrid}>
                  {closed.map((entry) => (
                    <OfferEvidenceCard key={entry.offer.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <p className={s.emptyNote}>
                  이 카테고리에는 아직 청약이 종료된 공모가 없습니다.
                </p>
              )}
            </>
          ) : preview ? (
            <ul className={s.previewList}>
              {preview.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className={s.emptyNote}>
              이 카테고리에는 아직 공개 리포트가 없습니다.
            </p>
          )}
        </section>

        <section className={s.slot} aria-labelledby={`${title}-verdicts`}>
          <h2 id={`${title}-verdicts`} className={s.slotTitle}>
            {VERDICT_SECTION_TITLE}
          </h2>
          {evidence.length > 0 ? (
            <div>
              <p className={s.slotLead}>
                {verdictTotalsLead(evidence.length, totalItems)}
              </p>
              <div className={s.tileRow}>
                <div className={s.tile}>
                  <span className={s.tileLabel}>
                    <span className={`${s.tileMark} ${s.tileMarkMatch}`} />
                    {VERDICT_LABEL.match}
                  </span>
                  <span className={s.tileNum}>
                    {totals.match.toLocaleString("ko-KR")}
                    <small>건</small>
                  </span>
                  <span className={s.tileCaption}>{VERDICT_CAPTIONS.match}</span>
                </div>
                <div className={s.tile}>
                  <span className={s.tileLabel}>
                    <span className={`${s.tileMark} ${s.tileMarkMiss}`} />
                    {VERDICT_LABEL.mismatch}
                  </span>
                  <span className={s.tileNum}>
                    {totals.mismatch.toLocaleString("ko-KR")}
                    <small>건</small>
                  </span>
                  <span className={s.tileCaption}>
                    {VERDICT_CAPTIONS.mismatch}
                  </span>
                </div>
                <div className={s.tile}>
                  <span className={s.tileLabel}>
                    <span className={`${s.tileMark} ${s.tileMarkUnknown}`} />
                    {VERDICT_LABEL.unverifiable}
                  </span>
                  <span className={s.tileNum}>
                    {totals.unverifiable.toLocaleString("ko-KR")}
                    <small>건</small>
                  </span>
                  <span className={s.tileCaption}>
                    {VERDICT_CAPTIONS.unverifiable}
                  </span>
                </div>
              </div>
              <p className={s.tallyMeta}>
                공개 리포트 {evidence.length}건 합산 · 최근 대조{" "}
                {latestGeneratedAt ? formatKstDateTime(latestGeneratedAt) : "—"}
              </p>
            </div>
          ) : (
            <p className={s.emptyNote}>
              공개된 대조 결과가 아직 없습니다 — 검증 경로가 연결되면 같은
              형식으로 표시됩니다.
            </p>
          )}
        </section>

        {market}

        <section className={s.slot} aria-labelledby={`${title}-layers`}>
          <h2 id={`${title}-layers`} className={s.slotTitle}>
            {LAYERS_SECTION_TITLE}
          </h2>
          <p className={s.slotLead}>{LAYERS_SECTION_LEAD}</p>
          <table className={s.layerTable}>
            <thead>
              <tr>
                <th scope="col">확인 질문</th>
                <th scope="col">지원</th>
                <th scope="col">근거</th>
              </tr>
            </thead>
            <tbody>
              {ALL_LAYERS.map((layer) => {
                const declared = descriptor?.layers.find(
                  (entry) => entry.layer === layer,
                );
                return (
                  <tr key={layer}>
                    <td className={s.layerName}>
                      {LAYER_EASY_QUESTIONS[layer]}
                      <span className={s.layerSub}>{LAYER_LABELS[layer]} 층</span>
                    </td>
                    <td>
                      <span
                        className={
                          declared
                            ? s.layerLevel
                            : `${s.layerLevel} ${s.layerLevelPending}`
                        }
                      >
                        {declared
                          ? LAYER_SUPPORT_LABELS[declared.level]
                          : "선언 대기"}
                      </span>
                    </td>
                    <td className={s.layerBasis}>
                      {declared
                        ? declared.basis
                        : "담당 구현에서 확정됩니다 — 확정 전에는 대조를 제공하지 않습니다."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {descriptor ? (
            <p className={s.slotLead}>
              현재성 기준: {descriptor.freshnessNote}.
            </p>
          ) : null}
        </section>

        <section className={s.slot} aria-labelledby={`${title}-questions`}>
          <h2 id={`${title}-questions`} className={s.slotTitle}>
            확인 질문
          </h2>
          <CategoryQuestions bridgeOffer={byOpenAsc.at(-1) ?? null} />
        </section>

        <section className={s.slot} aria-labelledby={`${title}-custom`}>
          <h2 id={`${title}-custom`} className={s.slotTitle}>
            카테고리 특화 영역
          </h2>
          <p className={s.emptyNote}>
            카테고리 담당 구현이 들어오는 자리입니다 — 공통 계약(층별 선언·판정
            어휘·데이터 정책)을 유지한 채 확장됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
