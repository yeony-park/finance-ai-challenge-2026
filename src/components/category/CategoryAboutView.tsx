import Image from "next/image";
import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { LAYERS_SECTION_TITLE } from "@/lib/content/category-landing";
import type { CategoryTab } from "@/lib/content/category-tabs";
import type { CategoryDescriptor } from "@/lib/verify/contract/category";

import home from "@/components/home/home.module.css";
import { CategoryPageNav } from "./CategoryPageNav";
import { LayerSupportTable } from "./LayerSupportTable";
import base from "./category.module.css";
import s from "./category-shell.module.css";

interface CategoryAboutViewProps {
  readonly title: string;
  readonly lead: string;
  readonly descriptor: CategoryDescriptor | null;
  readonly categoryHref: string;
  readonly activeTab: CategoryTab;
  readonly heroImage: string | null;
  readonly leadVisual?: ReactNode;
  readonly analysisHintVisual?: ReactNode;
  readonly replaceCopyWithVisuals?: boolean;
  readonly descriptionContent: ReactNode;
  readonly descriptionContentTitle: string;
}

export function CategoryAboutView({
  title,
  lead,
  descriptor,
  categoryHref,
  activeTab,
  heroImage,
  leadVisual = null,
  analysisHintVisual = null,
  replaceCopyWithVisuals = false,
  descriptionContent,
  descriptionContentTitle,
}: CategoryAboutViewProps) {
  const hasInlineVisuals = leadVisual !== null || analysisHintVisual !== null;

  return (
    <div className={`${home.section} ${s.categorySection}`}>
      <div
        className={`${home.wrap} ${s.landingHero} ${
          descriptionContent ? s.landingHeroWithDescription : ""
        }`}
      >
        {heroImage ? (
          <div
            className={`${s.landingHeroPhoto} ${
              hasInlineVisuals ? s.landingHeroPhotoWithVisuals : ""
            }`}
            aria-hidden="true"
          >
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="(max-width: 900px) calc(100vw - 2.25rem), 50vw"
              className={s.landingHeroImg}
            />
          </div>
        ) : null}
        <div className={s.landingHeroBody}>
          <h1 className={home.sectionTitle}>{title}</h1>
          <CategoryPageNav
            title={title}
            href={categoryHref}
            activeTab={activeTab}
          />
        </div>

        <section
          className={`${s.aboutContent} ${
            hasInlineVisuals ? s.aboutContentWithVisuals : ""
          }`}
          aria-label={`${title} 설명`}
        >
          {leadVisual ? (
            <div className={s.aboutVisualBlock}>
              <div className={s.aboutLeadVisual}>{leadVisual}</div>
              {replaceCopyWithVisuals ? null : (
                <p className={`${base.slotLead} ${s.aboutLead}`}>{lead}</p>
              )}
            </div>
          ) : (
            <p className={`${base.slotLead} ${s.aboutLead}`}>{lead}</p>
          )}
          {analysisHintVisual ? (
            <div className={s.aboutVisualBlock}>
              <div className={s.aboutHintVisual}>{analysisHintVisual}</div>
              {replaceCopyWithVisuals ? null : (
                <p className={s.aboutHint}>
                  공시 분석 탭에서는 공개된 공시 원문, 공공 자료와의 대조
                  결과, 그리고 현재 확인할 수 없는 범위를 근거와 함께 확인할
                  수 있습니다.
                </p>
              )}
            </div>
          ) : (
            <p className={s.aboutHint}>
              공시 분석 탭에서는 공개된 공시 원문, 공공 자료와의 대조 결과,
              그리고 현재 확인할 수 없는 범위를 근거와 함께 확인할 수 있습니다.
            </p>
          )}
          <nav
            className={s.aboutShortcuts}
            aria-label={`${title} 설명 바로가기`}
          >
            {descriptionContent ? (
              <a
                className={s.aboutShortcut}
                href={`#${title}-description-content`}
              >
                <span>{descriptionContentTitle}</span>
                <span aria-hidden="true">→</span>
              </a>
            ) : null}
            <a className={s.aboutShortcut} href={`#${title}-layers`}>
              <span>{LAYERS_SECTION_TITLE}</span>
              <span aria-hidden="true">→</span>
            </a>
          </nav>
        </section>
      </div>

      <div
        className={`${home.wrap} ${s.descriptionArea} ${
          descriptionContent ? s.descriptionAreaCompact : ""
        }`}
      >
        {descriptionContent ? (
          <section
            className={base.slot}
            aria-labelledby={`${title}-description-content`}
          >
            <Reveal className={base.slotGrid}>
              <h2
                id={`${title}-description-content`}
                className={base.slotTitle}
              >
                {descriptionContentTitle}
              </h2>
              {descriptionContent}
            </Reveal>
          </section>
        ) : null}

        <section className={base.slot} aria-labelledby={`${title}-layers`}>
          <Reveal className={base.slotGrid}>
            <LayerSupportTable
              descriptor={descriptor}
              headingId={`${title}-layers`}
            />
          </Reveal>
        </section>
      </div>
    </div>
  );
}
