"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { type GuideTarget } from "@/lib/content/home";
import type { ScaffoldMatch } from "@/lib/content/scaffold-match";
import type {
  GlobalSearchResponse,
  GlobalSearchResult,
} from "@/lib/knowledge/global-search";
import type { GenericKnowledgeEvidence } from "@/lib/knowledge/retrieval";
import { safeCitationUrl } from "@/components/ai-assistant/EvidenceQuery";

import {
  HERO_SHRINK_SCROLL_DISTANCE,
  heroOverscrollStyle,
  SEARCH_TRANSITION_MS,
  scrollImmediately,
} from "./home-hero-config";
import { HomeHeroTitle } from "./HomeHeroTitle";
import { HomeSearchScaffold } from "./HomeSearchScaffold";
import { HomeSectionDial } from "./HomeSectionDial";
import home from "./home.module.css";
import content from "./home-content.module.css";
import search from "./HomeHeroSearch.module.css";
import visual from "./HomeHeroVisual.module.css";
import motion from "./home-motion.module.css";
import { useHomeHeroVisual } from "./useHomeHeroVisual";
import { useHomeSectionDial } from "./useHomeStageNavigation";
import { bindHomeIntroScroll } from "./home-intro-scroll";

type SearchResult = Pick<
  GlobalSearchResult,
  "id" | "productId" | "title" | "isScenario" | "phase" | "href"
>;
type SearchResponse = GlobalSearchResponse;
type ReviewArea = NonNullable<
  SearchResponse["guidance"]
>["reviewAreas"][number];

const SEARCH_PHASE_LABEL: Readonly<Record<SearchResult["phase"], string>> = {
  upcoming: "청약 예정",
  "subscription-open": "청약 중",
  closed: "청약 종료",
  "listed-trading": "상장 거래",
  settled: "종료",
  "evidence-only": "공시 근거 확인",
};

const SCENARIO_PHASE_LABEL: Readonly<Record<SearchResult["phase"], string>> = {
  upcoming: "가상 청약 예정 시나리오",
  "subscription-open": "가상 청약 시나리오",
  closed: "가상 청약 종료 시나리오",
  "listed-trading": "가상 상장 거래 시나리오",
  settled: "가상 종료 사례",
  "evidence-only": "가상 공시 근거 확인",
};

const REVIEW_AREA_LABEL: Readonly<Record<ReviewArea, string>> = {
  asset: "건물 기본정보",
  "return-cost": "수익·비용",
  financing: "금융",
  exit: "회수",
  "operator-history": "운영그룹 완료 이력",
};

