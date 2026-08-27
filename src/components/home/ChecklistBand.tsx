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

import controls from "./home-controls.module.css";
import content from "./home-content.module.css";
import layout from "./home.module.css";
import tags from "./home-tags.module.css";
import { HomeSectionFrame, HomeSectionHeader } from "./HomeSection";
import s from "./ChecklistBand.module.css";

export function ChecklistBand() {
  const profile = useProfile();
  const items = orderByConcern(TRUST_CHECKLIST, profile.concern);
  const bridgeOffer = latestOfferEntry(OFFERS);

  return (
    <HomeSectionFrame id="checklist" labelledBy="checklist-title">
        <HomeSectionHeader
          titleId="checklist-title"
          title={<>&lsquo;믿을만한지&rsquo; 확인하는 8가지 질문</>}
          className={layout.checklistSectionHead}
        >
          <div className={layout.checklistMeta}>
            <p className={`${layout.sectionLead} ${layout.checklistLead}`}>
              무엇을 봐야 할지 모르겠다면 여기서부터 확인해 보세요. 각 질문은 공적
              출처에서 직접 확인할 수 있으며, 일부는 이 서비스의 대조 실측 결과로
              답을 확인할 수 있습니다.
            </p>
            <OnboardingOpenButton
              className={`${controls.chip} ${layout.checklistProfileButton}`}
            />
          </div>
        </HomeSectionHeader>
        <Reveal>
        <div>
          {items.map((item) => (
            <details key={item.id} className={s.checkItem}>
              <summary>
                {item.title}
                {item.id === profile.concern ? (
                  <span className={tags.checkTag}>{CONCERN_TAG}</span>
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
                <ul className={content.sourceList}>
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
        <ul className={s.checkNotices}>
          {bridgeOffer ? <li>{CHECKLIST_BRIDGE_NOTE}</li> : null}
          <li>{CHECKLIST_NOTICE}</li>
        </ul>
    </HomeSectionFrame>
  );
}
