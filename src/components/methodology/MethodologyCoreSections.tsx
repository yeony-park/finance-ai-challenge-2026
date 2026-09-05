import type { ReactNode } from "react";

import { METHODOLOGY_ANCHOR } from "@/app/methodology/anchors";
import s from "@/app/methodology/methodology.module.css";
import { ProductMetric } from "@/components/product/ProductMetric";

interface Item {
  readonly title: string;
  readonly body: ReactNode;
}

interface Verdict extends Item {
  readonly className: string;
}

interface Stat {
  readonly value: string;
  readonly label: string;
}

const PROCESS: readonly Item[] = [
  {
    title: "1. 증권신고서 확인",
    body: "증권신고서에서 자산 정보, 취득가격, 공모 조건, 과거 이력 등을 찾아 외부 데이터와 비교합니다.",
  },
  {
    title: "2. 비교할 자료를 찾습니다",
    body: "자산의 종류에 따라 공공 기록, 과거 공모, 거래 이력, 시장 데이터를 확인합니다.",
  },
  {
    title: "3. 신고서, 청약 내용과 대조합니다",
    body: "신고서와 값이 같은지, 가격이 어느 수준인지, 과거에 제시한 내용이 실제로 이행됐는지 등을 항목별로 확인합니다.",
  },
  {
    title: "4. 결과와 근거를 남깁니다",
    body: "확인한 결과와 비교에 사용한 자료를 기록한 후 어떤 데이터를 기준으로 결과가 나왔는지 원문과 출처도 남깁니다",
  },
];

const CHECK_ITEMS: readonly Item[] = [
  {
    title: "자산 정보",
    body: "공공 기록 등에서 개체번호나 등록정보처럼 직접 조회할 수 있는 항목이 있다면 신고서의 내용과 실제 기록이 일치하는지 확인합니다.",
  },
  {
    title: "가격 수준",
    body: "같은 작가의 작품 거래, 유사 자산의 거래가격 등 비교 가능한 자료를 이용해 현재 가격이 어느 수준에 있는지 확인합니다.",
  },
  {
    title: "과거 이력",
    body: (
      <>
        발행사의 과거 모집, 배당, 매각·청산 내역과 자산의 거래 이력을 확인합니다.
        <br />
        회수 계획이 실제로 어떻게 진행됐는지, 비슷한 자산이 과거에 어떤 가격으로
        거래됐는지 등을 종합해 살펴봅니다.
      </>
    ),
  },
];

const DATA_ROWS: readonly Item[] = [
  {
    title: "공시 자료",
    body: "금융감독원 전자공시(DART)를 통해 자산 정보, 취득가격, 공모 조건, 회수 계획 등 검증할 기준을 찾습니다.",
  },
  {
    title: "공공 기록",
    body: (
      <>
        자산별로 조회 가능한 공공 원장을 사용합니다.
        <br />
        한우를 예로 들자면 축산물이력제의 개체 정보를 조회해 신고서에 적힌 정보와
        비교합니다.
      </>
    ),
  },
  {
    title: "시장 데이터",
    body: (
      <>
        검토할 자산의 시장 데이터를 찾아와 가격 수준과 거래 이력을 확인합니다.
        <br />
        예를 들어 한우 경락 정보, 부동산 실거래 자료, 미술품의 작가·작품 거래 및
        낙찰 이력 등을 확인합니다.
      </>
    ),
  },
  {
    title: "발행사 과거 공모 자료",
    body: (
      <>
        발행사의 이전 공모 이력을 확인합니다.
        <br />
        현재 상품과 같은 발행사나 유사 자산의 과거 기록을 배당, 매각·청산 결과와
        정정 이력 등과 비교합니다.
      </>
    ),
  },
];

const PUBLIC_RECORD_VERDICTS: readonly Verdict[] = [
  {
    title: "일치",
    body: "신고서의 값과 조회 기록이 같은 경우입니다.",
    className: s.verdictMatch,
  },
  {
    title: "원장 불일치",
    body: "신고서의 값과 공공 기록이 다른 경우입니다. 차이와 비교 근거를 함께 보여줍니다.",
    className: s.verdictMiss,
  },
  {
    title: "대조 불가",
    body: "비교할 데이터가 없거나 기록을 확인하기 어려운 경우입니다. 확인하지 못한 사유를 함께 표시합니다.",
    className: s.verdictUnknown,
  },
];

const ART_VERDICTS: readonly Verdict[] = [
  {
    title: "양호",
    body: "가격과 거래 이력이 충분히 설명되고, 비교 작품과 회수 이력에서도 뚜렷한 약점이 없는 경우입니다.",
    className: s.artVerdictGood,
  },
  {
    title: "조건부 양호",
    body: "전반적인 근거는 확인되지만 일부 항목을 추가로 검토해야 하는 경우입니다.",
    className: s.artVerdictConditional,
  },
  {
    title: "주의",
    body: "가격 부담, 낮은 거래 빈도, 부족한 비교 자료, 반복된 회수 지연 등 뚜렷한 약점이 있는 경우입니다.",
    className: s.artVerdictCaution,
  },
  {
    title: "위험",
    body: "가격이나 자산 정보에 중대한 문제가 있거나 여러 위험 요인이 함께 확인된 경우입니다.",
    className: s.artVerdictRisk,
  },
];

