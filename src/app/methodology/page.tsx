import type { Metadata } from "next";
import Link from "next/link";

import { METHODOLOGY_ANCHOR } from "./anchors";
import s from "./methodology.module.css";

export const metadata: Metadata = {
  title: "검증 방법",
  description:
    "증권신고서의 확인 항목을 공공 원장, 시장 데이터, 과거 공모 이력과 대조하고 결과·근거·한계를 기록하는 방법을 설명합니다.",
};

interface Item {
  readonly title: string;
  readonly body: string;
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
    title: "1. 확인할 항목을 찾습니다",
    body: "증권신고서에서 사실로 확인할 수 있는 항목을 찾습니다. 자산 정보, 취득가격, 공모 조건, 회수 계획과 과거 이력이 주요 대상입니다.",
  },
  {
    title: "2. 비교할 자료를 찾습니다",
    body: "항목과 자산 종류에 맞는 자료를 찾습니다. 공공 원장, 시장 거래 자료, 과거 공모 기록처럼 확인 목적에 맞는 출처를 구분해 사용합니다.",
  },
  {
    title: "3. 신고서 내용과 대조합니다",
    body: "신고서에 적힌 내용과 확인한 자료를 항목별로 대조합니다. 값의 일치 여부, 가격 부담, 과거에 제시한 계획의 이행 여부를 확인합니다.",
  },
  {
    title: "4. 결과와 근거를 남깁니다",
    body: "결과와 함께 사용한 자료, 조회 시점, 원문 출처를 남깁니다. 확인하지 못한 항목은 그 사유를 기록해 결과의 범위를 알 수 있게 합니다.",
  },
];

const CHECK_ITEMS: readonly Item[] = [
  {
    title: "자산 정보",
    body: "신고서의 자산 정보를 확인 가능한 공공 원장과 대조합니다. 개체번호, 등록정보, 작품 정보처럼 직접 확인할 수 있는 항목은 신고서와 조회 기록이 같은지 살펴봅니다.",
  },
  {
    title: "가격 수준",
    body: "취득가격, 공모가격, 공개된 비용의 구성을 확인하고 관련 시장 자료와 비교합니다. 같은 작가의 거래·낙찰 이력이나 유사 자산의 거래가격을 이용해 가격 부담을 살펴봅니다.",
  },
  {
    title: "과거 이력",
    body: "과거 공모의 모집, 배당, 매각·청산 내역과 자산의 거래 이력을 확인합니다. 제시된 회수 계획이 실제로 이행됐는지와 비슷한 자산이 어떤 조건으로 거래됐는지를 함께 살펴봅니다.",
  },
];

const DATA_ITEMS: readonly Item[] = [
  {
    title: "공시 자료",
    body: "금융감독원 전자공시(DART)의 증권신고서와 정정신고서를 기준 문서로 사용합니다. 자산 정보, 취득가격, 공모 조건, 회수 계획 등 확인할 내용을 여기에서 찾습니다.",
  },
  {
    title: "공공 기록",
    body: "자산별로 조회 가능한 공공 원장을 사용합니다. 예를 들어 한우는 축산물이력제의 개체 정보를 조회해 신고서에 적힌 정보와 대조합니다.",
  },
  {
    title: "시장 데이터",
    body: "가격과 거래 이력을 확인할 때는 자산에 맞는 시장 데이터를 사용합니다. 한우 경락 정보, 부동산 실거래 자료, 미술품 작가·작품의 거래 및 낙찰 이력 등이 포함됩니다.",
  },
  {
    title: "과거 공모 자료",
    body: "이전 공모의 모집, 배당, 매각·청산 결과와 정정 이력을 확인합니다. 같은 발행사의 이행 기록과 유사 자산의 회수 사례를 살펴볼 때 사용합니다.",
  },
];

const PUBLIC_RECORD_VERDICTS: readonly Verdict[] = [
  {
    title: "일치",
    body: "신고서에 적힌 값과 확인한 공공 기록이 같은 경우입니다.",
    className: s.verdictMatch,
  },
  {
    title: "원장 불일치",
    body: "신고서에 적힌 값과 공공 원장의 값이 다른 경우입니다. 확인된 차이와 비교 근거를 함께 보여주며, 그 자체가 투자 위험 판정을 뜻하지는 않습니다.",
    className: s.verdictMiss,
  },
  {
    title: "대조 불가",
    body: "비교할 공공 기록이 없거나 충분히 확인할 수 없는 경우입니다. 불일치로 보지 않고, 대조하지 못한 사유를 함께 표시합니다.",
    className: s.verdictUnknown,
  },
];

