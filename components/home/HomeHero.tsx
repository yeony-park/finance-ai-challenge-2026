"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type FormEvent } from "react";
import s from "./home.module.css";

type CategoryId = "cattle" | "pig" | "art" | "real-estate";
type GuideId = "intro" | "protection" | "lifecycle" | "checklist";
type QuestionTarget = GuideId | "reports";
type Match =
  | { readonly kind: "guide"; readonly target: GuideId }
  | { readonly kind: "category"; readonly categoryId: CategoryId }
  | { readonly kind: "reports" }
  | { readonly kind: "none" };

type Question = {
  readonly label: string;
  readonly target: QuestionTarget;
};

type Guide = {
  readonly id: GuideId;
  readonly title: string;
  readonly body: readonly string[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
};

type Category = {
  readonly id: CategoryId;
  readonly href: `/${string}`;
  readonly label: string;
  readonly note: string;
};

type ShardPosition = {
  readonly x: string;
  readonly y: string;
  readonly w: string;
  readonly compact: boolean;
};

const titleParts: readonly { readonly text: string; readonly isMark?: boolean }[] = [
  { text: "조각투자, " },
  { text: "뭘 확인해야", isMark: true },
  { text: " 할까요?" },
];

const questions: readonly Question[] = [
  { label: "조각투자가 뭔가요?", target: "intro" },
  { label: "예금자보호가 되나요?", target: "protection" },
  { label: "청약이 주식과 뭐가 다른가요?", target: "lifecycle" },
  { label: "산 조각은 언제 팔 수 있나요?", target: "lifecycle" },
  { label: "투자 전에 뭘 확인해야 하나요?", target: "checklist" },
  { label: "공시가 실제와 다르면요?", target: "reports" },
];

const guides: readonly Guide[] = [
  {
    id: "intro",
    title: "조각투자는 실물 자산의 증권입니다",
    body: [
      "한우·한돈·미술품·부동산 같은 실물 자산에서 나오는 수익에 대한 권리를 증권으로 쪼개 공모하는 구조입니다.",
      "투자계약증권은 증권신고서 제출 의무가 있어, 상품의 조건이 전자공시(DART)에 문서로 남습니다.",
      "그래서 확인은 문서와 공공 원장의 대조로 할 수 있습니다.",
    ],
    sources: [{ label: "금융감독원 전자공시시스템(DART)", url: "https://dart.fss.or.kr" }],
  },
  {
    id: "protection",
    title: "보호장치는 있지만, 예금자보호와는 다릅니다",
    body: [
      "조각투자 증권은 금융투자상품으로 예금자보호 대상이 아닙니다.",
      "증권사에 예치된 현금(투자자예탁금)만 1인 1억 원 한도로 보호됩니다(2025-09-01 시행).",
      "예치금 분리·신탁 등 보호장치는 도산 시 반환·관리 장치이며 손실을 보전하지 않습니다.",
    ],
    sources: [
      { label: "금융위원회 주요정책 문답 (2025-07-22)", url: "https://www.fsc.go.kr/po020201/84975" },
      { label: "금융위원회 — 신종증권 가이드라인 (2022-04-28)", url: "https://www.fsc.go.kr/no010101/77728" },
    ],
  },
  {
    id: "lifecycle",
    title: "청약으로 들어가고, 파는 길은 상품마다 다릅니다",
    body: [
      "공모 청약으로 시작해 운용 기간을 거쳐 자산 매각·정산으로 끝나는 흐름이 일반적입니다.",
      "주식과 달리 상시 유통시장이 없을 수 있어, 보유 중 매각 경로와 시점은 상품 구조마다 다릅니다.",
      "2027년 2월 시행 예정 개정법으로 증권사를 통한 유통과 장외거래중개업이 신설됩니다.",
    ],
    sources: [{ label: "자본시장법·전자증권법 개정 (국가법령정보센터)", url: "https://www.law.go.kr" }],
  },
  {
    id: "checklist",
    title: "수익 구조와 수수료는 신고서에 적혀 있습니다",
    body: [
      "수익이 어디서 생기고 언제 정산되는지, 수수료가 얼마인지는 증권신고서의 기재 사항입니다.",
      "무엇을 확인해야 할지 모르겠다면, 확인 질문 8가지를 공적 출처와 함께 안내합니다.",
    ],
    sources: [{ label: "증권신고서 원문 (DART)", url: "https://dart.fss.or.kr" }],
  },
];

const categories: readonly Category[] = [
  { id: "cattle", href: "/cattle", label: "한우", note: "증권신고서를 축산물이력제 원장과 개체 단위로 대조한 검증 리포트" },
  { id: "pig", href: "/pig", label: "한돈", note: "국산 돼지 공모 — 공시 축 정리 공개, 원장 축은 대조 불가" },
  { id: "art", href: "/art", label: "미술품", note: "미술품 공모 5건 — 공시 원문 대조와 공모가 구성 확인" },
  { id: "real-estate", href: "/real-estate", label: "부동산", note: "종료 공모의 소재지·가격·이행을 공공 원장과 대조한 사후 검증 리포트" },
];

const searchRules: readonly { readonly pattern: RegExp; readonly result: Match }[] = [
  { pattern: /(한우|송아지|축산|소\s*(공모|조각|투자))/, result: { kind: "category", categoryId: "cattle" } },
  { pattern: /(돼지|한돈|양돈)/, result: { kind: "category", categoryId: "pig" } },
  { pattern: /(미술|그림|아트|작품)/, result: { kind: "category", categoryId: "art" } },
  { pattern: /(부동산|건물|빌딩|상가|오피스)/, result: { kind: "category", categoryId: "real-estate" } },
  { pattern: /(예금자\s*보호|예탁금|보호\s*장치|보호되|보호\s*받)/, result: { kind: "guide", target: "protection" } },
  { pattern: /(청약|매각|환매|팔\s*수|판매|유통|언제\s*팔)/, result: { kind: "guide", target: "lifecycle" } },
  { pattern: /(확인해야|체크리스트|믿을|뭘\s*봐야|무엇을\s*확인|수익\s*구조|수수료|정산)/, result: { kind: "guide", target: "checklist" } },
  { pattern: /(리포트|검증\s*(결과|리포트)|대조\s*결과|불일치|정정|공시가?\s*(실제|사실|다르))/, result: { kind: "reports" } },
  { pattern: /(조각\s*투자|조각투자|뭔가요|무엇인가|처음|입문|시작)/, result: { kind: "guide", target: "intro" } },
];

const followUpLabels: Record<GuideId | "reports" | "category", readonly string[]> = {
  intro: ["예금자보호가 되나요?", "청약이 주식과 뭐가 다른가요?", "투자 전에 뭘 확인해야 하나요?"],
  protection: ["산 조각은 언제 팔 수 있나요?", "투자 전에 뭘 확인해야 하나요?", "공시가 실제와 다르면요?"],
  lifecycle: ["예금자보호가 되나요?", "공시가 실제와 다르면요?", "투자 전에 뭘 확인해야 하나요?"],
  checklist: ["공시가 실제와 다르면요?", "예금자보호가 되나요?", "청약이 주식과 뭐가 다른가요?"],
  reports: ["투자 전에 뭘 확인해야 하나요?", "청약이 주식과 뭐가 다른가요?", "예금자보호가 되나요?"],
  category: ["투자 전에 뭘 확인해야 하나요?", "공시가 실제와 다르면요?", "예금자보호가 되나요?"],
};

const shardPositions: Record<CategoryId, ShardPosition> = {
  cattle: { x: "22.2%", y: "3.8%", w: "31.5%", compact: false },
  pig: { x: "61.1%", y: "23.1%", w: "25.9%", compact: true },
  art: { x: "11.1%", y: "46.2%", w: "25.9%", compact: true },
  "real-estate": { x: "46.3%", y: "63.5%", w: "28.7%", compact: false },
};

const quickQuestions = ["조각투자가 뭔가요?", "예금자보호가 되나요?", "공시가 실제와 다르면요?"]
  .map((label) => questions.find((question) => question.label === label))
  .filter((question): question is Question => question !== undefined);

const shardStyle = (position: ShardPosition, index: number): CSSProperties => ({
  "--sx": position.x,
  "--sy": position.y,
  "--sw": position.w,
  "--si": index,
} as CSSProperties);

const findMatch = (query: string): Match => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return { kind: "none" };
  return searchRules.find((rule) => rule.pattern.test(trimmedQuery))?.result ?? { kind: "none" };
};

