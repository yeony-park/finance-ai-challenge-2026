import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { OfferWatchControl } from "@/components/landing/OfferWatchControl";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { FILING_HEADING_ID, REALITY_HEADING_ID, WATCH_HEADING_ID } from "@/components/report/ids";
import { TrackRecordCard } from "@/components/report/TrackRecordCard";
import { CategoryMotif } from "@/components/site/icons";
import type {
  OfferEntry,
  OfferSchedule,
  RealEstateUserGroup,
} from "@/components/site/offers";
import {
  buildOfferSchedule,
  classifyRealEstateOffer,
} from "@/components/site/offers";
import type { CategoryId } from "@/lib/content/categories";
import {
  ACTIVE_GROUP_EMPTY,
  ACTIVE_GROUP_TITLE,
  CLOSED_GROUP_TITLE,
  FACT_STRIP_LINK,
  FACT_STRIP_TITLE,
  ISSUER_SLOT_TITLE,
  REPORT_OPEN_LABEL,
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
import { loadFilingFacts, type FilingFacts } from "@/lib/verify/report/filing-facts";
import {
  loadRealEstateInvestmentReview,
  type RealEstateInvestmentReview,
  type ReviewConfirmedIssue,
  type ReviewEvidenceSufficiency,
} from "@/lib/verify/real-estate-investment-review";
import {
  loadRealEstateProductSummary,
  type RealEstateProductSummary,
} from "@/lib/verify/real-estate-product-summary";
import { loadLatestReport, type LoadedReport } from "@/lib/verify/report/load";
import { issuerKeyForOffer } from "@/lib/verify/track-record/registry";
import { loadTrackRecord } from "@/lib/verify/track-record/store";
import { toTrackRecordView } from "@/lib/verify/track-record/view";
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
  readonly heroImage?: string | null;
  readonly custom?: ReactNode;
  readonly customTitle?: string;
}

interface OfferEvidence {
  readonly offer: OfferEntry;
  readonly loaded: LoadedReport;
  readonly watch: WatchState | null;
  readonly schedule: OfferSchedule;
  readonly filingFacts: FilingFacts | null;
  readonly productSummary: RealEstateProductSummary | null;
  readonly investmentReview: RealEstateInvestmentReview | null;
}

const offerUnverifiableCount = (entry: OfferEvidence): number =>
  entry.loaded.report.summary.unverifiable +
  (entry.offer.assetKind === "real-estate"
    ? entry.loaded.report.unjudged.length
    : 0);

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
      const [loaded, watch, filingFacts, productSummary, investmentReview] =
        await Promise.all([
          loadLatestReport(offer.id),
          loadLatestWatchState(offer.id),
          loadFilingFacts(offer.id),
          offer.assetKind === "real-estate"
            ? loadRealEstateProductSummary(offer.id)
            : Promise.resolve(null),
          offer.assetKind === "real-estate"
            ? loadRealEstateInvestmentReview(
                offer.id,
                new Date(now.getTime() + 9 * 60 * 60 * 1000)
                  .toISOString()
                  .slice(0, 10),
              )
            : Promise.resolve(null),
        ]);
      return {
        offer,
        loaded,
        watch: watch ?? null,
        schedule: buildOfferSchedule(offer, now),
        filingFacts,
        productSummary,
        investmentReview,
      };
    }),
  );

const ACTIVE_CHAPTERS: readonly { readonly id: string; readonly label: string }[] = [
  { id: REALITY_HEADING_ID, label: "실재 확인" },
  { id: WATCH_HEADING_ID, label: "정정 이력" },
  { id: FILING_HEADING_ID, label: "신고서 정보" },
];

const formatWon = (value: number): string =>
  value >= 100_000_000
    ? `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원`
    : `${value.toLocaleString("ko-KR")}원`;

const formatProductDate = (value: string): string =>
  value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1. $2. $3.");

const SUFFICIENCY_LABEL: Readonly<Record<ReviewEvidenceSufficiency, string>> = {
  comparable: "핵심 근거 대조 가능",
  partial: "일부 근거만 대조됨",
  insufficient: "판단할 근거 부족",
};

