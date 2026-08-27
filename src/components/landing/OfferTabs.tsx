"use client";

import { useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import type { OfferCardView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";
import { OfferCard } from "./OfferCard";

type OfferTab = "upcoming" | "open" | "closed";

interface OfferTabsProps {
  readonly upcoming: readonly OfferCardView[];
  readonly open: readonly OfferCardView[];
  readonly closed: readonly OfferCardView[];
}

const TAB_ITEMS: readonly { readonly id: OfferTab; readonly label: string }[] = [
  { id: "upcoming", label: "청약 예정" },
  { id: "open", label: "진행 중" },
  { id: "closed", label: "종료" },
];

const EMPTY_MESSAGE: Record<OfferTab, string> = {
  upcoming: "청약 예정인 공모가 없습니다.",
  open: "진행 중인 공모가 없습니다.",
  closed: "종료된 공모가 없습니다.",
};

export function OfferTabs({ upcoming, open, closed }: OfferTabsProps) {
  const [activeTab, setActiveTab] = useState<OfferTab>("upcoming");
  const cardsByTab: Record<OfferTab, readonly OfferCardView[]> = {
    upcoming,
    open,
    closed,
  };
  const cards = cardsByTab[activeTab];

  return (
    <section id="offers" className={`${s.section} ${s.sectionMuted}`} aria-label="공모 상태별 검증 리포트">
      <Reveal className={s.wrap}>
        <div className={s.offerTabs} role="tablist" aria-label="공모 상태">
          {TAB_ITEMS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                id={`offer-tab-${tab.id}`}
                type="button"
                role="tab"
                className={isActive ? `${s.offerTab} ${s.offerTabActive}` : s.offerTab}
                aria-selected={isActive}
                aria-controls="offer-tab-panel"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          id="offer-tab-panel"
          className={s.offerPanel}
          role="tabpanel"
          aria-labelledby={`offer-tab-${activeTab}`}
        >
          {cards.length > 0 ? (
            <div className={s.offerGrid}>
              {cards.map((card) => (
                <OfferCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <p className={s.emptyState}>{EMPTY_MESSAGE[activeTab]}</p>
          )}
        </div>
      </Reveal>
    </section>
  );
}
