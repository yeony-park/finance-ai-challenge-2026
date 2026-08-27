import Image from "next/image";
import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";
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
  descriptionContent,
  descriptionContentTitle,
}: CategoryAboutViewProps) {
  return (
    <div className={`${home.section} ${s.categorySection}`}>
      <div
        className={`${home.wrap} ${s.landingHero} ${
          descriptionContent ? s.landingHeroWithDescription : ""
        }`}
      >
        {heroImage ? (
          <div className={s.landingHeroPhoto} aria-hidden="true">
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

        <section className={s.aboutContent} aria-label={`${title} 설명`}>
          <p className={base.slotLead}>{lead}</p>
          <p className={s.aboutHint}>
            공시 분석 탭에서는 공개된 공시 원문, 공공 자료와의 대조 결과, 그리고
            현재 확인할 수 없는 범위를 근거와 함께 확인할 수 있습니다.
          </p>
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
