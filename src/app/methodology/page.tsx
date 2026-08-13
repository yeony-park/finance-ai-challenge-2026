import type { Metadata } from "next";
import Link from "next/link";

import { DATA_SOURCES } from "@/components/site/service";

import { METHODOLOGY_ANCHOR } from "./anchors";
import s from "./methodology.module.css";

export const metadata: Metadata = {
  title: "검증 방법",
  description:
    "증권신고서의 주장을 어떤 공공 데이터와 대조하는지, 판정 3값(일치 / 원장 미확인 / 대조 불가)의 정의는 무엇인지, 무엇을 하지 않는지 정리했습니다.",
};

interface Layer {
  readonly title: string;
  readonly body: string;
  readonly note: string;
}

const LAYERS: readonly Layer[] = [
  {
    title: "실재 확인 — 적혀 있는 것이 실제로 있는가",
    body: "신고서가 기초자산으로 적은 개체를 국가 원장에서 하나씩 조회합니다. 등록 여부뿐 아니라 품종·성별·취득 시점·보관 장소가 원장 기록과 같은지 항목 단위로 대조합니다. 개체 한 마리에 여러 항목 판정이 붙고, 개체 판정은 그 항목들을 모아 냅니다.",
    note: "대조 대상 · 축산물이력제 개체정보",
  },
  {
    title: "가격 위치 — 적힌 가격이 시장 어디쯤인가",
    body: "공시된 취득원가를 같은 시기·등급의 시장 자료와 견줍니다. 적정한 가격인지 판단하지 않고, 시장 분포에서 어디에 있는지만 표시합니다. 비교군이 충분하지 않으면 위치를 내지 않고 그 사실을 적습니다.",
    note: "대조 대상 · 축산물 등급판정·경락 정보 (부동산 축은 실거래가)",
  },
  {
    title: "이행 이력 — 과거에 말한 것과 실제로 한 것",
    body: "어떤 문서를 언제 대조했는지, 같은 공모의 리포트가 몇 번 갱신됐는지 기록으로 남깁니다. 발행사가 이전 공모에서 제시한 계획과 실제 결과를 나란히 놓기 위한 층위이며, 집계 단위는 공시상 법적 발행사입니다. 발행사·서비스 브랜드·청약 플랫폼은 서로 다른 값이므로 합산하지 않습니다.",
    note: "대조 대상 · 전자공시(DART) 공시 이력",
  },
];

interface Term {
  readonly term: string;
  readonly desc: string;
  readonly className: string;
}

const VERDICTS: readonly Term[] = [
  {
    term: "일치",
    desc: "신고서에 적힌 내용이 같은 항목의 공공 데이터에서 확인됩니다. 대조에 쓴 원문 위치와 조회 응답이 근거로 함께 남습니다.",
    className: s.verdictMatch,
  },
  {
    term: "원장 미확인",
    desc: "조회 시점의 공개 기록에서 해당 내용이 확인되지 않았다는 사실만을 뜻합니다. 기록이 아직 반영되지 않았을 수도, 조회 조건이 달랐을 수도 있습니다. 원인은 판정하지 않습니다.",
    className: s.verdictMiss,
  },
  {
    term: "대조 불가",
    desc: "대조할 공공 데이터가 없거나 아직 연결되지 않은 항목입니다. 일치·원장 미확인 어느 쪽으로도 세지 않고, 집계에서 따로 표시합니다.",
    className: s.verdictUnknown,
  },
];

interface Rule {
  readonly term: string;
  readonly desc: string;
}

const PRINCIPLES: readonly Rule[] = [
  {
    term: "단정하지 않습니다",
    desc: "원장 미확인의 원인을 지목하거나 발행사의 의도를 규정하는 표현을 쓰지 않습니다. 대조 결과를 세 값 중 하나로 적는 것이 이 서비스가 할 수 있는 전부입니다.",
  },
  {
    term: "근거 없는 판정은 싣지 않습니다",
    desc: "모든 판정에는 신고서 원문의 위치와 공공 데이터 조회 응답이 근거로 붙습니다. 근거를 붙일 수 없으면 판정을 내지 않습니다.",
  },
  {
    term: "자료 부족은 부정 판정의 근거가 아닙니다",
    desc: "확인할 자료가 없다는 사실과 내용이 사실이 아니라는 판단은 다릅니다. 누락된 값은 채워 넣지 않고 비워 두거나 대조 불가로 남깁니다.",
  },
  {
    term: "익명화가 기본입니다",
    desc: "발행사명·이력번호·구체적 소재지는 마스킹된 상태로 화면에 나옵니다. 마스킹은 서버에서 끝나며, 원본 값은 클라이언트로 전달되지 않습니다.",
  },
  {
    term: "문장을 지어내지 않습니다",
    desc: "설명 문장은 판정 결과에서 파생되며, 화면이 자체적으로 문장을 만들지 않습니다. 확인되지 않은 사실은 '공개 자료에서 확인되지 않음'으로 표기합니다.",
  },
];