const WRITING_RULES: readonly Item[] = [
  {
    title: "확인된 내용만 반영",
    body: "데이터에서 확인된 사실과 차이를 기준으로 결과를 작성합니다. 차이가 발생한 원인이나 발행사의 의도는 확인 가능한 정보가 있을 때만 반영합니다.",
  },
  {
    title: "근거를 함께 기록",
    body: "각 결과에는 확인에 사용한 신고서와 외부 데이터의 출처를 함께 남깁니다. 어떤 자료를 기준으로 검증했는지 직접 확인하실 수 있습니다.",
  },
  {
    title: "개인정보와 식별정보 보호",
    body: "화면에 표시할 필요가 없는 개인·식별정보는 마스킹해 제공합니다.",
  },
  {
    title: "AI 설명도 검증 기준에 따라 작성",
    body: "AI가 작성하는 설명은 저장된 판정 결과와 근거를 기준으로 생성합니다. 확인되지 않은 내용은 설명에 추가하지 않습니다. 확인하지 못한 사유를 기록하고, 판정이 어려운 경우에는 보류 상태로 남깁니다.",
  },
];

const LIMITS: readonly Item[] = [
  {
    title: "공개된 데이터 범위 내에서 검증",
    body: "공공 기록이나 시장 데이터가 제공되는 항목을 대상으로 검증합니다. 자산의 종류와 데이터 공개 범위에 따라 확인할 수 있는 내용이 달라질 수 있습니다.",
  },
  {
    title: "조회 시점의 데이터를 기준으로 판정",
    body: "공공 기록과 시장 데이터는 이후 변경될 수 있습니다. 검증 결과에는 조회 시점을 함께 기록하고, 정정이나 데이터 변경이 확인되면 다시 검증합니다.",
  },
  {
    title: "가격 분석의 범위",
    body: "가격 분석은 취득가격과 공모가격, 비교 가능한 시장 거래 등을 기준으로 가격 부담을 확인합니다. 개별 자산의 미래 가치나 예상 수익률을 산정하지 않습니다.",
  },
];

const AMENDMENT_STATS: readonly Stat[] = [
  { value: "65%", label: "투자계약증권 공시 중 정정이 차지하는 비율" },
  { value: "2.4회", label: "공모 한 건당 평균 정정 횟수" },
];

const AMENDMENT_STATS_SOURCE =
  "출처 · 2023~2026 투자계약증권 공시 전수 자체 집계 (OpenDART)";

