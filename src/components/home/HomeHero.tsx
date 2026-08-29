"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import {
  EXAMPLE_QUESTIONS,
  FOLLOW_UP_LABEL,
  followUpQuestions,
  HERO_CHIP_LABELS,
  HERO_EYEBROW,
  HERO_SOURCES_LINE,
  HOME_HERO_LEAD,
  HOME_HERO_TITLE_PARTS,
  INTRO_CARDS,
  SCAFFOLD_NOTICE,
  SEARCH_PLACEHOLDER,
  type FollowUpKey,
  type GuideTarget,
} from "@/lib/content/home";
import { matchScaffold, type ScaffoldMatch } from "@/lib/content/scaffold-match";
import type { GlobalSearchResponse, GlobalSearchResult } from "@/lib/knowledge/global-search";

import { HeroShards } from "./HeroShards";
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

const HERO_CHIPS = HERO_CHIP_LABELS.map((label) =>
  EXAMPLE_QUESTIONS.find((question) => question.label === label),
).filter((question): question is (typeof EXAMPLE_QUESTIONS)[number] =>
  question !== undefined,
);

type SearchResult = Pick<GlobalSearchResult, "id" | "title" | "isScenario" | "phase" | "href">;
type SearchResponse = Pick<GlobalSearchResponse, "mode" | "guidance"> & {
  readonly results: readonly SearchResult[];
};
type ReviewArea = NonNullable<GlobalSearchResponse["guidance"]>["reviewAreas"][number];

const SEARCH_PHASE_LABEL: Readonly<Record<SearchResult["phase"], string>> = {
  upcoming: "청약 예정",
  "subscription-open": "청약 중",
  closed: "청약 종료",
  "listed-trading": "상장 거래",
  settled: "종료",
};

const SCENARIO_PHASE_LABEL: Readonly<Record<SearchResult["phase"], string>> = {
  upcoming: "가상 청약 예정 시나리오",
  "subscription-open": "가상 청약 시나리오",
  closed: "가상 청약 종료 시나리오",
  "listed-trading": "가상 상장 거래 시나리오",
  settled: "가상 종료 사례",
};

const REVIEW_AREA_LABEL: Readonly<Record<ReviewArea, string>> = {
  asset: "건물 기본정보",
  "return-cost": "수익·비용",
  financing: "금융",
  exit: "회수",
  "operator-history": "운영그룹 완료 이력",
};

export function SearchResultsPanel({ results }: { readonly results: readonly SearchResult[] }) {
  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>검색 결과</h3>
      <ul className={s.searchResults}>
        {results.map((result) => (
          <li key={result.id}>
            <Link href={result.href} className={s.searchResultLink}>{result.title}</Link>
            <span>
              {result.isScenario
                ? `가상 시나리오 · ${SCENARIO_PHASE_LABEL[result.phase]}`
                : SEARCH_PHASE_LABEL[result.phase]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewGuidancePanel({ guidance }: { readonly guidance: NonNullable<SearchResponse["guidance"]> }) {
  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>상품 순위 대신 확인할 기준</h3>
      <div className={s.panelBody}><p>{guidance.message}</p></div>
      <div className={s.panelBody}>
        <p>확인 영역 · {guidance.reviewAreas.map((area) => REVIEW_AREA_LABEL[area]).join(" · ")}</p>
      </div>
      <Link href="/real-estate" className={s.panelLink}>부동산 검토 데이터 보기</Link>
    </div>
  );
}

export function NoSearchResultsPanel() {
  return (
    <div className={s.panel}>
      <h3 className={s.panelTitle}>검색 결과 없음</h3>
      <div className={s.panelBody}>
        <p>상품명이나 청약·상장 거래·종료 같은 단계로 다시 검색해 주세요.</p>
      </div>
    </div>
  );
}

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
  const [results, setResults] = useState<readonly SearchResult[] | null>(null);
  const [guidance, setGuidance] = useState<SearchResponse["guidance"] | null>(null);
  const [hasEmptyResults, setHasEmptyResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveChip(null);
    setHasEmptyResults(false);
    setIsSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: query, limit: 10 }),
      });
      if (!response.ok) throw new Error("search failed");
      const body = (await response.json()) as SearchResponse;
      const found = body.results ?? [];
      const reviewGuidance = body.mode === "review-guidance" ? body.guidance ?? null : null;
      setResults(body.mode === "matches" && found.length > 0 ? found : null);
      setGuidance(reviewGuidance);
      setHasEmptyResults(body.mode === "matches" && found.length === 0);
      setMatch(null);
    } catch {
      setResults(null);
      setGuidance(null);
      setHasEmptyResults(false);
      setMatch(matchScaffold(query));
    } finally {
      setIsSearching(false);
    }
  };

  const handleChip = (label: string, target: string) => {
    setActiveChip(label);
    setQuery(label);
    setResults(null);
    setGuidance(null);
    setHasEmptyResults(false);
    setMatch(
      target === "reports"
        ? { kind: "reports" }
        : { kind: "guide", target: target as GuideTarget },
    );
  };

  return (
    <section className={`${s.section} ${s.hero}`} aria-labelledby="home-hero-title">
      <div className={`${s.wrap} ${s.heroWrap}`}>
        <div>
          <p className={`${s.heroEyebrow} ${s.heroIn}`}>{HERO_EYEBROW}</p>
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
              <button type="submit" className={s.searchButton} disabled={isSearching || !query.trim()}>
                {isSearching ? "찾는 중" : "안내 찾기"}
              </button>
            </form>
            <p className={s.scaffoldNote}>{SCAFFOLD_NOTICE}</p>

            <div className={s.chipRow} role="group" aria-label="예시 질문">
              {HERO_CHIPS.map((question) => (
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
              {results ? <SearchResultsPanel results={results} /> : null}
              {guidance ? <ReviewGuidancePanel guidance={guidance} /> : null}
              {hasEmptyResults ? <NoSearchResultsPanel /> : null}
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

            <p className={s.heroSources}>{HERO_SOURCES_LINE}</p>
          </div>
        </div>

        <HeroShards />

        <p className={s.scrollCue} aria-hidden="true">
          <span className={s.scrollCueArrow}>↓</span> SCROLL
        </p>
      </div>
    </section>
  );
}