const ISSUE_LABEL: Readonly<Record<ReviewConfirmedIssue, string>> = {
  not_assessed: "문제 여부 평가 불가",
  none_found: "연결된 근거에서 중대 문제 미확인",
  needs_follow_up: "중요 항목 추가 확인 필요",
  critical_conflict: "핵심 주장 불일치 확인",
};

function RealEstateCardFacts({
  entry,
  group,
}: {
  readonly entry: OfferEvidence;
  readonly group: RealEstateUserGroup;
}) {
  const product = entry.productSummary;
  if (!product) return null;

  const isBbric = product.platform?.label === "BBRIC";
  const cycle = product.contractualDistributionCycle.value ?? "문서 확인 필요";
  const trustPeriod = product.trustPeriod.value ?? "문서 확인 필요";

  return (
    <>
      {product.platform ? (
        <span className={s.offerProductPlatform}>
          플랫폼 · {product.platform.label}
        </span>
      ) : null}
      <dl className={s.offerProductFacts}>
        <div>
          <dt>공모총액</dt>
          <dd>{formatWon(product.offer.amountWon)}</dd>
        </div>
        {product.sale ? (
          <>
            <div>
              <dt>매각금액</dt>
              <dd>{formatWon(product.sale.amountWon)}</dd>
            </div>
            <div>
              <dt>{product.sale.dateLabel}</dt>
              <dd>{formatProductDate(product.sale.dealOn)}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>{isBbric ? "1BRIC 가격" : "1단위 가격"}</dt>
              <dd>{product.offer.unitPriceWon.toLocaleString("ko-KR")}원</dd>
            </div>
            <div>
              <dt>결산주기</dt>
              <dd>{cycle}</dd>
            </div>
            <div>
              <dt>신탁기간</dt>
              <dd>{trustPeriod}</dd>
            </div>
          </>
        )}
      </dl>
      <span className={s.offerCardMeta}>
        {group === "historical-completed"
          ? "운영사 발표상 매각·대금지급 완료 · 외부 종료 검증 미확인"
          : group === "operating-needs-check"
            ? "청약 종료 · 운용 중 · 현재 거래 가능 여부 미확인"
            : group === "development-sample"
              ? "개발 샘플 · 실제 공개 상품 목록에서 제외"
              : "공개 원문상 현재 청약·매수 가능 확인"}
      </span>
      {entry.investmentReview ? (
        <dl className={s.offerReviewAxes}>
          <div>
            <dt>근거 충분도</dt>
            <dd>{SUFFICIENCY_LABEL[entry.investmentReview.evidenceSufficiency]}</dd>
          </div>
          <div>
            <dt>문제 확인 상태</dt>
            <dd>{ISSUE_LABEL[entry.investmentReview.confirmedIssue]}</dd>
          </div>
        </dl>
      ) : null}
    </>
  );
}

