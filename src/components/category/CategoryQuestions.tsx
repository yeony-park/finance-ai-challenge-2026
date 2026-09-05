"use client";

import Link from "next/link";

import { orderByConcern, useProfile } from "@/components/site/profile";
import { checklistBridgeLabel, TRUST_CHECKLIST } from "@/lib/content/checklist";
import {
  checklistReportHref,
  type ChecklistBridgeOffer,
} from "@/lib/content/checklist-links";
import { CONCERN_TAG } from "@/lib/content/onboarding";

import homeContent from "@/components/home/home-content.module.css";
import homeTags from "@/components/home/home-tags.module.css";
import s from "./category.module.css";

const QUESTION_COUNT = 3;

export function CategoryQuestions({
  bridgeOffer = null,
}: {
  readonly bridgeOffer?: ChecklistBridgeOffer | null;
}) {
  const profile = useProfile();
  const items = orderByConcern(TRUST_CHECKLIST, profile.concern).slice(
    0,
    QUESTION_COUNT,
  );

  return (
    <>
      <div className={s.questionList}>
        {items.map((item) => {
          const reportHref =
            item.reportChapter && bridgeOffer
              ? checklistReportHref(bridgeOffer, item.reportChapter)
              : null;

          return (
            <p key={item.id}>
              · {item.question}
              {item.id === profile.concern ? (
                <span className={homeTags.checkTag}>{CONCERN_TAG}</span>
              ) : null}
              {item.reportChapter && bridgeOffer && reportHref ? (
                <Link href={reportHref} className={s.questionBridge}>
                  {checklistBridgeLabel(
                    bridgeOffer.title,
                    item.reportChapter.label,
                  )}
                </Link>
              ) : null}
            </p>
          );
        })}
      </div>
      <Link href="/#checklist" className={homeContent.bandLink}>
        확인 질문 8가지 전체 보기 →
      </Link>
    </>
  );
}
