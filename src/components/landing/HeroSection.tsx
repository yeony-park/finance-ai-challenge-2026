/**
 * 히어로 — 한 줄 정의 + 대표 검증 리포트로 가는 큰 카드.
 * 카드에 찍히는 수치·문구는 전부 검증 엔진 산출 리포트에서 파생된 뷰 모델(DemoView)에서 온다.
 * 화면에는 하드코딩된 판정 수치가 없다.
 *
 * 문장 규칙: 서비스가 주어인 문장은 h1의 정의 표준문 1개뿐이다(홈-IA-개편 §2 예외 ①).
 * 나머지 문장의 주어는 공모·자산이며, 링크·버튼 문구만 조작 마이크로카피로 허용된다.
 */
import Link from "next/link";

import { Pressable } from "@/components/motion/Pressable";
import { RichText } from "@/components/site/RichText";
import { FEATURED_OFFER_HREF } from "@/components/site/service";
import type { DemoView, TallyView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";

/** 판정 톤 → 의미색 클래스. 색은 판정에만 쓰고 장식으로 재사용하지 않는다 */
const TONE_CLASS: Record<TallyView["tone"], string> = {
  good: s.toneGood,
  warn: s.toneWarn,
  unk: s.toneUnk,
};

export function HeroSection({ view }: { view: DemoView }) {
  return (
    <section className={`${s.section} ${s.hero}`} aria-labelledby="hero-title">
      <div className={`${s.wrap} ${s.heroGrid}`}>
        <div className={s.heroCopy}>
          <p className={s.eyebrow}>조각투자 공시 대조 검증</p>

          <h1 id="hero-title" className={s.heroTitle}>
            <span>증권신고서를</span>
            <span className={s.heroTitleLead}>
              <em className={s.mark}>국가 공공데이터</em>와 대조합니다
            </span>
          </h1>

          <ul className={s.chips}>
            {view.meta.items.map((item) => (
              <li key={item} className={s.chip}>
                {item}
              </li>
            ))}
          </ul>

          <div className={s.heroActions}>
            <Link href="/methodology" className={s.buttonGhost}>
              무엇을 어떻게 대조하는지 보기
            </Link>
          </div>
        </div>

        {/* 카드 전체가 리포트로 가는 큰 버튼이다 — 큰 면적일수록 배율을 낮춘다 */}
        <Pressable hover={1.01} tap={0.99}>
          <article className={s.featured} aria-labelledby="featured-title">
            {/* "대표 검증 리포트" 뱃지는 서비스 자기소개라 뺐다 — 이 줄에는 공모의 사실만 둔다 */}
            <div className={s.featuredTop}>
              <span className={s.featuredTag}>{view.offer.tag}</span>
            </div>

            <h2 id="featured-title" className={s.featuredTitle}>
              {view.offer.title}
            </h2>

            {/* dt(용어)가 마크업 순서상 앞이어야 한다 — 수치를 위로 올리는 건 CSS order */}
            <dl className={s.tallies}>
              {view.verdict.tallies.map((tally) => (
                <div key={tally.label} className={s.tally}>
                  <dt className={s.tallyLabel}>{tally.label}</dt>
                  <dd className={`${s.tallyValue} ${TONE_CLASS[tally.tone]}`}>{tally.value}</dd>
                </div>
              ))}
            </dl>

            <p className={s.featuredSummary}>
              <RichText parts={view.verdict.oneLiner.easy} strongClassName={s.summaryStrong} />
            </p>

            <div className={s.featuredFoot}>
              <p className={s.featuredMeta}>
                {view.verdict.eyebrow}
                <br />
                {view.verdict.when}
              </p>
              <Link href={FEATURED_OFFER_HREF} className={s.featuredCta}>
                근거 카드까지 열어 보기
                <span className={s.arrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </article>
        </Pressable>
      </div>
    </section>
  );
}
