import Link from "next/link";

import { OfferWatchControl } from "@/components/landing/OfferWatchControl";
import { SCENARIO_DEMO_DISCLOSURE, type ScenarioOffer } from "@/lib/knowledge/schema";

import s from "./scenario.module.css";

export const PHASE_LABEL: Readonly<Record<ScenarioOffer["offering"]["phase"], string>> = {
  "subscription-open": "청약 중",
  "listed-trading": "상장 거래",
  settled: "종료",
};

const GROUPS: readonly {
  readonly phase: ScenarioOffer["offering"]["phase"];
  readonly title: string;
  readonly description: string;
}[] = [
  {
    phase: "subscription-open",
    title: "청약 중",
    description: "입력 일정상 청약 기간에 해당하는 상품입니다.",
  },
  {
    phase: "listed-trading",
    title: "상장 거래",
    description: "기준일에 거래 가능 조건이 유효한 상품입니다.",
  },
  {
    phase: "settled",
    title: "종료",
    description: "매각·정산 단계까지 입력된 과거 운용 사례입니다.",
  },
];

export const formatWon = (value: number): string =>
  value >= 100_000_000
    ? `${(value / 100_000_000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : `${value.toLocaleString("ko-KR")}원`;

export const formatDate = (value: string): string => value.replaceAll("-", ". ");

function ScenarioCard({ offer }: { readonly offer: ScenarioOffer }) {
  const titleId = `${offer.offerId}-title`;
  return (
    <article className={s.catalogCard} aria-labelledby={titleId}>
      <div className={s.cardTop}>
        <span className={s.cardType}>부동산</span>
        <span
          className={
            offer.offering.phase === "subscription-open"
              ? `${s.phase} ${s.phaseActive}`
              : s.phase
          }
        >
          {PHASE_LABEL[offer.offering.phase]}
        </span>
      </div>

      <h3 id={titleId} className={s.cardTitle}>
        <Link href={`/offers/${offer.offerId}`} className={s.stretchedLink}>
          {offer.asset.publicName}
        </Link>
      </h3>
      <p className={s.cardAddress}>{offer.asset.region}</p>

      <dl className={s.cardFacts}>
        <div>
          <dt>공모총액</dt>
          <dd>{formatWon(offer.offering.amountWon)}</dd>
        </div>
        <div>
          <dt>1단위 가격</dt>
          <dd>{formatWon(offer.offering.unitPriceWon)}</dd>
        </div>
        <div>
          <dt>최소 투자</dt>
          <dd>{formatWon(offer.offering.minimumInvestmentWon)}</dd>
        </div>
        <div>
          <dt>예상 배당</dt>
          <dd>
            연 {offer.offering.expectedAnnualDistributionRatePercent}% · {offer.offering.distributionCycleMonths}개월마다
          </dd>
        </div>
      </dl>

      <p className={s.cardMeta}>
        기준일 {formatDate(offer.asOf)} · {PHASE_LABEL[offer.offering.phase]}
      </p>
      <OfferWatchControl
        offerId={offer.offerId}
        offerTitle={offer.title}
        statusText="이 브라우저에 관심 상품으로 저장합니다."
        isAlert={false}
        className={s.cardWatch}
      />
      <span className={s.cardCta}>조건과 근거 보기 →</span>
    </article>
  );
}

export function ScenarioCatalog({
  offers,
  heading = "부동산 상품 검토",
  lead = "공모 조건과 건물 공개사실을 분리해 보고, 근거가 없는 값은 확인하지 못한 항목으로 남깁니다.",
  showDisclosure = true,
  isPageHeading = true,
}: {
  readonly offers: readonly ScenarioOffer[];
  readonly heading?: string;
  readonly lead?: string;
  readonly showDisclosure?: boolean;
  readonly isPageHeading?: boolean;
}) {
  const Heading = isPageHeading ? "h1" : "h2";
  return (
    <>
      <section className={s.catalogHero} aria-labelledby="scenario-catalog-title">
        <div className={s.wrap}>
          <p className={s.eyebrow}>부동산 · 근거 기반 검토</p>
          <Heading id="scenario-catalog-title" className={s.catalogTitle}>{heading}</Heading>
          <p className={s.catalogLead}>{lead}</p>
          <p className={s.scope}>
            공개 승인된 검토 데이터 {offers.length}개 · 기준일 {offers[0] ? formatDate(offers[0].asOf) : "미확인"}
          </p>
          <p className={s.demoNote}>검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.</p>
        </div>
      </section>

      {GROUPS.map((group, index) => {
        const grouped = offers.filter((offer) => offer.offering.phase === group.phase);
        if (grouped.length === 0) return null;
        return (
          <section
            key={group.phase}
            className={`${s.catalogSection} ${index % 2 === 0 ? s.catalogMuted : ""}`}
            aria-labelledby={`${group.phase}-title`}
          >
            <div className={s.wrap}>
              <div className={s.groupHead}>
                <div>
                  <h2 id={`${group.phase}-title`} className={s.groupTitle}>{group.title}</h2>
                  <p className={s.groupLead}>{group.description}</p>
                </div>
                <span className={s.groupCount}>{grouped.length}건</span>
              </div>
              <div className={s.catalogGrid}>
                {grouped.map((offer) => <ScenarioCard key={offer.offerId} offer={offer} />)}
              </div>
            </div>
          </section>
        );
      })}

      {showDisclosure ? (
        <aside className={s.disclosure} aria-label="데모 데이터 안내">
          <div className={s.wrap}>{SCENARIO_DEMO_DISCLOSURE}</div>
        </aside>
      ) : null}
    </>
  );
}
