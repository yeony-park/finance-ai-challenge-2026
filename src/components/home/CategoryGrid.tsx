"use client";

import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { useProfile } from "@/components/site/profile";
import { categoryById } from "@/lib/content/categories";
import { INTEREST_TAG } from "@/lib/content/onboarding";

import s from "./home.module.css";

const CATEGORY_ORDER = ["art", "cattle", "pig", "real-estate"] as const;

const categoryImageSrc = (categoryId: string) =>
  `/category-${categoryId}-3d-${
    categoryId === "cattle" ? "v4" : categoryId === "real-estate" ? "v2" : "v3"
  }.png`;

export function CategoryGrid() {
  const profile = useProfile();
  const entries = CATEGORY_ORDER.map((categoryId) => categoryById(categoryId));

  return (
    <section className={s.section} aria-labelledby="category-grid-title">
      <div className={s.wrap}>
        <header className={`${s.sectionHead} ${s.categorySectionHead}`}>
          <div className={s.sectionTitleRow}>
            <h2 id="category-grid-title" className={s.sectionTitle}>
              카테고리별 확인 현황
            </h2>
            <Link href="/offers" className={s.sectionAllReports}>
              전체 검증 리포트 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className={s.sectionLead}>
            미술품·한우·한돈·부동산의 공시 내용을 공공 원장과 공식 자료로 항목별
            대조하고, 확인 근거가 없으면 “대조 불가”로 표시합니다.
          </p>
        </header>
        <Reveal>
          <div className={s.categoryGrid}>
            {entries.map((entry, index) => (
              <article key={entry.id} className={s.categoryCard}>
                <Link
                  href={entry.href}
                  className={s.categoryVisual}
                  aria-label={`${entry.label} 확인 현황 보기`}
                >
                  <Image
                    src={categoryImageSrc(entry.id)}
                    alt={`${entry.label} 공시 대조를 상징하는 3차원 이미지`}
                    fill
                    sizes="(max-width: 760px) calc(100vw - 2.25rem), (max-width: 1100px) calc((100vw - 5rem) / 2), 25vw"
                    className={`${s.categoryPhotoImg} ${
                      entry.id === "pig" ? s.categoryPhotoImgPig : ""
                    }`}
                  />
                  <span className={s.categoryIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>
                <div className={s.categoryBody}>
                  <h3 className={s.categoryLabel}>
                    {entry.label}
                    {entry.subLabel ? (
                      <span className={s.categorySub}>({entry.subLabel})</span>
                    ) : null}
                    {profile.interests.includes(entry.id) ? (
                      <span className={s.checkTag}>{INTEREST_TAG}</span>
                    ) : null}
                  </h3>
                  <p className={s.categoryNote}>
                    {entry.cardNote.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </p>
                  <Link href={entry.href} className={s.categoryReportLink}>
                    검증 리포트 보기 <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