const ART_VERDICTS: readonly Verdict[] = [
  {
    title: "양호",
    body: "필요한 근거가 갖춰진 상태에서 가격 부담, 작가의 거래·낙찰 이력, 비교 작품, 과거 공모 회수 이력에 뚜렷한 약점이 확인되지 않은 경우입니다.",
    className: s.verdictMatch,
  },
  {
    title: "조건부 양호",
    body: "필요한 근거는 갖춰졌지만 일부 항목에 확인이 필요한 신호가 있어 조건을 함께 살펴봐야 하는 경우입니다.",
    className: s.verdictUnknown,
  },
  {
    title: "주의",
    body: "가격 부담, 약한 거래·낙찰 이력, 비교 근거 부족, 회수 지연 등 한 항목 이상에서 의미 있는 약점이 확인된 경우입니다.",
    className: s.verdictMiss,
  },
  {
    title: "위험",
    body: "작품 식별 불일치, 가격 산식 충돌, 확인된 손실·회수 실패처럼 중대한 문제가 있거나 높은 위험 신호가 함께 확인된 경우입니다.",
    className: s.verdictMiss,
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
    body: "AI 설명은 저장된 확인 결과와 근거만 사용합니다. 확인되지 않은 내용을 보태거나 판정을 바꾸지 않으며, 근거가 부족하면 그 사유를 밝히고 보류 상태로 남깁니다.",
  },
];