interface Stat {
  readonly value: string;
  readonly label: string;
}

const AMENDMENT_STATS: readonly Stat[] = [
  { value: "65%", label: "투자계약증권 공시 중 정정이 차지하는 비율" },
  { value: "2.4회", label: "공모 한 건당 평균 정정 횟수" },
];

const AMENDMENT_STATS_SOURCE = "출처 · 2023~2026 투자계약증권 공시 전수 자체 집계 (OpenDART)";

const LIMITS: readonly Rule[] = [
  {
    term: "공개 데이터가 있는 범위까지만",
    desc: "대조는 공개·무료로 접근할 수 있는 공공 데이터가 존재하는 항목에만 적용됩니다. 대조할 데이터가 없는 자산군은 다루지 않습니다.",
  },
  {
    term: "조회 시점의 기록입니다",
    desc: "공공 데이터는 계속 갱신됩니다. 리포트는 조회 시각을 함께 표시하며, 같은 항목이 다른 시점에는 다르게 확인될 수 있습니다.",
  },
  {
    term: "공공 API 장애 시 스냅샷으로 대체합니다",
    desc: "실시간 조회가 불가능할 때는 보관된 스냅샷을 재생하며, 화면에 그 사실과 기준 시각을 표시합니다.",
  },
  {
    term: "가치 평가가 아닙니다",
    desc: "가격의 적정성, 사업의 성공 가능성, 투자 위험의 크기는 판단하지 않습니다. 판정은 문서와 공공 기록이 서로 맞는지에 한정됩니다.",
  },
];

