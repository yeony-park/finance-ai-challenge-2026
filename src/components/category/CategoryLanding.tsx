import Link from "next/link";

import type { OfferEntry } from "@/components/site/offers";
import { buildOfferSchedule } from "@/components/site/offers";
import { TRUST_CHECKLIST } from "@/lib/content/checklist";
import { loadLatestWatchState } from "@/lib/verify/amend/watch-state";
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
import s from "./category.module.css";

const ALL_LAYERS: readonly VerificationLayer[] = [
  "existence",
  "price",
  "performance",
];

const REVIEW_QUESTION_COUNT = 3;

export interface CategoryLandingProps {
  readonly title: string;
  readonly lead: string;
  readonly descriptor: CategoryDescriptor | null;
  readonly offers: readonly OfferEntry[];
}

interface OfferEvidence {
  readonly offer: OfferEntry;
  readonly loaded: LoadedReport;
  readonly amendmentCount: number | null;
  readonly amendmentLatest: string | null;
}

const countsSentence = (
  match: number,
  mismatch: number,
  unverifiable: number,
): string =>
  `${VERDICT_LABEL.match} ${match}건 · ${VERDICT_LABEL.mismatch} ${mismatch}건 · ${VERDICT_LABEL.unverifiable} ${unverifiable}건`;

const loadEvidence = async (
  offers: readonly OfferEntry[],
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
        amendmentCount: watch?.amendmentCount ?? null,
        amendmentLatest: watch?.amendments.at(-1)?.receivedOn ?? null,
      };
    }),
  );

export async function CategoryLanding({
  title,
  lead,
  descriptor,
  offers,
}: CategoryLandingProps) {
  const byOpenAsc = [...offers].sort(
    (a, b) =>
      Date.parse(a.subscription.opensAt) - Date.parse(b.subscription.opensAt),
  );
  const evidence = await loadEvidence(byOpenAsc);

  const totals = evidence.reduce(
    (sum, entry) => ({
      match: sum.match + entry.loaded.report.summary.match,
      mismatch: sum.mismatch + entry.loaded.report.summary.mismatch,
      unverifiable: sum.unverifiable + entry.loaded.report.summary.unverifiable,
    }),
    { match: 0, mismatch: 0, unverifiable: 0 },
  );
  const latestGeneratedAt = evidence
    .map((entry) => entry.loaded.report.generatedAt)
    .sort()
    .at(-1);

  return (
    <div className={home.section}>
      <div className={home.wrap}>
        <h1 className={home.sectionTitle}>{title}</h1>
        <p className={home.sectionLead}>{lead}</p>

        <section className={s.slot} aria-labelledby={`${title}-layers`}>
          <h2 id={`${title}-layers`} className={s.slotTitle}>
            층별 지원 선언
          </h2>
          <p className={s.slotLead}>
            데이터 깊이의 차이를 숨기지 않습니다 — 층마다 어떤 공공 데이터로
            어디까지 대조하는지 그대로 적습니다.
          </p>
          <table className={s.layerTable}>
            <thead>
              <tr>
                <th scope="col">층</th>
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
                    <td className={s.layerName}>{LAYER_LABELS[layer]}</td>
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

        <section className={s.slot} aria-labelledby={`${title}-verdicts`}>
          <h2 id={`${title}-verdicts`} className={s.slotTitle}>
            판정 현황
          </h2>
          {evidence.length > 0 ? (
            <div className={s.tally}>
              {countsSentence(totals.match, totals.mismatch, totals.unverifiable)}
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

        <section className={s.slot} aria-labelledby={`${title}-evidence`}>
          <h2 id={`${title}-evidence`} className={s.slotTitle}>
            공모별 확인 현황
          </h2>
          <p className={s.slotLead}>
            검증 가능한 공개 데이터가 있는 공모 전수를 공시 접수일순으로
            보여줍니다 — 선별·추천 정렬이 아닙니다.
          </p>
          {evidence.length > 0 ? (
            <div>
              {evidence.map((entry) => (
                <div key={entry.offer.id} className={s.offerRow}>
                  <Link href={`/offers/${entry.offer.id}`} className={s.offerName}>
                    {entry.offer.title}
                  </Link>
                  <span className={s.offerCounts}>
                    {countsSentence(
                      entry.loaded.report.summary.match,
                      entry.loaded.report.summary.mismatch,
                      entry.loaded.report.summary.unverifiable,
                    )}
                  </span>
                  <span className={s.offerMeta}>
                    청약 {buildOfferSchedule(entry.offer, new Date()).label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={s.emptyNote}>
              이 카테고리에는 아직 공개 리포트가 없습니다.
            </p>
          )}
        </section>

        <section className={s.slot} aria-labelledby={`${title}-events`}>
          <h2 id={`${title}-events`} className={s.slotTitle}>
            정정 접수 현황
          </h2>
          <p className={s.slotLead}>
            정정신고서 접수는 상품 화면에 귀속해 표시합니다 — 접수되면 정정
            전후를 같은 절차로 다시 대조합니다.
          </p>
          {evidence.length > 0 ? (
            <div>
              {evidence.map((entry) => (
                <div key={entry.offer.id} className={s.offerRow}>
                  <span className={s.offerName}>{entry.offer.title}</span>
                  <span className={s.offerCounts}>
                    {entry.amendmentCount === null
                      ? "감시 기록 없음"
                      : entry.amendmentCount === 0
                        ? "접수된 정정신고서 없음"
                        : `정정신고서 ${entry.amendmentCount}건 접수 (최근 ${
                            entry.amendmentLatest
                              ? formatYmd8(entry.amendmentLatest)
                              : "—"
                          })`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={s.emptyNote}>감시 대상 공모가 아직 없습니다.</p>
          )}
        </section>

        <section className={s.slot} aria-labelledby={`${title}-questions`}>
          <h2 id={`${title}-questions`} className={s.slotTitle}>
            확인 질문
          </h2>
          <div className={s.questionList}>
            {TRUST_CHECKLIST.slice(0, REVIEW_QUESTION_COUNT).map((item) => (
              <p key={item.id}>· {item.question}</p>
            ))}
          </div>
          <Link href="/#checklist" className={home.bandLink}>
            확인 질문 8가지 전체 보기 →
          </Link>
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
