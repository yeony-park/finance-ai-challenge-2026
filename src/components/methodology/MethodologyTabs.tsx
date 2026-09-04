"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

import type { MethodologyTabId } from "@/lib/content/methodology-tabs";

import s from "@/app/methodology/methodology.module.css";

export interface MethodologyTab {
  readonly id: MethodologyTabId;
  readonly label: string;
  readonly content: ReactNode;
}

const tabFromHash = (
  hash: string,
  tabs: readonly MethodologyTab[],
): MethodologyTabId | null => {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  return tabs.some((tab) => tab.id === id) ? (id as MethodologyTabId) : null;
};

export function MethodologyTabs({
  tabs,
}: {
  readonly tabs: readonly MethodologyTab[];
}) {
  const defaultTab = tabs[0];
  const [activeId, setActiveId] = useState<MethodologyTabId | undefined>(
    defaultTab?.id,
  );
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? defaultTab;

  useEffect(() => {
    const syncFromHash = () => {
      setActiveId(tabFromHash(window.location.hash, tabs) ?? defaultTab?.id);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, [defaultTab?.id, tabs]);

  if (!activeTab) return null;

  const selectTab = (id: MethodologyTabId) => {
    setActiveId(id);
    const hash = `#${id}`;
    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, "", hash);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    selectTab(nextTab.id);
    document.getElementById(`methodology-tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className={s.tabWorkspace}>
      <nav className={s.tabNav} aria-label="검증 방법 목차">
        <div className={s.tabNavRow} role="tablist" aria-label="검증 방법 항목">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                type="button"
                role="tab"
                id={`methodology-tab-${tab.id}`}
                aria-controls="methodology-tab-panel"
                aria-selected={isActive}
                className={isActive ? `${s.tab} ${s.tabActive}` : s.tab}
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                tabIndex={isActive ? 0 : -1}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        className={s.tabPanel}
        id="methodology-tab-panel"
        role="tabpanel"
        aria-labelledby={`methodology-tab-${activeTab.id}`}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
