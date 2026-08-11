/**
 * 제출 이후 감시 — 정정 재검증의 가치 제안.
 * 확인 비용이 커서 아무도 확인하지 않는 문서를, 알림 한 건 확인 수준으로 낮추는 것이 요지다.
 * 아직 붙지 않은 기능은 뷰 모델이 남긴 정직 표기를 그대로 가져와 드러낸다.
 */
import type { DemoView, NoteItemView } from "@/lib/verify/report/view-model";

import s from "./landing.module.css";

/** 정정 감시 연결 상태 — 뷰 모델이 이행 이력 층위에 남긴 항목 */
const AMENDMENT_WATCH_ID = "amendment-watch";

const findWatchNote = (view: DemoView): NoteItemView | undefined =>
  view.history.items.find((item) => item.id === AMENDMENT_WATCH_ID);

interface Stat {
  readonly value: string;
  readonly label: string;
}

/**
 * 정정 실측 통계 — 리포트가 아니라 공시 전수 집계에서 나온 값이라 출처를 함께 적는다.
 * 특정 공모의 판정 수치가 아니므로 리포트 뷰 모델에서 파생되지 않는다.
 */
const AMENDMENT_STATS: readonly Stat[] = [
  { value: "65%", label: "투자계약증권 공시 중 정정이 차지하는 비율" },
  { value: "2.4회", label: "공모 한 건당 평균 정정 횟수" },
];

export function WatchSection({ view }: { view: DemoView }) {
  const watchNote = findWatchNote(view);

  return (
    <section className={`${s.section} ${s.sectionMuted}`} aria-labelledby="watch-title">
      <div className={`${s.wrap} ${s.watchGrid}`}>
        <div>
          <p className={s.eyebrow}>정정 재검증</p>
          <h2 id="watch-title" className={s.sectionTitle}>
            제출 이후에도 문서는 계속 바뀝니다
          </h2>

          <blockquote className={s.pullQuote}>
            정정 대비표는 발행인이 지정한 항목만 싣고, 요약정보와 제2부는 정오표 없이 본문에
            반영된다.
            <cite className={s.pullQuoteSource}>투자계약증권 증권신고서 정정 관행</cite>
          </blockquote>

          <p className={s.sectionLead}>
            무엇이 바뀌었는지 확인하려면 정정이 접수될 때마다 전문을 다시 열고 수십 항목을 눈으로
            재대조해야 합니다. 이 확인 비용 때문에 대다수는 확인을 포기합니다. 정정신고서를 같은
            검증 파이프라인의 새 입력으로 넣어 다시 대조하면, 남는 일은 알림 한 건을 확인하는
            것뿐입니다.
          </p>
          <p className={s.sectionLead}>
            알림에는 두 가지 사실만 적습니다 — 바뀐 항목이 무엇인지, 판정이 유지됐는지 달라졌는지.
            중대성 등급은 매기지 않습니다. 무엇을 중대하다고 볼지는 서비스가 대신 정할 몫이
            아닙니다.
          </p>
        </div>

        <div>
          <dl className={s.statGrid}>
            {AMENDMENT_STATS.map((stat) => (
              <div key={stat.value} className={s.stat}>
                <dt className={s.statLabel}>{stat.label}</dt>
                <dd className={s.statValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className={s.statSource}>
            출처 · 2023~2026 투자계약증권 공시 전수 자체 집계 (OpenDART)
          </p>

          {watchNote ? (
            <div className={s.honestNote}>
              <p className={s.honestNoteTitle}>{watchNote.title}</p>
              <p className={s.honestNoteMeta}>{watchNote.meta}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
