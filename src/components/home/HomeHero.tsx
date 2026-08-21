"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import {
  EXAMPLE_QUESTIONS,
  FOLLOW_UP_LABEL,
  followUpQuestions,
  HOME_HERO_LEAD,
  HOME_HERO_TITLE_PARTS,
  INTRO_CARDS,
  SCAFFOLD_NOTICE,
  SEARCH_PLACEHOLDER,
  type FollowUpKey,
  type GuideTarget,
} from "@/lib/content/home";
import { matchScaffold, type ScaffoldMatch } from "@/lib/content/scaffold-match";

import s from "./home.module.css";

const guideCard = (target: GuideTarget) =>
  INTRO_CARDS.find((card) => card.id === target);

const followUpKeyOf = (match: ScaffoldMatch): FollowUpKey | null => {
  if (match.kind === "guide") return match.target;
  if (match.kind === "reports") return "reports";
  if (match.kind === "category") return "category";
  return null;
};

const categoryEntry = (categoryId: string) =>
  CATEGORY_REGISTRY.find((entry) => entry.id === categoryId);

function ScaffoldPanel({ match }: { readonly match: ScaffoldMatch }) {
  if (match.kind === "guide") {
    const card = guideCard(match.target);
    if (!card) return null;
    return (
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{card.title}</h3>
        <div className={s.panelBody}>
          {card.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <ul className={s.sourceList}>
          {card.sources.map((source) => (
            <li key={source.url}>
              출처: {source.label}
            </li>
          ))}
        </ul>
        {match.target === "checklist" ? (
          <Link href="#checklist" className={s.panelLink}>
            확인 질문 8가지 보기
          </Link>
        ) : null}
      </div>
    );
  }

  if (match.kind === "category") {
    const entry = categoryEntry(match.categoryId);
    if (!entry) return null;
    return (
      <div className={s.panel}>
        <h3 className={s.panelTitle}>{entry.label} 카테고리</h3>
        <div className={s.panelBody}>
          <p>{entry.note}</p>
        </div>
        <Link href={entry.href} className={s.panelLink}>
          {entry.label} 확인 현황 보기
        </Link>
      </div>
    );
  }

  if (match.kind === "reports") {
    return (
      <div className={s.panel}>
        <h3 className={s.panelTitle}>공시와 공공 원장이 다르면, 그 사실이 리포트에 남습니다</h3>
        <div className={s.panelBody}>
          <p>
            공모별 검증 리포트에서 판정(일치 · 원장 불일치 · 대조 불가)과 근거,
            정정 전후 재대조 기록을 확인할 수 있습니다.
          </p>
        </div>
        <Link href="/offers" className={s.panelLink}>
          검증 리포트 목록 보기
        </Link>
      </div>
    );
  }

  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>준비된 안내 목록</h3>
      <div className={s.panelBody}>
        <p>입력한 내용과 연결되는 안내를 찾지 못했습니다. 아래에서 골라 볼 수 있습니다.</p>
      </div>
      <div className={s.panelLinkList}>
        {CATEGORY_REGISTRY.map((entry) => (
          <Link key={entry.id} href={entry.href} className={s.chip}>
            {entry.label}
          </Link>
        ))}
        <Link href="/offers" className={s.chip}>
          검증 리포트
        </Link>
        <Link href="/methodology" className={s.chip}>
          검증 방법
        </Link>
      </div>
    </div>
  );
}

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<ScaffoldMatch | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveChip(null);
    setMatch(matchScaffold(query));
  };

  const handleChip = (label: string, target: string) => {
    setActiveChip(label);
    setQuery(label);
    setMatch(
      target === "reports"
        ? { kind: "reports" }
        : { kind: "guide", target: target as GuideTarget },
    );
  };

  return (
    <section className={`${s.section} ${s.hero}`} aria-labelledby="home-hero-title">
      <div className={s.heroPhoto} aria-hidden="true">
        <Image
          src="/hero-dossier.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1088px) 1px, 60vw"
          className={s.heroPhotoImg}
          />
      </div>
      <div className={`${s.wrap} ${s.heroWrap}`}>
        <h1 id="home-hero-title" className={`${s.heroTitle} ${s.heroIn}`}>
          {HOME_HERO_TITLE_PARTS.map((part) =>
            part.isMark ? (
              <em key={part.text} className={s.mark}>
                {part.text}
              </em>
            ) : (
              <span key={part.text}>{part.text}</span>
            ),
          )}
        </h1>
        <p className={`${s.heroLead} ${s.heroIn} ${s.heroIn2}`}>{HOME_HERO_LEAD}</p>

        <div className={`${s.scaffold} ${s.heroIn} ${s.heroIn3}`}>
          <form className={s.searchForm} onSubmit={handleSubmit} role="search">
            <label htmlFor="home-search" className="sr-only">
              궁금한 내용 입력
            </label>
            <input
              id="home-search"
              className={s.searchInput}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              autoComplete="off"
            />
            <button type="submit" className={s.searchButton}>
              안내 찾기
            </button>
          </form>
          <p className={s.scaffoldNote}>{SCAFFOLD_NOTICE}</p>

          <div className={s.chipRow} role="group" aria-label="예시 질문">
            {EXAMPLE_QUESTIONS.map((question) => (
              <button
                key={question.label}
                type="button"
                className={s.chip}
                aria-pressed={activeChip === question.label}
                onClick={() => handleChip(question.label, question.target)}
              >
                {question.label}
              </button>
            ))}
          </div>

          <div aria-live="polite">
            {match ? <ScaffoldPanel match={match} /> : null}
            {(() => {
              const key = match ? followUpKeyOf(match) : null;
              const followUps = key
                ? followUpQuestions(key).filter(
                    (question) => question.label !== activeChip,
                  )
                : [];
              if (followUps.length === 0) return null;
              return (
                <div className={s.followRow} role="group" aria-label={FOLLOW_UP_LABEL}>
                  <span className={s.followLabel}>{FOLLOW_UP_LABEL}</span>
                  {followUps.map((question) => (
                    <button
                      key={question.label}
                      type="button"
                      className={s.chip}
                      onClick={() => handleChip(question.label, question.target)}
                    >
                      {question.label}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        <p className={s.scrollCue} aria-hidden="true">
          <span className={s.scrollCueArrow}>↓</span> SCROLL
        </p>
      </div>
    </section>
  );
}