export default function MethodologyPage() {
  return (
    <>
      <section className={s.header} aria-labelledby={METHODOLOGY_ANCHOR.methodology}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>검증 방법</p>
          <h1 id={METHODOLOGY_ANCHOR.methodology} className={s.title}>
            무엇을 어떤 기록과 대조하는가
          </h1>
          <p className={s.lead}>
            이 서비스는 문서를 평가하지 않습니다. 문서에 적힌 주장을 검증 가능한 단위로 쪼갠 다음,
            같은 사실을 담고 있는 공공 기록과 나란히 놓고 서로 맞는지만 확인합니다.
          </p>
        </div>
      </section>

      <div className={`${s.wrap} ${s.body}`}>
        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.pipeline}>
          <h2 id={METHODOLOGY_ANCHOR.pipeline} className={s.sectionTitle}>
            대조는 네 단계로 진행됩니다
          </h2>
          <p className={s.paragraph}>
            <strong>주장 추출</strong> — 증권신고서에서 검증할 수 있는 주장을 항목 단위로 뽑아냅니다.{" "}
            <strong>검증 가능성 판별</strong> — 그중 공공 데이터로 확인할 수 있는 항목을 가려냅니다.{" "}
            <strong>대조</strong> — 해당 공공 데이터를 조회해 값을 맞춰 봅니다.{" "}
            <strong>판정</strong> — 결과를 세 값 중 하나로 적고 근거를 붙입니다.
          </p>
          <p className={s.callout}>
            판정 단계는 결정론적 대조입니다. 언어 모델은 주장을 뽑고 설명 문장을 고르는 데까지만
            쓰이며, <strong>판정 값 자체에는 관여하지 않습니다.</strong> 모델이 틀려도 판정이
            흔들리지 않게 하는 구조입니다.
          </p>
        </section>

        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.layers}>
          <h2 id={METHODOLOGY_ANCHOR.layers} className={s.sectionTitle}>
            세 층위
          </h2>
          <ol className={s.layerList}>
            {LAYERS.map((layer) => (
              <li key={layer.title} className={s.layerItem}>
                <h3 className={s.layerTitle}>{layer.title}</h3>
                <p className={s.paragraph}>{layer.body}</p>
                <p className={s.layerNote}>{layer.note}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.sources}>
          <h2 id={METHODOLOGY_ANCHOR.sources} className={s.sectionTitle}>
            데이터 출처
          </h2>
          <p className={s.paragraph}>
            대조에 쓰는 데이터는 전부 <strong>공개되어 있고 무료로 접근할 수 있는 국가
            데이터</strong>입니다. 발행사가 제공한 자료를 대조 기준으로 쓰지 않습니다.
          </p>
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">데이터</th>
                  <th scope="col">보유 기관</th>
                  <th scope="col">쓰임</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map((source) => (
                  <tr key={source.name}>
                    <th scope="row">{source.name}</th>
                    <td>{source.holder}</td>
                    <td>{source.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.verdicts}>
          <h2 id={METHODOLOGY_ANCHOR.verdicts} className={s.sectionTitle}>
            판정 3값
          </h2>
          <dl className={s.verdictList}>
            {VERDICTS.map((verdict) => (
              <div key={verdict.term} className={`${s.verdictItem} ${verdict.className}`}>
                <dt className={s.verdictTerm}>{verdict.term}</dt>
                <dd className={s.verdictDesc}>{verdict.desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.amendment}>
          <h2 id={METHODOLOGY_ANCHOR.amendment} className={s.sectionTitle}>
            정정 재검증
          </h2>
          <p className={s.paragraph}>
            투자계약증권 공시는 한 번 내고 끝나지 않습니다. 제출 이후에도 문서는 계속 바뀝니다.
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

          <blockquote className={s.pullQuote}>
            정정 대비표는 발행인이 지정한 항목만 싣고, 요약정보와 제2부는 정오표 없이 본문에
            반영된다.
            <cite className={s.pullQuoteSource}>투자계약증권 증권신고서 정정 관행</cite>
          </blockquote>

          <p className={s.paragraph}>
            그래서 무엇이 바뀌었는지 알아내려면 정정이 접수될 때마다 전문을 다시 열고 수십 항목을
            눈으로 재대조해야 합니다. <strong>확인 비용이 확인 자체를 막는 병목</strong>이며,
            대다수 투자자는 이 지점에서 확인을 포기합니다.
          </p>

          <p className={s.paragraph}>
            정정신고서는 별도의 기능이 아니라 <strong>같은 검증 파이프라인의 새 입력</strong>입니다.
            접수를 감지하면 주장을 다시 뽑고, 다시 대조하고, 판정을 다시 냅니다. 리포트는 덮어쓰지
            않고 새 버전으로 쌓여 이전 판정과 비교할 수 있게 남습니다. 재대조가 자동으로 끝나면
            남는 일은 알림 한 건을 확인하는 것뿐입니다.
          </p>
          <p className={s.paragraph}>
            알림에는 두 가지 사실만 담습니다 — 바뀐 항목이 무엇인지, 판정이 유지됐는지 달라졌는지.
            변경의 중대성 등급은 매기지 않습니다. 무엇을 중대하다고 볼지는 이용자가 판단할 몫입니다.
          </p>
        </section>

        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.principles}>
          <h2 id={METHODOLOGY_ANCHOR.principles} className={s.sectionTitle}>
            표현 원칙
          </h2>
          <dl className={s.ruleList}>
            {PRINCIPLES.map((rule) => (
              <div key={rule.term} className={s.ruleItem}>
                <dt className={s.ruleTerm}>{rule.term}</dt>
                <dd className={s.ruleDesc}>{rule.desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={s.section} aria-labelledby={METHODOLOGY_ANCHOR.limits}>
          <h2 id={METHODOLOGY_ANCHOR.limits} className={s.sectionTitle}>
            한계
          </h2>
          <dl className={s.ruleList}>
            {LIMITS.map((rule) => (
              <div key={rule.term} className={s.ruleItem}>
                <dt className={s.ruleTerm}>{rule.term}</dt>
                <dd className={s.ruleDesc}>{rule.desc}</dd>
              </div>
            ))}
          </dl>
          <p className={s.callout}>
            <strong>본 서비스는 투자 권유·자문이 아닙니다.</strong> 특정 공모의 청약을 권유하거나
            만류하지 않으며, 수익률이나 투자 위험의 크기를 예측하지 않습니다. 최종 판단과 그 결과에 대한
            책임은 이용자 본인에게 있습니다.
          </p>
        </section>

        <Link href="/" className={s.backLink}>
          <span aria-hidden="true">←</span>
          공모 목록으로 돌아가기
        </Link>
      </div>
    </>
  );
}