function OfferEvidenceCard({
  entry,
  showChapterLinks = false,
  realEstateGroup,
}: {
  readonly entry: OfferEvidence;
  readonly showChapterLinks?: boolean;
  readonly realEstateGroup?: RealEstateUserGroup;
}) {
  const { summary } = entry.loaded.report;
  const isRealEstate = entry.offer.assetKind === "real-estate";
  return (
    <article
      className={`${s.offerCard} ${isRealEstate ? s.offerCardLinked : ""}`}
    >
      <span className={s.offerCardHead}>
        <Link
          href={`/offers/${entry.offer.id}`}
          className={`${s.offerCardName} ${isRealEstate ? s.offerCardStretched : ""}`}
        >
          {entry.offer.title}
        </Link>
        <span
          className={
            entry.schedule.phase === "open" ? s.offerBadgeOpen : s.offerBadge
          }
        >
          {entry.schedule.badge}
        </span>
      </span>
      {isRealEstate ? (
        <RealEstateCardFacts
          entry={entry}
          group={realEstateGroup ?? "operating-needs-check"}
        />
      ) : (
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
              {offerUnverifiableCount(entry).toLocaleString("ko-KR")}
            </span>
          </span>
        </span>
      )}
      <span className={s.offerCardMeta}>청약 {entry.schedule.label}</span>
      {!isRealEstate && entry.offer.assetLifecycle === "operating" ? (
        <span className={s.offerCardMeta}>
          플랫폼 공개자료 기준 자산 운영 중
          {entry.offer.tradabilityStatus === "unknown"
            ? " · 거래 가능 여부 미확인"
            : ""}
        </span>
      ) : null}
      {showChapterLinks ? (
        <span className={s.chapterLinks}>
          {ACTIVE_CHAPTERS.filter(
            (chapter) =>
              chapter.id !== FILING_HEADING_ID || entry.filingFacts !== null,
          ).map((chapter) => (
            <Link
              key={chapter.id}
              href={`/offers/${entry.offer.id}#${chapter.id}`}
              className={s.questionBridge}
            >
              {chapter.label} →
            </Link>
          ))}
        </span>
      ) : null}
      {!isRealEstate || realEstateGroup !== "historical-completed" ? (
        <div className={s.offerCardAction}>
          <OfferWatchControl
            offerId={entry.offer.id}
            offerTitle={entry.offer.title}
            statusText={amendmentLine(entry.watch)}
            isAlert={(entry.watch?.amendmentCount ?? 0) > 0}
          />
        </div>
      ) : null}
      {isRealEstate ? (
        <span className={s.offerCardCta}>
          {realEstateGroup === "historical-completed"
            ? "운용·종료 이력 보기 →"
            : realEstateGroup === "operating-needs-check"
              ? "운용 상태와 미확인 항목 보기 →"
              : "현재 거래 근거와 상태 보기 →"}
        </span>
      ) : (
        <Link href={`/offers/${entry.offer.id}`} className={s.questionBridge}>
          {REPORT_OPEN_LABEL}
        </Link>
      )}
    </article>
  );
}

function RealEstateOfferGroups({
  evidence,
  now,
}: {
  readonly evidence: readonly OfferEvidence[];
  readonly now: Date;
}) {
  const group = (entry: OfferEvidence) =>
    classifyRealEstateOffer(entry.offer, now, entry.loaded.report.realEstate);
  const current = evidence.filter((entry) => group(entry) === "current-confirmed");
  const needsCheck = evidence.filter(
    (entry) => group(entry) === "operating-needs-check",
  );
  const historical = evidence.filter(
    (entry) => group(entry) === "historical-completed",
  );
  const basisDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, ". ");

  const cards = (entries: readonly OfferEvidence[], listingGroup: RealEstateUserGroup) =>
    entries.length > 0 ? (
      <div className={s.offerGrid}>
        {entries.map((entry) => (
          <OfferEvidenceCard
            key={entry.offer.id}
            entry={entry}
            realEstateGroup={listingGroup}
          />
        ))}
      </div>
    ) : (
      <p className={s.emptyNote}>
        공개 웹 원문에서 이 조건을 확인한 상품이 없습니다.
      </p>
    );

  return (
    <>
      <p className={s.listingScope}>
        분류 기준일 {basisDate}. · 공개 웹 원문 기준이며 앱·회원 전용 화면은 확인
        범위에 포함하지 않았습니다. 현재 매수 가능 여부를 추천·승인하는 분류가
        아닙니다.
      </p>
      <h3 className={s.groupTitle}>공개 원문상 현재 청약·매수 가능 확인 상품</h3>
      {cards(current, "current-confirmed")}
      <h3 className={s.groupTitle}>청약 종료 · 운용·거래 상태 확인 필요</h3>
      {cards(needsCheck, "operating-needs-check")}
      <h3 className={s.groupTitle}>과거 상품 운용·종료 이력</h3>
      {cards(historical, "historical-completed")}
    </>
  );
}

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
        className={s.questionBridge}
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
                offerUnverifiableCount(entry),
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

