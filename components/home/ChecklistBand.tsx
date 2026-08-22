"use client";

import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { OnboardingOpenButton } from "@/components/site/OnboardingOpenButton";
import { orderByConcern, useProfile } from "@/components/site/profile";
import {
  CHECKLIST_NOTICE,
  TRUST_CHECKLIST,
} from "@/lib/content/checklist";
import { CONCERN_TAG } from "@/lib/content/onboarding";

import s from "./home.module.css";

export function ChecklistBand() {
  const profile = useProfile();
  const items = orderByConcern(TRUST_CHECKLIST, profile.concern);

  return (
    <section id="checklist" className={s.section} aria-labelledby="checklist-title">
      <div className={s.wrap}>
        <h2 id="checklist-title" className={s.sectionTitle}>
          &lsquo;믿을 만한가&rsquo;를 확인하는 8가지 질문
        </h2>
        <p className={s.sectionLead}>
          무엇을 봐야 할지 모르겠다면 여기서부터 — 각 질문은 공적 출처에서 직접
          확인할 수 있고, 일부는 이 서비스의 대조 실측이 답을 대신합니다.
        </p>
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
                {item.reportChapter ? (
                  <p className={s.checkBridge}>
                    <Link href="/products">검증 리포트 목록에서 &apos;{item.reportChapter.label}&apos; 근거 찾기 →</Link>
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
        <p className={s.checkNotice}>실측 링크는 저장된 상품의 검증 리포트 목록으로 연결됩니다.</p>
        <p className={s.checkNotice}>{CHECKLIST_NOTICE}</p>
      </div>
    </section>
  );
}
