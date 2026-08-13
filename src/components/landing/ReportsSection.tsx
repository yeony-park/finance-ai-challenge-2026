/**
 * 검증 리포트 색인 — 지금 공개된 리포트를 있는 그대로만 늘어놓는다.
 * 공개된 실데이터는 축 A 1건뿐이라 축 B는 "준비 중"으로 비워 둔다(가짜 데이터 금지).
 *
 * 문장 규칙: 카드 문장의 주어는 공모·자산이다. 서비스가 무엇을 하는지 설명하는 문장은 두지 않는다
 * (홈-IA-개편 §2). 목록 구조 자체의 개편은 S2 몫이라 여기서는 문구만 바로잡는다.
 */
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { FEATURED_OFFER_HREF } from "@/components/site/service";
import type { DemoView, TallyView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";

const TONE_CLASS: Record<TallyView["tone"], string> = {
  good: s.toneGood,
  warn: s.toneWarn,
  unk: s.toneUnk,
};

export function ReportsSection({ view }: { view: DemoView }) {
  return (
    <section id="reports" className={`${s.section} ${s.sectionMuted}`} aria-labelledby="reports-title">
      <Reveal className={s.wrap}>
        <div className={s.sectionHead}>
          <p className={s.eyebrow}>검증 리포트</p>
          <h2 id="reports-title" className={s.sectionTitle}>
            지금 공개된 리포트
          </h2>
        </div>

        <div className={s.reportGrid}>
          <article className={s.reportCard}>
            <p className={s.reportAxis}>
              <span>축 A · 실재 확인 중심</span>
              <span className={`${s.statusPill} ${s.statusPillLive}`}>공개됨</span>
            </p>
            <h3 className={s.reportTitle}>{view.offer.title}</h3>
            <p className={s.reportBody}>{view.reality.heading}</p>

            <ul className={s.tallyInline}>
              {view.verdict.tallies.map((tally) => (
                <li key={tally.label} className={s.tallyInlineItem}>
                  <span className={`${s.tallyInlineValue} ${TONE_CLASS[tally.tone]}`}>
                    {tally.value}
                  </span>
                  <span>{tally.label}</span>
                </li>
              ))}
            </ul>

            <p className={s.reportPendingNote}>{view.offer.meta}</p>

            <Link href={FEATURED_OFFER_HREF} className={s.reportLink}>
              리포트 열기
              <span aria-hidden="true">→</span>
            </Link>
          </article>

          <article className={`${s.reportCard} ${s.reportCardPending}`}>
            <p className={s.reportAxis}>
              <span>축 B · 사후 검증</span>
              <span className={s.statusPill}>준비 중</span>
            </p>
            <h3 className={s.reportTitle}>부동산 조각투자 공모가의 시장 위치</h3>
            <p className={s.reportBody}>
              공모가는 같은 지역·유형 실거래 비교군 안에서 백분위로 표시됩니다. 비교군이 충분하지
              않으면 백분위가 나오지 않습니다.
            </p>
            <p className={s.reportPendingNote}>아직 공개된 리포트가 없습니다.</p>
          </article>
        </div>
      </Reveal>
    </section>
  );
}