function RuleList({ items }: { readonly items: readonly Item[] }) {
  return (
    <dl className={s.ruleList}>
      {items.map((item) => (
        <div key={item.title} className={s.ruleItem}>
          <dt className={s.ruleTerm}>{item.title}</dt>
          <dd className={s.ruleDesc}>{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}

function VerdictList({
  verdicts,
  className,
}: {
  readonly verdicts: readonly Verdict[];
  readonly className?: string;
}) {
  return (
    <dl className={`${s.verdictList} ${className ?? ""}`}>
      {verdicts.map((verdict) => (
        <div
          key={verdict.title}
          className={`${s.verdictItem} ${verdict.className}`}
        >
          <dt className={s.verdictTerm}>{verdict.title}</dt>
          <dd className={s.verdictDesc}>{verdict.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PipelineSection() {
  return (
    <section
      className={s.section}
      aria-labelledby={METHODOLOGY_ANCHOR.pipeline}
    >
      <h2 id={METHODOLOGY_ANCHOR.pipeline} className={s.sectionTitle}>
        검증은 이렇게 진행합니다
      </h2>
      <ol className={s.stepList}>
        {PROCESS.map((step) => (
          <li key={step.title} className={s.stepItem}>
            <h3 className={s.stepTitle}>{step.title}</h3>
            <p className={s.stepDescription}>{step.body}</p>
          </li>
        ))}
      </ol>

      <div className={s.methodologyCopyStack}>
        <div>
          <h3 className={s.layerTitle}>AI 판정 관련</h3>
          <p className={s.paragraph}>
            AI는 검증 내용을 찾고 정리하고 읽기 쉽도록 제공합니다. 자동 판정은
            청약 예정인 상품과 실제 데이터를 비교합니다. 원장 정보의 일치 여부를
            확인하고, 시장 데이터를 이용해 가격 수준을 계산하며, 과거 공모 이력도
            확인합니다.
          </p>
        </div>
      </div>
    </section>
  );
}

export function LayersSection() {
  return (
    <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.layers}>
      <h2 id={METHODOLOGY_ANCHOR.layers} className={s.sectionTitle}>
        무엇을 확인하나요
      </h2>
      <ol className={s.layerList}>
        {CHECK_ITEMS.map((item) => (
          <li key={item.title} className={s.layerItem}>
            <h3 className={s.layerTitle}>{item.title}</h3>
            <p className={s.paragraph}>{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SourcesSection() {
  return (
    <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.sources}>
      <h2 id={METHODOLOGY_ANCHOR.sources} className={s.sectionTitle}>
        어떤 데이터를 사용하나요
      </h2>
      <p className={s.paragraph}>
        검증 항목에 따라 필요한 데이터를 나눠 사용합니다.
        <br />
        증권신고서와 정정신고서는 확인할 내용을 찾는 기준이 되고, 공공 원장과 시장
        데이터는 대조에 사용합니다.
      </p>
      <RuleList items={DATA_ROWS} />
    </section>
  );
}

export function VerdictsSection() {
  return (
    <section
      className={s.section}
      aria-labelledby={METHODOLOGY_ANCHOR.verdicts}
    >
      <h2 id={METHODOLOGY_ANCHOR.verdicts} className={s.sectionTitle}>
        검증 결과는 어떻게 표시하나요
      </h2>
      <p className={s.paragraph}>확인 항목에 따라 결과를 다르게 표시합니다.</p>

      <div className={s.verdictGroup}>
        <h3 className={s.verdictGroupTitle}>공공 기록 대조</h3>
        <p className={s.verdictGroupIntro}>
          신고서와 공공 기록을 비교한 결과는 세 가지로 구분합니다.
        </p>
        <VerdictList verdicts={PUBLIC_RECORD_VERDICTS} />
      </div>

      <div className={s.verdictGroup}>
        <h3 className={s.verdictGroupTitle}>미술품 종합 판정</h3>
        <p className={s.verdictGroupIntro}>
          가격, 작가의 거래 이력, 비교 작품, 과거 공모의 회수 이력을 종합해
          판정합니다.
        </p>
        <VerdictList
          verdicts={ART_VERDICTS}
          className={s.artVerdictList}
        />
      </div>

      <p className={s.paragraph}>
        근거가 부족하면 판정을 보류하고 부족한 정보를 함께 표시합니다.
      </p>
    </section>
  );
}

export function AmendmentSection() {
  return (
    <section
      className={s.section}
      aria-labelledby={METHODOLOGY_ANCHOR.amendment}
    >
      <h2 id={METHODOLOGY_ANCHOR.amendment} className={s.sectionTitle}>
        정정 공시는 어떻게 확인하나요
      </h2>
      <p className={s.paragraph}>
        증권신고서는 공모 과정에서 정정될 수 있습니다. 정정신고서가 접수되면
        변경된 내용을 다시 확인하고 기존 검증 결과와 비교합니다.
      </p>

      <div className={s.statGrid}>
        {AMENDMENT_STATS.map((stat) => (
          <ProductMetric key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
      <p className={s.statSource}>{AMENDMENT_STATS_SOURCE}</p>

      <div className={s.methodologyCopyStack}>
        <p>
          정정신고서에서 달라진 항목을 확인한 뒤 관련 데이터를 다시 조회합니다.
          가격, 자산 정보, 공모 조건 등 기존 판정에 영향을 주는 내용이 바뀌었다면
          해당 항목도 다시 검증합니다.
        </p>
        <p>
          정정 전후의 검증 결과를 함께 보관합니다. 어떤 내용이 바뀌었고 판정에 어떤
          변화가 있었는지 확인할 수 있도록 기록합니다.
        </p>
      </div>
    </section>
  );
}

export function PrinciplesSection() {
  return (
    <section
      className={s.section}
      aria-labelledby={METHODOLOGY_ANCHOR.principles}
    >
      <h2 id={METHODOLOGY_ANCHOR.principles} className={s.sectionTitle}>
        검증 결과는 어떻게 작성하나요
      </h2>
      <RuleList items={WRITING_RULES} />
    </section>
  );
}

export function LimitsSection() {
  return (
    <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.limits}>
      <h2 id={METHODOLOGY_ANCHOR.limits} className={s.sectionTitle}>
        검증 범위와 한계
      </h2>
      <RuleList items={LIMITS} />
    </section>
  );
}

export function NoticeSection() {
  return (
    <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.notice}>
      <h2 id={METHODOLOGY_ANCHOR.notice} className={s.sectionTitle}>
        유의사항
      </h2>
      <div className={s.methodologyCopyStack}>
        <p>
          JeomJeom의 검증 결과는 공시 내용과 공개 데이터를 바탕으로 제공하는 참고
          정보입니다. 특정 상품의 청약이나 투자를 권유하거나, 만류하지 않으며,
          수익을 보장하지 않습니다.
        </p>
        <p>
          투자 판단과 그에 따른 결과는 이용자에게 있고, 본 서비스는 어떤 법적
          근거로도 사용될 수 없습니다.
        </p>
      </div>
    </section>
  );
}
