"use client";

import { useState } from "react";

import type { OfferCardView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";
import { OfferCard } from "./OfferCard";
import { ReportCatalogCard } from "./ReportCatalogCard";
import type { ReportCatalogCardView } from "./report-catalog";

type OfferTab = "all" | "upcoming" | "open" | "closed";

interface OfferTabsProps {
  readonly upcoming: readonly OfferCardView[];
  readonly open: readonly OfferCardView[];
  readonly closed: readonly OfferCardView[];
  readonly catalog: readonly ReportCatalogCardView[];
}

const TAB_ITEMS: readonly { readonly id: OfferTab; readonly label: string }[] = [
  { id: "all", label: "전체" },
  { id: "upcoming", label: "청약 예정" },
  { id: "open", label: "진행 중" },
  { id: "closed", label: "종료" },
];

const EMPTY_MESSAGE: Record<OfferTab, string> = {
  all: "공개된 검증 리포트가 없습니다.",
  upcoming: "청약 예정인 공모가 없습니다.",
  open: "진행 중인 공모가 없습니다.",
  closed: "종료된 공모가 없습니다.",
};

type ListedCard =
  | { readonly kind: "report"; readonly card: OfferCardView }
  | { readonly kind: "catalog"; readonly card: ReportCatalogCardView };

const reportCards = (
  cards: readonly OfferCardView[],
): readonly ListedCard[] =>
  cards.map((card) => ({ kind: "report", card }));

const catalogCards = (
  cards: readonly ReportCatalogCardView[],
): readonly ListedCard[] =>
  cards.map((card) => ({ kind: "catalog", card }));

export function OfferTabs({ upcoming, open, closed, catalog }: OfferTabsProps) {
  const [activeTab, setActiveTab] = useState<OfferTab>("all");
  const catalogByPhase = (phase: Exclude<OfferTab, "all">) =>
    catalog.filter((card) => card.phase === phase);
  const cardsByTab: Record<OfferTab, readonly ListedCard[]> = {
    all: [
      ...reportCards(upcoming),
      ...reportCards(open),
      ...reportCards(closed),
      ...catalogCards(catalog),
    ],
    upcoming: [
      ...reportCards(upcoming),
      ...catalogCards(catalogByPhase("upcoming")),
    ],
    open: [...reportCards(open), ...catalogCards(catalogByPhase("open"))],
    closed: [
      ...reportCards(closed),
      ...catalogCards(catalogByPhase("closed")),
    ],
  };
  const cards = cardsByTab[activeTab];

  return (
    <section id="offers" className={`${s.section} ${s.sectionMuted}`} aria-label="공모 상태별 검증 리포트">
      <div className={s.wrap}>
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
              {cards.map((entry) =>
                entry.kind === "report" ? (
                  <OfferCard key={`report-${entry.card.id}`} card={entry.card} />
                ) : (
                  <ReportCatalogCard
                    key={`catalog-${entry.card.id}`}
                    card={entry.card}
                  />
                ),
              )}
            </div>
          ) : (
            <p className={s.emptyState}>{EMPTY_MESSAGE[activeTab]}</p>
          )}
        </div>
      </div>
    </section>
  );
}
