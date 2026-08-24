"use client";

import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { orderByInterests, useProfile } from "@/components/site/profile";
import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import { INTEREST_TAG } from "@/lib/content/onboarding";

import s from "./home.module.css";

export function CategoryGrid() {
  const profile = useProfile();
  const entries = orderByInterests(CATEGORY_REGISTRY, profile.interests);

  return (
    <section className={s.section} aria-labelledby="category-grid-title">
      <div className={s.wrap}>
        <h2 id="category-grid-title" className={s.sectionTitle}>
          카테고리별 확인 현황
        </h2>
        <p className={s.sectionLead}>
          네 카테고리를 같은 기준으로 다룹니다. 데이터 깊이의 차이는 각 페이지의
          층별 지원 선언으로 그대로 표시합니다.
        </p>
        <Reveal>
        <div className={s.categoryGrid}>
          {entries.map((entry) => (
            <Link key={entry.id} href={entry.href} className={s.categoryCard}>
              <span className={s.categoryLabel}>
                {entry.label}
                {entry.subLabel ? (
                  <span className={s.categorySub}>({entry.subLabel})</span>
                ) : null}
                {profile.interests.includes(entry.id) ? (
                  <span className={s.checkTag}>{INTEREST_TAG}</span>
                ) : null}
              </span>
              <p className={s.categoryNote}>{entry.note}</p>
            </Link>
          ))}
        </div>
        <Link href="/offers" className={s.bandLink}>
          전체 검증 리포트 보기 →
        </Link>
        </Reveal>
      </div>
    </section>
  );
}