const LIMITS: readonly Item[] = [
  {
    title: "공개된 데이터 범위 내에서 검증",
    body: "공공 기록이나 시장 데이터로 확인할 수 있는 항목만 검증합니다. 비공개 계약, 공개되지 않은 비용, 확인할 수 없는 거래는 결과에 반영할 수 없습니다.",
  },
  {
    title: "조회 시점의 데이터를 기준으로 판정",
    body: "결과는 표시된 조회 시점의 공공 기록과 시장 데이터를 기준으로 합니다. 정정 공시나 원천 데이터 변경이 확인되면 영향을 받는 항목을 다시 검증합니다.",
  },
  {
    title: "가격 분석의 범위",
    body: "가격 분석은 취득가격, 공모가격, 공개 비용과 비교 가능한 시장 거래를 바탕으로 가격 부담을 확인합니다. 미래 가치, 예상 수익률, 매수·청약 적합성을 산정하지 않습니다.",
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

function VerdictList({ verdicts }: { readonly verdicts: readonly Verdict[] }) {
  return (
    <dl className={s.verdictList}>
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

export default function MethodologyPage() {
  return (
    <>
      <section
        className={s.header}
        aria-labelledby={METHODOLOGY_ANCHOR.methodology}
      >
        <div className={s.wrap}>
          <h1 id={METHODOLOGY_ANCHOR.methodology} className={s.title}>
            <span>검증 방법</span>
            <span className={s.titleLead}>공시 내용은 어떻게 확인하나요</span>
          </h1>
          <p className={s.lead}>
            JeomJeom은 증권신고서의 확인 항목을 공공 원장, 시장 데이터, 과거
            공모·거래 이력과 대조합니다. 결과와 함께 사용한 자료와 조회 시점도
            기록합니다.
          </p>
          <p className={s.lead}>
            검증 대상은 공개 자료로 직접 확인할 수 있는 사실입니다. 신고서의 내용과
            관련 데이터를 대조해 값의 일치 여부, 가격 부담, 과거 계획의 이행 내역을
            확인합니다.
          </p>
        </div>
      </section>

      <div className={`${s.wrap} ${s.body}`}>
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

          <h3 className={s.layerTitle}>AI는 이렇게 활용합니다</h3>
          <p className={s.paragraph}>
            AI는 확인할 항목과 근거를 정리하고, 저장된 결과를 읽기 쉬운 문장으로
            설명합니다. 확인 결과나 근거를 임의로 바꾸지는 않습니다.
          </p>
          <p className={s.paragraph}>
            확인 과정에서는 공공 원장의 일치 여부, 시장 자료에 나타난 가격과 거래
            이력, 과거 공모의 이행 결과를 살펴봅니다. 필요한 자료가 없거나 서로
            맞지 않으면 임의로 값을 채우지 않고 확인이 어려운 상태로 남깁니다.
          </p>
          <p className={s.paragraph}>
            각 결과에는 사용한 데이터, 원문 출처, 조회 시점이 함께 기록됩니다.
          </p>
        </section>

        <section
          className={s.section}
          aria-labelledby={METHODOLOGY_ANCHOR.layers}
        >
          <h2 id={METHODOLOGY_ANCHOR.layers} className={s.sectionTitle}>
            무엇을 확인하나요
          </h2>
          <RuleList items={CHECK_ITEMS} />
        </section>

        <section
          className={s.section}
          aria-labelledby={METHODOLOGY_ANCHOR.sources}
        >
          <h2 id={METHODOLOGY_ANCHOR.sources} className={s.sectionTitle}>
            어떤 데이터를 사용하나요
          </h2>
          <p className={s.paragraph}>
            증권신고서와 정정신고서는 확인할 항목을 정하는 기준 문서입니다. 공공
            원장과 시장 데이터, 과거 공모 자료는 신고서의 내용을 실제 기록과 대조할
            때 사용합니다.
          </p>
          <RuleList items={DATA_ITEMS} />
        </section>

        <section
          className={s.section}
          aria-labelledby={METHODOLOGY_ANCHOR.verdicts}
        >
          <h2 id={METHODOLOGY_ANCHOR.verdicts} className={s.sectionTitle}>
            검증 결과는 어떻게 표시하나요
          </h2>
          <p className={s.paragraph}>
            공공 기록의 값 대조와 미술품의 종합 판정은 목적이 다르므로 결과 용어를
            구분해 표시합니다.
          </p>

          <h3 className={s.layerTitle}>공공 기록 대조</h3>
          <p className={s.paragraph}>
            신고서와 공공 원장의 값을 직접 비교한 결과는 세 가지로 구분합니다.
          </p>
          <VerdictList verdicts={PUBLIC_RECORD_VERDICTS} />

          <h3 className={s.layerTitle}>미술품 종합 판정</h3>
          <p className={s.paragraph}>
            가격 부담, 작가의 거래·낙찰 이력, 비교 작품의 근거, 과거 공모의
            회수·청산 이력을 함께 살펴 네 가지 용어로 표시합니다.
          </p>
          <VerdictList verdicts={ART_VERDICTS} />
          <p className={s.paragraph}>
            필수 근거가 없거나 서로 맞지 않거나 오래된 경우에는 네 판정 중 하나를
            억지로 선택하지 않습니다. 판정을 보류하고 부족한 정보를 함께 표시합니다.
          </p>
        </section>

        <section
          className={s.section}
          aria-labelledby={METHODOLOGY_ANCHOR.amendment}
        >
          <h2 id={METHODOLOGY_ANCHOR.amendment} className={s.sectionTitle}>
            정정 공시는 어떻게 확인하나요
          </h2>
          <p className={s.paragraph}>
            증권신고서는 공모 과정에서 정정될 수 있습니다. 정정신고서가 접수되면
            바뀐 항목을 찾고 기존 확인 결과에 영향을 주는지 살펴봅니다.
          </p>
          <p className={s.paragraph}>
            가격, 자산 정보, 공모 조건처럼 결과에 영향을 주는 내용이 바뀌면 관련
            공공 원장과 시장 데이터를 다시 조회하고 해당 항목을 재검증합니다.
          </p>
          <p className={s.paragraph}>
            정정 전후의 결과와 근거를 함께 보관합니다. 무엇이 바뀌었고 결과가 어떻게
            달라졌는지 나중에도 확인할 수 있도록 변경 이력을 남깁니다.
          </p>

          <dl className={s.statGrid}>
            {AMENDMENT_STATS.map((stat) => (
              <div key={stat.value} className={s.stat}>
                <dt className={s.statLabel}>{stat.label}</dt>
                <dd className={s.statValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className={s.statSource}>{AMENDMENT_STATS_SOURCE}</p>
        </section>

        <section
          className={s.section}
          aria-labelledby={METHODOLOGY_ANCHOR.principles}
        >
          <h2 id={METHODOLOGY_ANCHOR.principles} className={s.sectionTitle}>
            검증 결과는 어떻게 작성하나요
          </h2>
          <RuleList items={WRITING_RULES} />
        </section>

        <section
          className={s.section}
          aria-labelledby={METHODOLOGY_ANCHOR.limits}
        >
          <h2 id={METHODOLOGY_ANCHOR.limits} className={s.sectionTitle}>
            검증 범위와 한계
          </h2>
          <RuleList items={LIMITS} />

          <h3 className={s.layerTitle}>유의사항</h3>
          <div className={s.callout}>
            <p>
              JeomJeom의 검증 결과는 공시 내용과 공개 데이터를 바탕으로 제공하는
              참고 정보입니다. 특정 상품의 청약이나 투자를 권유하거나, 만류하지
              않으며, 수익을 보장하지 않습니다.
            </p>
            <p>
              투자 판단과 그에 따른 결과는 이용자에게 있고, 본 서비스는 어떤 법적
              근거로도 사용될 수 없습니다.
            </p>
          </div>
        </section>

        <Link href="/offers" className={s.backLink}>
          <span aria-hidden="true">←</span>
          공모 목록으로 돌아가기
        </Link>
      </div>
    </>
  );
}
