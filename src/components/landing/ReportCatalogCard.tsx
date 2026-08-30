import Link from "next/link";

import { Pressable } from "@/components/motion/Pressable";

import s from "./landing.module.css";
import type { ReportCatalogCardView } from "./report-catalog";

export function ReportCatalogCard({
  card,
}: {
  readonly card: ReportCatalogCardView;
}) {
  const titleId = `report-catalog-${card.id}-title`;

  return (
    <Pressable hover={1.01} tap={0.99}>
      <article
        className={s.offerCard}
        aria-labelledby={titleId}
      >
        <div className={s.offerTop}>
          <h3 id={titleId} className={s.offerTitle}>
            {card.title}
          </h3>
          <span className={s.dday}>{card.badge}</span>
        </div>

        <p className={s.schedule}>
          <span className={s.scheduleAsset}>{card.assetLabel}</span> ·{" "}
          {card.meta}
        </p>
        <p className={s.offerAmendment}>{card.summary}</p>

        <Link
          href={card.href}
          className={s.offerCardLink}
          aria-label={`${card.title} 검증 리포트 열기`}
        />
      </article>
    </Pressable>
  );
}
