import Link from "next/link";

import type { ArtDemoOfferCardView } from "@/lib/art/demo-offer-bridge";

import { ArtDemoOfferCard } from "./ArtDemoOfferCard";
import s from "./art-demo-offers.module.css";

export function ArtDemoOfferSection({
  cards,
}: {
  readonly cards: readonly ArtDemoOfferCardView[];
}) {
  const visibleCards = cards.slice(0, 4);

  return (
    <section id="art-demo-offers" className={s.section} aria-labelledby="art-demo-offers-title">
      <div className={s.wrap}>
        <header className={s.header}>
          <div>
            <p className={s.eyebrow}>ART ANALYSIS DEMO</p>
            <h2 id="art-demo-offers-title" className={s.heading}>
              미술품 청약 예정 분석 DEMO
            </h2>
          </div>
          <p className={s.disclaimer}>실제 청약 상품 아님</p>
        </header>

        <p className={s.intro}>
          실제 청약 상품이 아닌 분석 예시입니다. 공시와 공공 원장을 대조한 검증 리포트와 별도이며, 기존 커버리지와 검증 완료 건수에 포함하지 않습니다. 투자 권유나 수익 예측을 제공하지 않습니다.
        </p>

        <div className={s.grid}>
          {visibleCards.map((card) => (
            <ArtDemoOfferCard key={card.id} card={card} />
          ))}
        </div>

        <Link href="/art?scope=current&currentStatus=upcoming" className={s.allLink}>
          미술품 청약 예정 상품 더 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