export function SearchResultsPanel({
  results,
}: {
  readonly results: readonly SearchResult[];
}) {
  return (
    <div className={`${search.panel} ${visual.panel}`}>
      <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>검색 결과</h3>
      <ul className={home.searchResults}>
        {results.map((result) => (
          <li key={result.id}>
            <Link href={result.href} className={home.searchResultLink}>
              {result.title}
            </Link>
            <span>
              {result.isScenario
                ? SCENARIO_PHASE_LABEL[result.phase]
                : SEARCH_PHASE_LABEL[result.phase]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiSearchAnswerPanel({
  generatedAnswer,
  results,
}: {
  readonly generatedAnswer: NonNullable<SearchResponse["generatedAnswer"]>;
  readonly results: readonly SearchResult[];
}) {
  const citedIds = new Set(generatedAnswer.citedProductIds);
  const citedResults = results.filter((result) =>
    citedIds.has(result.productId),
  );
  return (
    <div className={`${search.panel} ${visual.panel}`}>
      <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>
        AI 검색 안내
      </h3>
      <div className={`${search.panelBody} ${visual.panelBody}`}>
        <p>{generatedAnswer.answer}</p>
      </div>
      {citedResults.length > 0 ? (
        <div
          className={home.aiCitedLinks}
          aria-label="AI 검색 안내에 인용된 상품"
        >
          <span>함께 확인할 상품</span>
          {citedResults.map((result) => (
            <Link key={result.id} href={result.href}>
              {result.title}
            </Link>
          ))}
        </div>
      ) : null}
      <p className={home.aiAnswerNote}>
        검색 결과를 바탕으로 생성한 안내입니다. 상품 상세와 연결된 근거를 함께
        확인해 주세요.
      </p>
    </div>
  );
}

export function GeneralAiAnswerPanel({
  generatedAnswer,
  evidence,
}: {
  readonly generatedAnswer: NonNullable<
    SearchResponse["generatedGeneralAnswer"]
  >;
  readonly evidence: readonly GenericKnowledgeEvidence[];
}) {
  const citedIds = new Set(generatedAnswer.citedSourceIds);
  const citedEvidence = evidence.filter((item) => citedIds.has(item.sourceId));
  return (
    <div className={`${search.panel} ${visual.panel}`}>
      <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>AI 답변</h3>
      <div className={`${search.panelBody} ${visual.panelBody}`}>
        <p>{generatedAnswer.answer}</p>
      </div>
      {citedEvidence.length > 0 ? (
        <p className={home.aiAnswerNote}>
          근거 ·{" "}
          {[...new Set(citedEvidence.map((item) => item.label))].join(" · ")}
        </p>
      ) : null}
      <p className={home.aiAnswerNote}>
        검색된 공개 근거만 사용해 생성한 AI 답변이며, 특정 상품의 최신 조건은
        해당 공시를 확인해야 합니다.
      </p>
    </div>
  );
}

export function ReviewGuidancePanel({
  guidance,
}: {
  readonly guidance: NonNullable<SearchResponse["guidance"]>;
}) {
  return (
    <div className={`${search.panel} ${visual.panel}`}>
      <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>
        상품 순위 대신 확인할 기준
      </h3>
      <div className={`${search.panelBody} ${visual.panelBody}`}>
        <p>{guidance.message}</p>
      </div>
      <div className={`${search.panelBody} ${visual.panelBody}`}>
        <p>
          확인 영역 ·{" "}
          {guidance.reviewAreas
            .map((area) => REVIEW_AREA_LABEL[area])
            .join(" · ")}
        </p>
      </div>
      <Link href="/real-estate" className={search.panelLink}>
        부동산 검토 데이터 보기 <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

export function NoSearchResultsPanel() {
  return (
    <div className={`${search.panel} ${visual.panel}`}>
      <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>
        검색 결과 없음
      </h3>
      <div className={`${search.panelBody} ${visual.panelBody}`}>
        <p>상품명이나 청약·상장 거래·종료 같은 단계로 다시 검색해 주세요.</p>
      </div>
    </div>
  );
}

export function GenericEvidencePanel({
  evidence,
}: {
  readonly evidence: readonly GenericKnowledgeEvidence[];
}) {
  return (
    <div className={`${search.panel} ${visual.panel}`}>
      <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>관련 근거</h3>
      <p className={`${search.panelBody} ${visual.panelBody}`}>
        답변과 관련해 검색된 공개 근거입니다. 출처와 기준일을 함께 확인해
        주세요.
      </p>
      <ul className={`${content.sourceList} ${visual.sourceList}`}>
        {evidence.map((item) => {
          const url = safeCitationUrl(item.url);
          return (
            <li key={`${item.sourceId}-${item.hash}`}>
              <strong>{item.label}</strong>
              <span>{item.excerpt}</span>
              <span>{item.asOf} 기준</span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.label} 출처 (새 창)`}
                >
                  출처 보기
                </a>
              ) : (
                <span>출처 링크 확인 불가</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [match, setMatch] = useState<ScaffoldMatch | null>(null);
  const [results, setResults] = useState<readonly SearchResult[] | null>(null);
  const [generatedAnswer, setGeneratedAnswer] = useState<
    SearchResponse["generatedAnswer"] | null
  >(null);
  const [generatedGeneralAnswer, setGeneratedGeneralAnswer] = useState<
    SearchResponse["generatedGeneralAnswer"] | null
  >(null);
  const [guidance, setGuidance] = useState<SearchResponse["guidance"] | null>(
    null,
  );
  const [genericEvidence, setGenericEvidence] = useState<
    readonly GenericKnowledgeEvidence[] | null
  >(null);
  const [hasEmptyResults, setHasEmptyResults] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [isSearchRestoring, setIsSearchRestoring] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const searchRequest = useRef<AbortController | null>(null);
  const transitionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelSearch = () => {
    searchRequest.current?.abort();
    searchRequest.current = null;
  };
  const clearTransitions = () => {
    transitionTimers.current.forEach(clearTimeout);
    transitionTimers.current = [];
  };
  useEffect(
    () => () => {
      searchRequest.current?.abort();
      transitionTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const visualRef = useRef<HTMLElement>(null);
  const visualFrameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titlePrefixRef = useRef<HTMLSpanElement>(null);
  const titleQuestionRef = useRef<HTMLSpanElement>(null);
  const scaffoldRef = useRef<HTMLDivElement>(null);
  const hasApiOutput =
    results !== null ||
    generatedAnswer !== null ||
    generatedGeneralAnswer !== null ||
    guidance !== null ||
    genericEvidence !== null ||
    hasEmptyResults ||
    hasSearchError;
  const isSearchOpen =
    match !== null || hasApiOutput || isSearching || isSearchClosing;
  useHomeHeroVisual(
    {
      visual: visualRef,
      frame: visualFrameRef,
      content: contentRef,
      title: titleRef,
      titlePrefix: titlePrefixRef,
      titleQuestion: titleQuestionRef,
      scaffold: scaffoldRef,
    },
    isSearchOpen,
  );
  const { activeSection, scrollToSection } = useHomeSectionDial(isSearchOpen);

  useEffect(() => {
    if (!isSearchOpen) return bindHomeIntroScroll();
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) scrollImmediately(0);
  }, [isSearchOpen]);

  useEffect(() => {
    const handleHomeReset = () => {
      cancelSearch();
      clearTransitions();
      setMatch(null);
      setQuery("");
      setSubmittedQuery("");
      setResults(null);
      setGeneratedAnswer(null);
      setGeneratedGeneralAnswer(null);
      setGuidance(null);
      setGenericEvidence(null);
      setHasEmptyResults(false);
      setHasSearchError(false);
      setIsSearching(false);
      setIsSearchClosing(false);
      setIsSearchRestoring(false);
      setIsSuggestionsOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("jeomjeom:home-reset", handleHomeReset);
    return () =>
      window.removeEventListener("jeomjeom:home-reset", handleHomeReset);
  }, []);

  const runSearch = async () => {
    const searchQuery = query.trim();
    if (!searchQuery) return;
    cancelSearch();
    clearTransitions();
    setIsSearchClosing(false);
    const request = new AbortController();
    searchRequest.current = request;
    setMatch(null);
    setResults(null);
    setGeneratedAnswer(null);
    setGeneratedGeneralAnswer(null);
    setGuidance(null);
    setGenericEvidence(null);
    setHasEmptyResults(false);
    setHasSearchError(false);
    setIsSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        signal: request.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: searchQuery, limit: 10 }),
      });
      if (!response.ok) throw new Error("search failed");
      const body = (await response.json()) as SearchResponse;
      if (request.signal.aborted) return;
      const found = body.results ?? [];
      const generic = body.genericEvidence ?? [];
      setResults(body.mode === "matches" && found.length > 0 ? found : null);
      setGeneratedAnswer(body.generatedAnswer ?? null);
      setGeneratedGeneralAnswer(body.generatedGeneralAnswer ?? null);
      setGuidance(
        body.mode === "review-guidance" ? (body.guidance ?? null) : null,
      );
      setGenericEvidence(generic.length > 0 ? generic : null);
      setHasEmptyResults(
        body.mode === "matches" &&
          found.length === 0 &&
          generic.length === 0 &&
          !body.generatedAnswer &&
          !body.generatedGeneralAnswer,
      );
    } catch {
      if (!request.signal.aborted) setHasSearchError(true);
    } finally {
      if (!request.signal.aborted) setIsSearching(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSearchRestoring(false);
    setIsSuggestionsOpen(false);
    setSubmittedQuery(query.trim());
    void runSearch();
  };

  const handleChip = (label: string, target: string) => {
    cancelSearch();
    clearTransitions();
    setIsSearching(false);
    setIsSearchClosing(false);
    setSubmittedQuery(label);
    setQuery("");
    setResults(null);
    setGeneratedAnswer(null);
    setGeneratedGeneralAnswer(null);
    setGuidance(null);
    setGenericEvidence(null);
    setHasEmptyResults(false);
    setHasSearchError(false);
    setIsSearchRestoring(false);
    setIsSuggestionsOpen(false);
    setMatch(
      target === "reports"
        ? { kind: "reports" }
        : { kind: "guide", target: target as GuideTarget },
    );
  };

  const handleCloseSearch = () => {
    if (isSearchClosing) return;
    cancelSearch();
    setIsSearching(false);
    setIsSearchClosing(true);
    transitionTimers.current.push(
      setTimeout(() => {
        scrollImmediately(HERO_SHRINK_SCROLL_DISTANCE);
        setMatch(null);
        setQuery("");
        setSubmittedQuery("");
        setResults(null);
        setGeneratedAnswer(null);
        setGeneratedGeneralAnswer(null);
        setGuidance(null);
        setGenericEvidence(null);
        setHasEmptyResults(false);
        setHasSearchError(false);
        setIsSearchClosing(false);
        setIsSearchRestoring(true);
        setIsSuggestionsOpen(false);
        transitionTimers.current.push(
          setTimeout(() => setIsSearchRestoring(false), SEARCH_TRANSITION_MS),
        );
      }, SEARCH_TRANSITION_MS),
    );
  };

  const handleScrollCue = () => {
    scrollToSection(1);
  };

  return (
    <section
      ref={visualRef}
      className={`${visual.visualIntro} ${
        isSearchOpen ? search.visualIntroSearch : ""
      }`}
      style={heroOverscrollStyle()}
      aria-labelledby="home-hero-title"
    >
      <div
        className={`${visual.visualSticky} ${
          isSearchOpen ? search.visualStickySearch : ""
        }`}
      >
        <div
          ref={visualFrameRef}
          className={`${visual.visualFrame} ${search.visualFrame} ${
            isSearchOpen && !isSearchClosing ? search.visualFrameSearch : ""
          }`}
        >
          <Image
            src="/sto-disclosure-hero-v2.png"
            alt="투자계약증권 공시와 대조를 상징하는 3차원 문서"
            fill
            priority
            sizes="100vw"
            className={visual.visualImage}
          />
        </div>
        <div
          ref={contentRef}
          className={`${visual.visualContent} ${
            isSearchOpen ? search.visualContentSearch : ""
          } ${isSearchClosing ? search.visualContentSearchClosing : ""} ${
            isSearchRestoring ? search.visualContentRestoring : ""
          }`}
        >
          <HomeHeroTitle
            titleRef={titleRef}
            prefixRef={titlePrefixRef}
            questionRef={titleQuestionRef}
            query={submittedQuery}
            isSearchOpen={isSearchOpen}
            hasMatch={isSearchOpen}
            onCloseSearch={handleCloseSearch}
          />
          <HomeSearchScaffold
            scaffoldRef={scaffoldRef}
            query={query}
            match={match}
            isSuggestionsOpen={isSuggestionsOpen}
            onQueryChange={setQuery}
            onSuggestionsOpenChange={setIsSuggestionsOpen}
            onSubmit={handleSubmit}
            onChip={handleChip}
          />
          {hasApiOutput || isSearching ? (
            <div
              className={`${search.answer} ${home.apiAnswer}`}
              aria-live="polite"
            >
              {isSearching ? (
                <div className={`${search.panel} ${visual.panel}`}>
                  <p className={`${search.panelBody} ${visual.panelBody}`}>
                    답변과 근거를 준비하고 있습니다.
                  </p>
                </div>
              ) : null}
              {generatedAnswer ? (
                <AiSearchAnswerPanel
                  generatedAnswer={generatedAnswer}
                  results={results ?? []}
                />
              ) : null}
              {generatedGeneralAnswer ? (
                <GeneralAiAnswerPanel
                  generatedAnswer={generatedGeneralAnswer}
                  evidence={genericEvidence ?? []}
                />
              ) : null}
              {results ? <SearchResultsPanel results={results} /> : null}
              {guidance ? <ReviewGuidancePanel guidance={guidance} /> : null}
              {genericEvidence ? (
                <GenericEvidencePanel evidence={genericEvidence} />
              ) : null}
              {hasEmptyResults ? <NoSearchResultsPanel /> : null}
              {hasSearchError ? (
                <div className={`${search.panel} ${visual.panel}`}>
                  <h3 className={`${search.panelTitle} ${visual.panelTitle}`}>
                    검색 연결 오류
                  </h3>
                  <div className={`${search.panelBody} ${visual.panelBody}`}>
                    <p>
                      검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해
                      주세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${search.panelLink} ${home.retryButton}`}
                    onClick={() => void runSearch()}
                  >
                    다시 시도
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`${visual.visualScroll} ${search.visualScroll}`}
          onClick={handleScrollCue}
          aria-label="다음 콘텐츠로 이동"
        >
          <span className={motion.scrollCueArrow}>↓</span> 아래로 보기
        </button>
      </div>
      {!isSearchOpen && !isSearchRestoring ? (
        <HomeSectionDial
          activeSection={activeSection}
          onSelect={scrollToSection}
        />
      ) : null}
    </section>
  );
}
