"use client";

import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { OnboardingOpenButton } from "@/components/site/OnboardingOpenButton";
import { latestOfferEntry, OFFERS } from "@/components/site/offers";
import { orderByConcern, useProfile } from "@/components/site/profile";
import {
  CHECKLIST_BRIDGE_NOTE,
  CHECKLIST_NOTICE,
  checklistBridgeLabel,
  TRUST_CHECKLIST,
} from "@/lib/content/checklist";
import { CONCERN_TAG } from "@/lib/content/onboarding";

import s from "./home.module.css";

export function ChecklistBand() {
  const profile = useProfile();
  const items = orderByConcern(TRUST_CHECKLIST, profile.concern);
  const bridgeOffer = latestOfferEntry(OFFERS);

  return (
    <section id="checklist" className={s.section} aria-labelledby="checklist-title">
      <div className={s.wrap}>
        <header className={s.sectionHead}>
          <h2 id="checklist-title" className={s.sectionTitle}>
            &lsquo;믿을 만한가&rsquo;를 확인하는 8가지 질문
          </h2>
          <p className={s.sectionLead}>
            무엇을 봐야 할지 모르겠다면 여기서부터 — 각 질문은 공적 출처에서 직접
            확인할 수 있고, 일부는 이 서비스의 대조 실측이 답을 대신합니다.
          </p>
        </header>
        <div className={s.chipRow}>
          <OnboardingOpenButton className={s.chip} />
        </div>
        <Reveal>
        <div>
          {items.map((item) => (
            <details key={item.id} className={s.checkItem}>
              <summary>
                {item.title}
                {item.id === profile.concern ? (
                  <span className={s.checkTag}>{CONCERN_TAG}</span>
                ) : null}
              </summary>
              <div className={s.checkDetail}>
                <p>{item.question}</p>
                <p>{item.why}</p>
                <p>{item.engineNote}</p>
                {item.reportChapter && bridgeOffer ? (
                  <p className={s.checkBridge}>
                    <Link
                      href={`/offers/${bridgeOffer.id}#${item.reportChapter.headingId}`}
                    >
                      {checklistBridgeLabel(
                        bridgeOffer.title,
                        item.reportChapter.label,
                      )}
                    </Link>
                  </p>
                ) : null}
                <ul className={s.sourceList}>
                  {item.sources.map((source) => (
                    <li key={`${item.id}-${source.url}`}>
                      확인 경로:{" "}
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.label}
                      </a>
                      {source.note ? ` — ${source.note}` : null}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
        </Reveal>
        {bridgeOffer ? (
          <p className={s.checkNotice}>{CHECKLIST_BRIDGE_NOTE}</p>
        ) : null}
        <p className={s.checkNotice}>{CHECKLIST_NOTICE}</p>
      </div>
    </section>
  );
}