function CategoryCluster() {
  return <div className={s.cluster} role="group" aria-label="카테고리 바로가기">
    <span className={`${s.shard} ${s.shardDeco}`} style={shardStyle({ x: "7.4%", y: "17.3%", w: "3.9%", compact: false }, 5)} aria-hidden="true" />
    <span className={`${s.shard} ${s.shardGhost}`} style={shardStyle({ x: "86%", y: "9.5%", w: "8.1%", compact: false }, 6)} aria-hidden="true" />
    {categories.map((category, index) => {
      const position = shardPositions[category.id];
      const className = [s.shard, position.compact ? s.shardCompact : ""].filter(Boolean).join(" ");
      return <Link href={category.href} key={category.id} className={className} style={shardStyle(position, index)}>
        <span className={s.shardPhoto} aria-hidden="true"><Image src={`/category-${category.id}.jpg`} alt="" fill priority sizes="(max-width: 1088px) 45vw, 180px" className={s.shardPhotoImg} /></span>
        <span className={s.shardIn}><b className={s.shardLabel}>{category.label}</b></span>
      </Link>;
    })}
  </div>;
}

function SearchPanel({ match }: { readonly match: Match }) {
  if (match.kind === "guide") {
    const guide = guides.find((entry) => entry.id === match.target);
    if (!guide) return null;
    return <div className={s.panel}>
      <h3 className={s.panelTitle}>{guide.title}</h3>
      <div className={s.panelBody}>{guide.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      <ul className={s.sourceList}>{guide.sources.map((source) => <li key={source.url}>출처: {source.label}</li>)}</ul>
      {match.target === "checklist" ? <Link href="#checklist" className={s.panelLink}>확인 질문 8가지 보기</Link> : null}
    </div>;
  }

  if (match.kind === "category") {
    const category = categories.find((entry) => entry.id === match.categoryId);
    if (!category) return null;
    return <div className={s.panel}>
      <h3 className={s.panelTitle}>{category.label} 카테고리</h3>
      <div className={s.panelBody}><p>{category.note}</p></div>
      <Link href={category.href} className={s.panelLink}>{category.label} 확인 현황 보기</Link>
    </div>;
  }

  if (match.kind === "reports") {
    return <div className={s.panel}>
      <h3 className={s.panelTitle}>공시와 공공 원장이 다르면, 그 사실이 리포트에 남습니다</h3>
      <div className={s.panelBody}><p>공모별 검증 리포트에서 판정(일치 · 원장 불일치 · 대조 불가)과 근거, 정정 전후 재대조 기록을 확인할 수 있습니다.</p></div>
      <Link href="/offers" className={s.panelLink}>검증 리포트 목록 보기</Link>
    </div>;
  }

  return <div className={s.panel}>
    <h3 className={s.panelTitle}>준비된 안내 목록</h3>
    <div className={s.panelBody}><p>입력한 내용과 연결되는 안내를 찾지 못했습니다. 아래에서 골라 볼 수 있습니다.</p></div>
    <div className={s.panelLinkList}>
      {categories.map((category) => <Link href={category.href} key={category.id} className={s.chip}>{category.label}</Link>)}
      <Link href="/offers" className={s.chip}>검증 리포트</Link>
      <Link href="/methodology" className={s.chip}>검증 방법</Link>
    </div>
  </div>;
}

export function HomeHero() {
  const [query, setQuery] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  const selectQuestion = (label: string, target: QuestionTarget): void => {
    setSelectedQuestion(label);
    setQuery(label);
    setMatch(target === "reports" ? { kind: "reports" } : { kind: "guide", target });
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSelectedQuestion(null);
    setMatch(findMatch(query));
  };

  const followUpKey = match?.kind === "guide"
    ? match.target
    : match?.kind === "reports"
      ? "reports"
      : match?.kind === "category"
        ? "category"
        : null;
  const followUps = followUpKey === null
    ? []
    : followUpLabels[followUpKey]
      .map((label) => questions.find((question) => question.label === label))
      .filter((question): question is Question => question !== undefined)
      .filter((question) => question.label !== selectedQuestion);

  return <section className={`${s.section} ${s.hero}`} aria-labelledby="home-hero-title">
    <div className={`${s.wrap} ${s.heroWrap}`}>
      <div>
        <p className={`${s.heroEyebrow} ${s.heroIn}`}>증권신고서 × 공공 원장 — 대조 실측</p>
        <h1 id="home-hero-title" className={`${s.heroTitle} ${s.heroIn}`}>
          {titleParts.map((part) => part.isMark ? <em className={s.mark} key={part.text}>{part.text}</em> : <span key={part.text}>{part.text}</span>)}
        </h1>
        <p className={`${s.heroLead} ${s.heroIn} ${s.heroIn2}`}>증권신고서와 국가 공공데이터를 대조한 실측으로 확인 항목에 답합니다. 등급 대신 사실 판정, 추천 대신 근거 — 근거가 없으면 “대조 불가”라고 말합니다.</p>
        <div className={`${s.scaffold} ${s.heroIn} ${s.heroIn3}`}>
          <form className={s.searchForm} onSubmit={submit} role="search">
            <label htmlFor="home-search" className="sr-only">궁금한 내용 입력</label>
            <input id="home-search" className={s.searchInput} type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="궁금한 것을 적어 보세요 — 예: 예금자보호가 되나요?" autoComplete="off" />
            <button type="submit" className={s.searchButton}>안내 찾기</button>
          </form>
          <p className={s.scaffoldNote}>질문을 확인 항목과 준비된 안내로 연결합니다.</p>
          <div className={s.chipRow} role="group" aria-label="예시 질문">
            {quickQuestions.map((question) => <button type="button" key={question.label} className={s.chip} aria-pressed={selectedQuestion === question.label} onClick={() => selectQuestion(question.label, question.target)}>{question.label}</button>)}
          </div>
          <div aria-live="polite">
            {match ? <SearchPanel match={match} /> : null}
            {followUps.length === 0 ? null : <div className={s.followRow} role="group" aria-label="이어서 볼 만한 질문">
              <span className={s.followLabel}>이어서 볼 만한 질문</span>
              {followUps.map((question) => <button type="button" key={question.label} className={s.chip} onClick={() => selectQuestion(question.label, question.target)}>{question.label}</button>)}
            </div>}
          </div>
          <p className={s.heroSources}>공적 출처 — 전자공시(DART) · 축산물이력제 · 축산물품질평가원 경락 정보 · 국토부 실거래가(RTMS)</p>
        </div>
      </div>
      <CategoryCluster />
      <p className={s.scrollCue} aria-hidden="true"><span className={s.scrollCueArrow}>↓</span> SCROLL</p>
    </div>
  </section>;
}
