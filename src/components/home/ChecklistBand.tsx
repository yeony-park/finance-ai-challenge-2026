import { CHECKLIST_NOTICE, TRUST_CHECKLIST } from "@/lib/content/checklist";

import s from "./home.module.css";

export function ChecklistBand() {
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
        <div>
          {TRUST_CHECKLIST.map((item) => (
            <details key={item.id} className={s.checkItem}>
              <summary>{item.title}</summary>
              <div className={s.checkDetail}>
                <p>{item.question}</p>
                <p>{item.why}</p>
                <p>{item.engineNote}</p>
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
        <p className={s.checkNotice}>{CHECKLIST_NOTICE}</p>
      </div>
    </section>
  );
}
