"use client";

import Link from "next/link";

import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import { INTRO_CARDS, type GuideTarget } from "@/lib/content/home";
import type { ScaffoldMatch } from "@/lib/content/scaffold-match";

import controls from "./home-controls.module.css";
import content from "./home-content.module.css";
import s from "./HomeHeroSearch.module.css";
import visual from "./HomeHeroVisual.module.css";

const guideCard = (target: GuideTarget) =>
  INTRO_CARDS.find((card) => card.id === target);

const categoryEntry = (categoryId: string) =>
  CATEGORY_REGISTRY.find((entry) => entry.id === categoryId);

export function HomeScaffoldPanel({
  match,
}: {
  readonly match: ScaffoldMatch;
}) {
  if (match.kind === "guide") {
    const card = guideCard(match.target);
    if (!card) return null;
    return (
      <div className={`${s.panel} ${visual.panel}`}>
        <h3 className={`${s.panelTitle} ${visual.panelTitle}`}>{card.title}</h3>
        <div className={`${s.panelBody} ${visual.panelBody}`}>
          {card.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <ul className={`${content.sourceList} ${visual.sourceList}`}>
          {card.sources.map((source) => (
            <li key={source.url}>출처: {source.label}</li>
          ))}
        </ul>
        {match.target === "checklist" ? (
          <Link href="#checklist" className={s.panelLink}>
            확인 질문 8가지 보기 <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    );
  }

  if (match.kind === "category") {
    const entry = categoryEntry(match.categoryId);
    if (!entry) return null;
    return (
      <div className={`${s.panel} ${visual.panel}`}>
        <h3 className={`${s.panelTitle} ${visual.panelTitle}`}>
          {entry.label} 카테고리
        </h3>
        <div className={`${s.panelBody} ${visual.panelBody}`}>
          <p>{entry.note}</p>
        </div>
        <Link href={entry.href} className={s.panelLink}>
          {entry.label} 확인 현황 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  if (match.kind === "reports") {
    return (
      <div className={`${s.panel} ${visual.panel}`}>
        <h3 className={`${s.panelTitle} ${visual.panelTitle}`}>
          공시와 공공 원장이 다르면, 그 사실이 리포트에 남습니다
        </h3>
        <div className={`${s.panelBody} ${visual.panelBody}`}>
          <p>
            공모별 검증 리포트에서 판정(일치 · 원장 불일치 · 대조 불가)과 근거,
            정정 전후 재대조 기록을 확인할 수 있습니다.
          </p>
        </div>
        <Link href="/offers" className={s.panelLink}>
          검증 리포트 보기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`${s.panel} ${visual.panel}`}>
      <h3 className={`${s.panelTitle} ${visual.panelTitle}`}>
        준비된 안내 목록
      </h3>
      <div className={`${s.panelBody} ${visual.panelBody}`}>
        <p>
          입력한 내용과 연결되는 안내를 찾지 못했습니다. 아래에서 골라 볼 수
          있습니다.
        </p>
      </div>
      <div className={s.panelLinkList}>
        {CATEGORY_REGISTRY.map((entry) => (
          <Link key={entry.id} href={entry.href} className={controls.chip}>
            {entry.label}
          </Link>
        ))}
        <Link href="/offers" className={controls.chip}>
          검증 리포트
        </Link>
        <Link href="/methodology" className={controls.chip}>
          검증 방법
        </Link>
      </div>
    </div>
  );
}
