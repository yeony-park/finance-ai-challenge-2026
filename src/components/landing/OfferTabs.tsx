"use client";

import { useRef, useState, type KeyboardEvent } from "react";

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

export const nextOfferTab = (current: OfferTab, key: string): OfferTab | null => {
  const index = TAB_ITEMS.findIndex((tab) => tab.id === current);
  if (key === "Home") return TAB_ITEMS[0].id;
  if (key === "End") return TAB_ITEMS.at(-1)?.id ?? null;
  if (key === "ArrowRight") return TAB_ITEMS[(index + 1) % TAB_ITEMS.length].id;
  if (key === "ArrowLeft") return TAB_ITEMS[(index - 1 + TAB_ITEMS.length) % TAB_ITEMS.length].id;
  return null;
};

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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextOfferTab(activeTab, event.key);
    if (!next) return;
    event.preventDefault();
    setActiveTab(next);
    tabRefs.current[TAB_ITEMS.findIndex((tab) => tab.id === next)]?.focus();
  };
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
                ref={(node) => { tabRefs.current[TAB_ITEMS.indexOf(tab)] = node; }}
                id={`offer-tab-${tab.id}`}
                type="button"
                role="tab"
                className={isActive ? `${s.offerTab} ${s.offerTabActive}` : s.offerTab}
                aria-selected={isActive}
                aria-controls="offer-tab-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleKeyDown}
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
