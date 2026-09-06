import type {
  RealEstateInvestmentReview,
  ReviewConfirmedIssue,
  ReviewEvidenceSufficiency,
  ReviewFinding,
  ReviewFindingTone,
  ReviewSource,
} from "@/lib/verify/real-estate-investment-review";
import type { RealEstateUserGroup } from "@/components/site/offers";
import type { RealEstateSourceKind } from "@/lib/verify/types";

import s from "./report.module.css";

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

const SOURCE_KIND_LABEL: Readonly<Record<RealEstateSourceKind, string>> = {
  "platform-claim": "플랫폼 제공 주장",
  "official-document": "공식 문서",
  "external-observation": "외부 관측",
};

const TONE_CLASS: Readonly<Record<ReviewFindingTone, string>> = {
  confirmed: s.reviewFindingConfirmed,
  attention: s.reviewFindingAttention,
  unknown: s.reviewFindingUnknown,
  context: s.reviewFindingContext,
};

const formatDate = (value: string): string =>
  value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1. $2. $3.");

const httpUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

function FindingSource({ source }: { readonly source: ReviewSource }) {
  const text = `${SOURCE_KIND_LABEL[source.sourceKind]} · ${source.label} · ${formatDate(source.asOf)} 기준`;
  const url = httpUrl(source.url);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${text} (새 창)`}
      className={s.evSourceLink}
    >
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );
}

function FindingItem({
  finding,
  titlePrefix,
}: {
  readonly finding: ReviewFinding;
  readonly titlePrefix?: string;
}) {
  const detail = finding.detail
    .replaceAll("base-rate", "기준금리")
    .replaceAll(" percent", "%");
  return (
    <article className={`${s.reviewFinding} ${TONE_CLASS[finding.tone]}`}>
      <h4>
        {titlePrefix ? `${titlePrefix} · ` : ""}
        {finding.title}
      </h4>
      <p>{detail}</p>
      {finding.limitations.map((limitation) => (
        <p key={limitation} className={s.reviewLimitation}>
          한계 · {limitation}
        </p>
      ))}
      {finding.sources.length > 0 ? (
        <div className={s.reviewSources} aria-label={`${finding.title} 출처`}>
          {finding.sources.map((source) => (
            <FindingSource key={`${source.url}-${source.asOf}`} source={source} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function FindingGroup({
  title,
  lead,
  findings,
  market = false,
  defaultOpen = false,
}: {
  readonly title: string;
  readonly lead?: string;
  readonly findings: readonly ReviewFinding[];
  readonly market?: boolean;
  readonly defaultOpen?: boolean;
}) {
  return (
    <details className={s.reviewGroup} open={defaultOpen}>
      <summary>
        <span className={s.reviewGroupTitle}>{title}</span>
        {lead ? <span className={s.reviewGroupLead}>{lead}</span> : null}
      </summary>
      <div className={s.reviewGroupBody}>
        {findings.map((finding, index) => (
          <FindingItem
            key={finding.id}
            finding={finding}
            titlePrefix={
              market && findings.length > 1
                ? index === 0
                  ? "청약 시작 시점"
                  : index === findings.length - 1
                    ? "최신 관측"
                    : undefined
                : undefined
            }
          />
        ))}
      </div>
    </details>
  );
}

export function RealEstateInvestmentReviewPanel({
  review,
  listingGroup,
}: {
  readonly review: RealEstateInvestmentReview;
  readonly listingGroup: RealEstateUserGroup;
}) {
  const priorities = review.priorityFindings.slice(0, 3);
  const undecided = priorities.length === 0 ? review.openGates.slice(0, 3) : [];
  const isHistorical = listingGroup === "historical-completed";

  return (
    <section className={s.investmentReview} aria-labelledby="investment-review-title">
      <header className={s.investmentReviewHead}>
        <div>
          <p className={s.productEyebrow}>검토 기준일 · {formatDate(review.reviewedOn)}</p>
          <h2 id="investment-review-title" className={s.investmentReviewTitle}>
            {review.sectionTitle}
          </h2>
        </div>
      </header>

      <dl className={s.reviewAxes}>
        <div>
          <dt>근거 충분도</dt>
          <dd>{SUFFICIENCY_LABEL[review.evidenceSufficiency]}</dd>
        </div>
        <div>
          <dt>문제 확인 상태</dt>
          <dd>{ISSUE_LABEL[review.confirmedIssue]}</dd>
        </div>
      </dl>
      <p className={s.reviewDisclaimer}>
        {isHistorical
          ? "과거 상품의 운용·종료 이력을 정리한 결과이며 외부 종료 검증을 대체하지 않습니다."
          : "투자 적합성·안전성·수익성을 평가한 결과가 아닙니다."}
      </p>

      <div className={s.reviewFirstGrid}>
        <section className={s.reviewPriority}>
          <h3>
            {priorities.length > 0
              ? isHistorical
                ? "이력에서 우선 확인할 항목"
                : "우선 확인할 항목"
              : isHistorical
                ? "이력에서 아직 판단하지 못한 핵심 항목"
                : "아직 판단하지 못한 핵심 항목"}
          </h3>
          {priorities.length > 0 ? (
            <div className={s.reviewFindingList}>
              {priorities.map((finding) => (
                <FindingItem key={finding.id} finding={finding} />
              ))}
            </div>
          ) : (
            <ul className={s.reviewGateList}>
              {undecided.map((gate) => (
                <li key={gate.id}>
                  <strong>{gate.label}</strong>
                  <span>{gate.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.reviewQuestions}>
          <h3>{isHistorical ? "다음 상품 검토에 활용할 질문" : "투자 전 확인할 질문"}</h3>
          <ol>
            {review.nextQuestions.slice(0, 3).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
      </div>

      <div className={s.reviewDetails}>
        {review.materialEvents.length > 0 ? (
          <FindingGroup
            title="중요 상품 사건"
            findings={review.materialEvents}
          />
        ) : (
          <details className={s.reviewGroup}>
            <summary>
              <span className={s.reviewGroupTitle}>중요 상품 사건</span>
              <span className={s.reviewGroupLead}>
                구조화된 중요 사건이 없습니다. 중요 공시 전체를 확인했다는 뜻은
                아닙니다.
              </span>
            </summary>
            <p className={s.reviewEmptyDetail}>
              열린 확인 항목과 중요 공시 전체 확인 범위를 함께 봐야 합니다.
            </p>
          </details>
        )}
        <FindingGroup
          title={isHistorical ? "매각·환매·정산 이력" : "매각·환매·정산과 거래"}
          findings={review.areas.exit_terms}
        />
        <FindingGroup
          title="배당·비용"
          lead="원문 연결과 산술 검산을 구분하며 지급·수익을 보장하지 않습니다."
          findings={review.areas.payout_cost}
        />
        <FindingGroup
          title="자산 식별"
          lead="건축물대장 연결 범위이며 권리·임대차·소유 상태 확인과는 다릅니다."
          findings={review.areas.asset_identity}
        />
        <FindingGroup
          title="역할별 회사 이력"
          lead="법인별 해당 역할과 연결된 사건만 표시하며 회사 전체 평가가 아닙니다."
          findings={review.areas.role_history}
          defaultOpen
        />
        <FindingGroup
          title="시장·금리 맥락"
          lead="ECOS 시작·최신 관측은 배경 정보이며 상품 검토 상태와 분리합니다."
          findings={review.areas.market_context}
          market
          defaultOpen
        />
      </div>
    </section>
  );
}
