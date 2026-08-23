import Link from "next/link";

import type { ArtDemoOfferCardView } from "@/lib/art/demo-offer-bridge";

import s from "./art-demo-offers.module.css";

const unavailable = "확인 불가";

const formatAmount = (amount: number | null): string =>
  amount === null
    ? unavailable
    : `${new Intl.NumberFormat("ko-KR").format(amount)}원`;

export function ArtDemoOfferCard({ card }: { readonly card: ArtDemoOfferCardView }) {
  const titleId = `art-demo-offer-${card.id}-title`;
  const imageStyle = card.imageUrl ? { backgroundImage: `url(${card.imageUrl})` } : undefined;

  return (
    <article className={s.card} aria-labelledby={titleId}>
      <div className={s.cardTop}>
        <span className={s.demoBadge}>DEMO</span>
        <span className={s.status}>{card.statusLabel || unavailable}</span>
      </div>

      <div className={s.artworkImage} style={imageStyle} aria-hidden="true" />

      <div className={s.cardBody}>
        <p className={s.artist}>{card.artistName || unavailable}</p>
        <h3 id={titleId} className={s.title}>
          {card.title || unavailable}
        </h3>
        <p className={s.platform}>플랫폼 · {card.platformName || unavailable}</p>

        <div className={s.grade}>
          <span className={s.gradeLabel}>미술품 분석 등급</span>
          <strong>{card.verdictLabel || unavailable}</strong>
        </div>
        <p className={s.gradeNote}>
          공시·공공데이터 3값 대조 결과와는 별도의 미술품 분석 표시입니다.
        </p>

        <p className={s.headline}>{card.headline || unavailable}</p>
        {card.reasons.length > 0 ? (
          <ul className={s.reasons}>
            {card.reasons.map((reason) => (
              <li key={reason}>{reason || unavailable}</li>
            ))}
          </ul>
        ) : (
          <p className={s.noReason}>{unavailable}</p>
        )}

        <dl className={s.facts}>
          <div>
            <dt>최소 투자금</dt>
            <dd>{formatAmount(card.minimumInvestment)}</dd>
          </div>
          <div>
            <dt>총 공모금액</dt>
            <dd>{formatAmount(card.totalOfferingAmount)}</dd>
          </div>
          <div>
            <dt>기준일</dt>
            <dd>{card.asOfDate || unavailable}</dd>
          </div>
        </dl>

        <Link href={card.href} className={s.cardLink}>
          데모 상품 상세 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
