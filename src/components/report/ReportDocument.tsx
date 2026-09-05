"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { useProfile } from "@/components/site/profile";
import type { NarrativeLevel } from "@/lib/verify/narrative/types";
import type { DemoView, ExplainLevel } from "@/lib/verify/report/view-model";

import { RealitySection } from "./RealitySection";
import { ReportChapterNav } from "./ReportChapterNav";
import type { ReportSection, ReportSectionKey } from "./report-sections";
import { VerdictHero } from "./VerdictHero";
import s from "./report.module.css";

const REPORT_SECTION_PANEL_ID = "report-section-panel";

export const reportSectionIdFromHash = (
  hash: string,
  sections: readonly ReportSection[],
): string | null => {
  const sectionId = hash.startsWith("#") ? hash.slice(1) : hash;
  return sections.some((section) => section.id === sectionId) ? sectionId : null;
};

export type ReportSectionContent = Partial<
  Record<ReportSectionKey, ReactNode>
>;

export interface ReportProductHeader {
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly status: string;
  readonly title: string;
  readonly meta: string;
  readonly facts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
}

export function ReportDocument({
  view,
  narrative = null,
  aiSummary = null,
  overview = null,
  lifecycle,
  sections,
  sectionContent,
  productHeader,
}: {
  readonly view?: DemoView;
  readonly narrative?: Readonly<Record<ExplainLevel, NarrativeLevel>> | null;
  readonly aiSummary?: ReactNode;
  readonly overview?: ReactNode;
  readonly lifecycle?: ReactNode;
  readonly sections: readonly ReportSection[];
  readonly sectionContent: ReportSectionContent;
  readonly productHeader?: ReportProductHeader;
}) {
  const profile = useProfile();
  const [levelOverride, setLevelOverride] = useState<ExplainLevel | null>(null);
  const defaultSectionId = sections[0]?.id ?? "";
  const [activeId, setActiveId] = useState(defaultSectionId);
  const level: ExplainLevel = levelOverride ?? profile.level ?? "easy";
  const content: ReportSectionContent = {
    ...(view
      ? {
          verdict: (
            <VerdictHero
              view={view}
              level={level}
              narrative={narrative}
              aiSummary={aiSummary}
              overview={overview}
              lifecycle={lifecycle}
              onLevelChange={setLevelOverride}
              showOfferTitle={productHeader === undefined}
            />
          ),
          reality: <RealitySection view={view} level={level} />,
        }
      : {}),
    ...sectionContent,
  };
  const activeSection =
    sections.find((section) => section.id === activeId) ?? sections[0];

  useEffect(() => {
    const syncSectionFromHash = () => {
      setActiveId(
        reportSectionIdFromHash(window.location.hash, sections) ?? defaultSectionId,
      );
    };

    syncSectionFromHash();
    window.addEventListener("hashchange", syncSectionFromHash);
    window.addEventListener("popstate", syncSectionFromHash);

    return () => {
      window.removeEventListener("hashchange", syncSectionFromHash);
      window.removeEventListener("popstate", syncSectionFromHash);
    };
  }, [defaultSectionId, sections]);

  const handleSectionSelect = (sectionId: string) => {
    if (!sections.some((section) => section.id === sectionId)) return;
    if (sectionId === activeSection.id) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    setActiveId(sectionId);
    const hash = `#${sectionId}`;
    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, "", hash);
    }
  };

  if (!activeSection) return null;

  return (
    <>
      {productHeader ? (
        <header className={`${s.wrap} ${s.productHeader}`}>
          <div className={s.productHeaderImage}>
            <Image
              src={productHeader.imageSrc}
              alt={productHeader.imageAlt}
              fill
              priority
              sizes="(max-width: 820px) 100vw, 42vw"
            />
          </div>
          <div className={s.productHeaderCopy}>
            <span className={s.productHeaderStatus}>{productHeader.status}</span>
            <h1 className={s.productHeaderTitle}>{productHeader.title}</h1>
            <p className={s.productHeaderMeta}>{productHeader.meta}</p>
            <dl className={s.productHeaderFacts}>
              {productHeader.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>
      ) : null}
      <ReportChapterNav
        sections={sections}
        activeId={activeSection.id}
        onSelect={handleSectionSelect}
      />
      <div
        id={REPORT_SECTION_PANEL_ID}
        role="tabpanel"
        aria-labelledby={`report-tab-${activeSection.id}`}
      >
        {content[activeSection.key] ?? null}
      </div>
    </>
  );
}
