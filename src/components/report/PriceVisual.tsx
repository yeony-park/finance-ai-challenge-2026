import type { PriceVisualView } from "@/lib/verify/report/view-model";

import s from "./report.module.css";

const won = (value: number): string =>
  `${Math.round(value).toLocaleString("ko-KR")}원`;

const perKg = (value: number): string =>
  `${Math.round(value).toLocaleString("ko-KR")}원/kg`;

const signedPercent = (value: number | null): string =>
  value === null ? "비교 자료 없음" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

export function PriceVisual({ visual }: { readonly visual: PriceVisualView }) {
  const gradeMax = Math.max(...visual.grades.map((grade) => grade.pricePerKg), 1);
  const spread = visual.acquisition.max - visual.acquisition.min;
  const averagePosition =
    spread === 0
      ? 50
      : ((visual.acquisition.average - visual.acquisition.min) / spread) * 100;

  return (
    <div className={s.priceVisual} aria-label="가격 수치 시각화">
      <article className={s.priceVisualCard}>
        <header className={s.priceVisualHead}>
          <div>
            <p className={s.visualEyebrow}>시장 기준</p>
            <h3 className={s.visualTitle}>등급별 전국 평균 경락가</h3>
          </div>
          <strong className={s.visualPrimary}>{perKg(visual.averagePricePerKg)}</strong>
        </header>

        <div className={s.visualMetaRow}>
          <span>{visual.referenceMonth}</span>
          <span>
            {visual.breedName} {visual.sexName}
          </span>
          <span>등급판정 {visual.sampleSize.toLocaleString("ko-KR")}두</span>
        </div>

        <div
          className={s.gradeChart}
          role="img"
          aria-label={visual.grades
            .map((grade) => `${grade.name} ${perKg(grade.pricePerKg)}`)
            .join(", ")}
        >
          {visual.grades.map((grade) => (
            <div className={s.gradeRow} key={grade.name}>
              <span className={s.gradeLabel}>{grade.name}</span>
              <span className={s.gradeTrack} aria-hidden="true">
                <span
                  className={s.gradeBar}
                  style={{ width: `${(grade.pricePerKg / gradeMax) * 100}%` }}
                />
              </span>
              <strong className={s.gradeValue}>{perKg(grade.pricePerKg)}</strong>
              <small className={s.gradeCount}>{grade.headCount.toLocaleString("ko-KR")}두</small>
            </div>
          ))}
        </div>

        <p className={s.visualComparison}>
          수집 구간 월평균 대비 <strong>{signedPercent(visual.monthVsWindowPercent)}</strong>
          {visual.windowAveragePricePerKg === null
            ? null
            : ` · 월평균 ${perKg(visual.windowAveragePricePerKg)}`}
        </p>
      </article>

      <article className={s.priceVisualCard}>
        <header className={s.priceVisualHead}>
          <div>
            <p className={s.visualEyebrow}>공모 내부 분포</p>
            <h3 className={s.visualTitle}>개체별 신고서 취득원가</h3>
          </div>
          <strong className={s.visualPrimary}>{won(visual.acquisition.average)}</strong>
        </header>

        <div className={s.priceRangeSummary}>
          <span>
            <small>최저</small>
            {won(visual.acquisition.min)}
          </span>
          <span className={s.priceRangeAverage}>
            <small>평균</small>
            {won(visual.acquisition.average)}
          </span>
          <span>
            <small>최고</small>
            {won(visual.acquisition.max)}
          </span>
        </div>

        <div
          className={s.priceDotPlot}
          role="img"
          aria-label={`취득원가 ${visual.acquisition.prices.length}건, 최저 ${won(visual.acquisition.min)}, 평균 ${won(visual.acquisition.average)}, 최고 ${won(visual.acquisition.max)}`}
        >
          <span
            className={s.priceAverageLine}
            style={{ left: `${averagePosition}%` }}
            aria-hidden="true"
          />
          {visual.acquisition.prices.map((price, index) => {
            const position =
              spread === 0 ? 50 : ((price - visual.acquisition.min) / spread) * 100;
            return (
              <span
                key={`${price}-${index}`}
                className={s.priceDot}
                style={{
                  left: `${position}%`,
                  top: `${18 + (index % 4) * 17}%`,
                }}
                aria-hidden="true"
              />
            );
          })}
        </div>

        <div className={s.priceVisualFoot}>
          <span>{visual.acquisition.prices.length.toLocaleString("ko-KR")}두 표시</span>
          <span>합계 {won(visual.acquisition.total)}</span>
        </div>
      </article>
    </div>
  );
}
