"use client";

import Link from "next/link";

import { orderByConcern, useProfile } from "@/components/site/profile";
import { TRUST_CHECKLIST } from "@/lib/content/checklist";
import { CONCERN_TAG } from "@/lib/content/onboarding";

import home from "@/components/home/home.module.css";
import s from "./category.module.css";

const QUESTION_COUNT = 3;

export function CategoryQuestions() {
  const profile = useProfile();
  const items = orderByConcern(TRUST_CHECKLIST, profile.concern).slice(
    0,
    QUESTION_COUNT,
  );

  return (
    <>
      <div className={s.questionList}>
        {items.map((item) => (
          <p key={item.id}>
            · {item.question}
            {item.id === profile.concern ? (
              <span className={home.checkTag}>{CONCERN_TAG}</span>
            ) : null}
          </p>
        ))}
      </div>
      <Link href="/#checklist" className={home.bandLink}>
        확인 질문 8가지 전체 보기 →
      </Link>
    </>
  );
}