function RealEstateReviewSummary({
  evidence,
}: {
  readonly evidence: readonly OfferEvidence[];
}) {
  const reviews = evidence.flatMap((entry) =>
    entry.investmentReview ? [entry.investmentReview] : [],
  );
  const sufficiency = (state: ReviewEvidenceSufficiency) =>
    reviews.filter((review) => review.evidenceSufficiency === state).length;
  const issues = (state: ReviewConfirmedIssue) =>
    reviews.filter((review) => review.confirmedIssue === state).length;

  return (
    <div>
      <p className={s.slotLead}>
        상품별로 대조 가능한 근거 범위와 아직 확인해야 할 질문을 함께 봅니다.
        투자 적합성·안전성·수익성을 평가한 결과가 아닙니다.
      </p>
      <div className={s.reviewSummaryGrid}>
        <section className={s.reviewSummaryItem}>
          <h3>근거를 어디까지 대조할 수 있나?</h3>
          <p>
            핵심 근거 대조 가능 {sufficiency("comparable")}상품 · 일부 근거만
            대조됨 {sufficiency("partial")}상품 · 판단할 근거 부족{" "}
            {sufficiency("insufficient")}상품
          </p>
        </section>
        <section className={s.reviewSummaryItem}>
          <h3>중요한 문제를 판단했나?</h3>
          <p>
            추가 확인 필요 {issues("needs_follow_up")}상품 · 문제 여부 평가 불가{" "}
            {issues("not_assessed")}상품 · 연결 근거에서 중대 문제 미확인{" "}
            {issues("none_found")}상품
          </p>
        </section>
      </div>
      <p className={s.tallyMeta}>
        공개 상품 {reviews.length}건 · 상세 화면에서 우선 주의사항과 확인 질문을
        확인할 수 있습니다.
      </p>
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
  heroImage = null,
  custom = null,
  customTitle = "카테고리 특화 영역",
}: CategoryLandingProps) {
  const isRealEstateCategory = categoryId === "real-estate";
  const visibleOffers = isRealEstateCategory
    ? offers.filter((offer) => offer.realEstateListingKind !== "development-sample")
    : offers;
  const byOpenAsc = [...visibleOffers].sort(
    (a, b) =>
      Date.parse(a.subscription.opensAt) - Date.parse(b.subscription.opensAt),
  );
  const now = new Date();
  const evidence = await loadEvidence(byOpenAsc, now);

  const issuerKey = byOpenAsc[0] ? issuerKeyForOffer(byOpenAsc[0].id) : undefined;
  const trackRecord = issuerKey
    ? await loadTrackRecord(issuerKey)
        .then((record) => (record ? toTrackRecordView(record) : null))
        .catch(() => null)
    : null;

  const active = evidence.filter((entry) => entry.schedule.phase !== "closed");
  const closed = evidence.filter((entry) => entry.schedule.phase === "closed");

  const totals = evidence.reduce(
    (sum, entry) => ({
      match: sum.match + entry.loaded.report.summary.match,
      mismatch: sum.mismatch + entry.loaded.report.summary.mismatch,
      unverifiable: sum.unverifiable + offerUnverifiableCount(entry),
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
      <div className={`${home.wrap} ${s.landingHero}`}>
        {heroImage ? (
          <div className={s.landingHeroPhoto} aria-hidden="true">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="(max-width: 1088px) 1px, 55vw"
              className={s.landingHeroImg}
            />
          </div>
        ) : null}
        <div className={s.landingHeroBody}>
          <div className={s.titleRow}>
            <span className={s.titleMotif}>
              <CategoryMotif id={categoryId} />
            </span>
            <h1 className={home.sectionTitle}>{title}</h1>
          </div>
          <p className={home.sectionLead}>{lead}</p>
        </div>

        <section className={s.slot} aria-labelledby={`${title}-evidence`}>
          <Reveal>
            <h2 id={`${title}-evidence`} className={s.slotTitle}>
              {OFFERS_SECTION_TITLE}
            </h2>
            <p className={s.slotLead}>
              {isRealEstateCategory
                ? `이 페이지에 수록한 공개 실상품 ${evidence.length}건 기준이며 시장 전체 조사 결과가 아닙니다.`
                : OFFERS_SECTION_LEAD}
            </p>
            {evidence.length > 0 ? (
              isRealEstateCategory ? (
                <RealEstateOfferGroups evidence={evidence} now={now} />
              ) : (
              <>
                <h3 className={s.groupTitle}>
                  {ACTIVE_GROUP_TITLE}
                </h3>
                {active.length > 0 ? (
                  <>
                    <div className={s.offerGrid}>
                      {active.map((entry) => (
                        <OfferEvidenceCard
                          key={entry.offer.id}
                          entry={entry}
                          showChapterLinks
                        />
                      ))}
                    </div>
                    {active.map((entry) => (
                      <FactStrip key={`facts-${entry.offer.id}`} entry={entry} />
                    ))}
                    {active.map((entry) => (
                      <OfferTimeline key={entry.offer.id} entry={entry} />
                    ))}
                  </>
                ) : (
                  <p className={s.emptyNote}>{ACTIVE_GROUP_EMPTY}</p>
                )}
                <h3 className={s.groupTitle}>
                  {CLOSED_GROUP_TITLE}
                </h3>
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
              )
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
          </Reveal>
        </section>

        <section className={s.slot} aria-labelledby={`${title}-verdicts`}>
          <Reveal>
            <h2 id={`${title}-verdicts`} className={s.slotTitle}>
              {isRealEstateCategory ? "상품별 검토 상태" : VERDICT_SECTION_TITLE}
            </h2>
            {evidence.length > 0 ? (
              isRealEstateCategory ? (
                <RealEstateReviewSummary evidence={evidence} />
              ) : (
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
                        <CountUp value={totals.match} />
                        <small>건</small>
                      </span>
                      <span className={s.tileCaption}>
                        {VERDICT_CAPTIONS.match}
                      </span>
                    </div>
                    <div className={s.tile}>
                      <span className={s.tileLabel}>
                        <span className={`${s.tileMark} ${s.tileMarkMiss}`} />
                        {VERDICT_LABEL.mismatch}
                      </span>
                      <span className={s.tileNum}>
                        <CountUp value={totals.mismatch} />
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
                        <CountUp value={totals.unverifiable} />
                        <small>건</small>
                      </span>
                      <span className={s.tileCaption}>
                        {VERDICT_CAPTIONS.unverifiable}
                      </span>
                    </div>
                  </div>
                  <p className={s.tallyMeta}>
                    공개 리포트 {evidence.length}건 합산 · 최근 대조{" "}
                    {latestGeneratedAt
                      ? formatKstDateTime(latestGeneratedAt)
                      : "—"}
                  </p>
                </div>
              )
            ) : (
              <p className={s.emptyNote}>
                공개된 대조 결과가 아직 없습니다 — 검증 경로가 연결되면 같은
                형식으로 표시됩니다.
              </p>
            )}
          </Reveal>
        </section>

        {trackRecord ? (
          <section className={s.slot} aria-label={ISSUER_SLOT_TITLE}>
            <Reveal>
              <TrackRecordCard card={trackRecord} />
            </Reveal>
          </section>
        ) : null}

        {market}

        <section className={s.slot} aria-labelledby={`${title}-layers`}>
          <Reveal>
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
                          : "담당 구현에서 확정되면 그때부터 대조를 제공합니다."}
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
          </Reveal>
        </section>

        <section className={s.slot} aria-labelledby={`${title}-questions`}>
          <Reveal>
            <h2 id={`${title}-questions`} className={s.slotTitle}>
              확인 질문
            </h2>
            <CategoryQuestions bridgeOffer={byOpenAsc.at(-1) ?? null} />
          </Reveal>
        </section>

        <section className={s.slot} aria-labelledby={`${title}-custom`}>
          <Reveal>
            <h2 id={`${title}-custom`} className={s.slotTitle}>
              {customTitle}
            </h2>
            {custom ?? (
              <p className={s.emptyNote}>
                카테고리 담당 구현이 들어오는 자리입니다 — 공통 계약(층별 선언·판정
                어휘·데이터 정책)을 유지한 채 확장됩니다.
              </p>
            )}
          </Reveal>
        </section>
      </div>
    </div>
  );
}
