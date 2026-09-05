// 승인된 원본과 AI 요약 입력은 보존하고, 화면 설명만 한국어로 표시한다.
const copy: Readonly<Record<string, string>> = {
  "Synthetic offline analysis for interface testing.": "가상 수치로 공모 조건과 회수 이력을 살펴봅니다",
  "Price bridge": "공모가격 구성",
  "Use only to test price explanation components.": "가격 구성을 설명하기 위한 가상 수치입니다.",
  "Market sample": "시장 비교 표본",
  "Sample is not an external market forecast.": "실제 시장을 예측한 결과는 아닙니다.",
  "Cohort outcomes": "비교군의 회수 결과",
  "Outcome cards can be exercised without live data.": "실제 거래를 반영하지 않은 가상 회수 이력입니다.",
  "Synthetic price bridge is internally coherent; residual bridge is not a valuation claim.": "가상 매입가와 비용으로 공모가 구성을 확인합니다. 남은 차액만으로 자산 가치를 판단할 수는 없습니다.",
  "All figures are fictional and generated offline.": "모든 수치는 실제 거래와 관계없이 만든 가상 값입니다.",
  "Synthetic market observations provide a bounded comparison sample.": "가상 거래 표본 안에서만 작품을 비교합니다.",
  "Comparable rows are generated independently from offering rows.": "비교 작품의 거래 표본은 공모 데이터와 별도로 생성했습니다.",
  "Holding and settlement outcomes are simulated by cohort profile.": "비교군별 가정에 따라 보유 기간과 정산 결과를 모의 계산했습니다.",
  "No expected return should be inferred from this fixture.": "이 가상 자료로 실제 기대수익을 추정할 수는 없습니다.",
  "Cohort history is included to exercise platform outcome views.": "가상 비교군의 이력으로 플랫폼별 회수 결과를 살펴봅니다.",
  "Cohort samples are fictional and not one-to-one source mappings.": "비교군은 가상 표본이며 실제 상품과 일대일로 대응하지 않습니다.",
  "This is synthetic data and has no investable evidentiary value.": "이 자료는 합성 데이터이므로 실제 투자 판단의 근거로 사용할 수 없습니다.",
};

const numericCopy: ReadonlyArray<readonly [RegExp, string]> = [
  [/^Synthetic review only: offering premium ([\d.]+)%, residual bridge ([\d,]+) KRW, market sell-through ([\d.]+)%, and (\d+) completed records in the linked synthetic cohort\.$/, "가상 공모가의 매입가 대비 차이는 $1%이고, 매입가와 공개 비용을 제외한 차액은 $2원입니다. 가상 거래 표본의 낙찰률은 $3%이며, 연결된 비교군에서 종료된 이력은 $4건입니다."],
  [/^Premium ([\d.]+)% with residual bridge ([\d,]+) KRW$/, "매입가 대비 차이 $1% · 비용 반영 후 차액 $2원"],
  [/^Sell-through ([\d.]+)% in generated lots$/, "가상 거래 표본의 낙찰률 $1%"],
  [/^(\d+) completed records and (\d+) delayed records$/, "종료 $1건 · 지연 $2건"],
  [/^Premium over synthetic acquisition ([\d.]+)%$/, "가상 매입가 대비 공모가 차이 $1%"],
  [/^Residual bridge ([\d,]+) KRW$/, "매입가와 공개 비용을 제외한 차액 $1원"],
  [/^Synthetic sold lots (\d+)\/(\d+) \(([\d.]+)%\)$/, "가상 낙찰 건수 $1/$2건 ($3%)"],
  [/^Synthetic comparable sample (\d+) lots$/, "가상 비교 표본 $1건"],
  [/^Target holding (\d+) months$/, "목표 보유 기간 $1개월"],
  [/^Completed cohort records (\d+)$/, "비교군의 종료 이력 $1건"],
  [/^Cohort size (\d+)$/, "비교군 표본 $1건"],
  [/^Delayed records (\d+)$/, "지연 이력 $1건"],
];

export function syntheticAnalysisText(value: string): string {
  if (copy[value]) return copy[value];
  for (const [pattern, replacement] of numericCopy) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }
  return value;
}
