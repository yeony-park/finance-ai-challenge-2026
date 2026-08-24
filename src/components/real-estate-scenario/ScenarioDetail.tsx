import type { ReactNode } from "react";

import {
  calculateCompletionMetrics,
  SCENARIO_DEMO_DISCLOSURE,
  type ScenarioOffer,
} from "@/lib/knowledge/schema";

import { formatDate, formatWon, PHASE_LABEL } from "./ScenarioCatalog";
import { ScenarioEvidenceQuery } from "./ScenarioEvidenceQuery";
import s from "./scenario.module.css";

const FACT_LABEL: Readonly<Record<string, string>> = {
  "building-name": "건물명",
  "main-use": "주용도",
  "gross-floor-area": "연면적",
  "land-area": "대지면적",
  "use-approval-date": "사용승인일",
};

const RETURN_OUTCOME_LABEL: Readonly<Record<NonNullable<ScenarioOffer["completion"]>["returnOutcome"], string>> = {
  profit: "이익",
  loss: "손실",
  breakeven: "보합",
};

const SCHEDULE_OUTCOME_LABEL: Readonly<Record<NonNullable<ScenarioOffer["completion"]>["scheduleOutcome"], string>> = {
  early: "목표보다 조기 종료",
  "on-time": "목표일 종료",
  delayed: "목표일보다 정산 지연",
};

const ASSUMPTION_TAG_LABEL: Readonly<Record<NonNullable<ScenarioOffer["completion"]>["assumptionTags"][number], string>> = {
  "interest-rate": "금리",
  vacancy: "공실",
  "lease-termination": "임대차 종료",
  "repair-capex": "수선비",
  liquidity: "유동성",
  tenant: "임차인",
  "early-sale": "조기 매각",
  "market-conditions": "시장 여건",
};

const formatPercent = (value: number): string =>
  `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;

const factValue = (fact: ScenarioOffer["asset"]["facts"][number]): string => {
  if (fact.status === "unknown") return "확인하지 못함";
  const value = typeof fact.value === "number" ? fact.value.toLocaleString("ko-KR") : String(fact.value ?? "확인하지 못함");
  return fact.unit ? `${value}${fact.unit === "m2" ? "㎡" : fact.unit}` : value;
};

function FactGrid({ children }: { readonly children: ReactNode }) {
  return <dl className={s.detailFacts}>{children}</dl>;
}

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function ScenarioSources({ offer }: { readonly offer: ScenarioOffer }) {
  if (offer.sources.length === 0) return null;
  return (
    <ul className={s.sourceList} aria-label="후보 건물 확인 범위 출처">
      {offer.sources.map((source) => (
        <li key={source.sourceId}>
          <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.label} (새 창)`}>
            출처 · {source.label}
          </a>
          <span>{formatDate(source.asOf)} 기준 · {source.method}</span>
        </li>
      ))}
    </ul>
  );
}

export function ScenarioDetail({
  offer,
  operatorHistory,
}: {
  readonly offer: ScenarioOffer;
  readonly operatorHistory: readonly ScenarioOffer[];
}) {
  const metrics = calculateCompletionMetrics(offer);
  const listedDate = offer.offering.listedOn ? formatDate(offer.offering.listedOn) : "상장 전";

  return (
    <main>
      <header className={s.detailHero}>
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>부동산 상품 검토</p>
          <h1 className={s.detailTitle}>{offer.asset.publicName}</h1>
          <p className={s.detailLead}>
            상품 투자조건과 건물 후보 공개정보를 분리해 확인합니다. 기준일 {formatDate(offer.asOf)}.
          </p>
          <p className={s.demoNote}>검토용 시나리오 · 실제 청약·판매 상품이 아닙니다.</p>
          <span className={s.phase}>{PHASE_LABEL[offer.offering.phase]}</span>
        </div>
      </header>

      <section className={s.detailSection} aria-labelledby="scenario-basic-title">
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>가장 먼저 확인할 정보</p>
          <h2 id="scenario-basic-title" className={s.sectionTitle}>상품 투자조건</h2>
          <div className={s.detailGrid}>
            <section className={s.detailCard}>
              <h3>금액과 일정</h3>
              <FactGrid>
                <Fact label="1단위 가격" value={formatWon(offer.offering.unitPriceWon)} />
                <Fact label="최소 투자" value={formatWon(offer.offering.minimumInvestmentWon)} />
                <Fact label="공모총액" value={formatWon(offer.offering.amountWon)} />
                <Fact label="발행수량" value={`${offer.offering.unitCount.toLocaleString("ko-KR")}단위`} />
                <Fact label="청약기간" value={`${formatDate(offer.offering.opensOn)} ~ ${formatDate(offer.offering.closesOn)}`} />
                <Fact label="상장일" value={listedDate} />
                <Fact label="현재 단계" value={PHASE_LABEL[offer.offering.phase]} />
              </FactGrid>
            </section>
            <section className={s.detailCard}>
              <h3>배당과 비용</h3>
              <FactGrid>
                <Fact label="예상 연 배당" value={formatPercent(offer.offering.expectedAnnualDistributionRatePercent)} />
                <Fact label="배당 주기" value={`${offer.offering.distributionCycleMonths}개월마다`} />
                <Fact label="거래수수료율" value={formatPercent(offer.offering.tradingFeeRatePercent)} />
                <Fact label="총비용률" value={formatPercent(offer.offering.totalExpenseRatePercent)} />
                <Fact label="목표 보유기간" value={`${offer.offering.targetHoldingMonths}개월`} />
                <Fact label="거래 상태" value={offer.offering.tradabilityStatus === "available" ? "거래 가능" : offer.offering.tradabilityStatus === "ended" ? "종료" : "상장 전"} />
              </FactGrid>
            </section>
            <section className={`${s.detailCard} ${s.detailCardWide}`}>
              <h3>보유·회수 조건</h3>
              <ul className={s.plainList}>{offer.offering.exitConditions.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>

          <section className={s.conditionsBlock} aria-labelledby="scenario-conditions-title">
            <h3 id="scenario-conditions-title">조건과 가정</h3>
            <p className={s.blockLead}>실제 권리·대출·임대차 사실이 아니라, 이 데모 상품을 검토하기 위해 입력한 시나리오 조건입니다.</p>
            <FactGrid>
              <Fact label="1단위 권리" value={offer.offering.unitRightsSummary} />
              <Fact label="배당 산식" value={offer.offering.distributionBasis} />
              <Fact label="수수료 적용 범위" value={offer.offering.feeScope} />
              <Fact label="세금 안내" value={offer.offering.taxNotice} />
              <Fact label="배정·환불" value={offer.offering.allocationRefundPolicy} />
              <Fact label="청산 순위" value={offer.offering.liquidationPriority} />
              <Fact label="대출 조건" value={`LTV ${formatPercent(offer.offering.financing.ltvPercent)} · 연 ${formatPercent(offer.offering.financing.annualInterestRatePercent)} · 만기 ${formatDate(offer.offering.financing.maturityOn)}`} />
              <Fact label="임대 가정" value={`공실률 ${formatPercent(offer.offering.leaseAssumptions.vacancyRatePercent)} · ${offer.offering.leaseAssumptions.tenantConcentrationNote}`} />
            </FactGrid>
            <div className={s.twoColumns}>
              <div>
                <h4>연장 조건</h4>
                <ul className={s.plainList}>{offer.offering.extensionConditions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4>대출·임대 가정의 한계</h4>
                <ul className={s.plainList}>
                  {[...offer.offering.financing.limitations, ...offer.offering.leaseAssumptions.limitations].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className={`${s.detailSection} ${s.detailMuted}`} aria-labelledby="scenario-review-title">
        <div className={s.detailWrap}>
          <p className={s.eyebrow}>투자 검토 지원</p>
          <h2 id="scenario-review-title" className={s.sectionTitle}>확인한 사실과 남은 질문</h2>
          <p className={s.sectionLead}>추천이나 안전성 점수가 아니라, 이 화면에서 확인한 범위와 확인하지 못한 범위를 보여줍니다.</p>

          <div className={s.reviewStack}>
            <section className={s.reviewBlock}>
              <h3>중요 조건과 한계</h3>
              <div className={s.twoColumns}>
                <div>
                  <h4>조건을 읽을 때 둔 가정</h4>
                  <ul className={s.plainList}>{offer.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h4>아직 확인하지 못한 범위</h4>
                  <ul className={s.plainList}>{offer.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </section>

            <section className={s.reviewBlock}>
              <h3>건물 후보의 공개정보 확인 범위</h3>
              <p className={s.blockLead}>건물명과 주소도 후보 입력이며 개별 공공원장 대조 전입니다. 후보 건물의 공개자료에서 독립적으로 확인한 값만 ‘확인’으로 표시하고 상품 투자조건과 합치지 않습니다.</p>
              <FactGrid>
                <Fact label="대상 후보" value={offer.asset.publicName} />
                <Fact label="후보 주소 · 공공 원장 대조 전" value={offer.asset.roadAddress} />
                {offer.asset.facts.map((fact) => (
                  <Fact key={fact.field} label={FACT_LABEL[fact.field] ?? fact.field} value={`${factValue(fact)} · ${fact.status === "confirmed" ? "확인" : "미확인"}`} />
                ))}
              </FactGrid>
              <ScenarioSources offer={offer} />
            </section>

            {offer.completion && metrics ? (
              <section className={s.reviewBlock}>
                <h3>완료 성과 · 입력값의 파생 계산</h3>
                <p className={s.blockLead}>실제 건물의 투자 성과가 아닙니다. 입력한 분배금·매각대금·비용을 단순 계산한 결과입니다.</p>
                <FactGrid>
                  <Fact label="목표 회수일" value={formatDate(offer.completion.targetExitOn)} />
                  <Fact label="입력 종료일" value={formatDate(offer.completion.actualExitOn)} />
                  <Fact label="누적 분배금" value={formatWon(offer.completion.cumulativeDistributionWon)} />
                  <Fact label="매각대금" value={formatWon(offer.completion.saleProceedsWon)} />
                  <Fact label="비용" value={formatWon(offer.completion.feesWon)} />
                  <Fact label="순회수액(파생)" value={formatWon(metrics.netCash)} />
                  <Fact label="단순 총수익률(파생)" value={formatPercent(metrics.totalReturnRatePercent)} />
                  <Fact label="단순 보유일수(파생)" value={`${metrics.holdingDays.toLocaleString("ko-KR")}일 · IRR 기간 아님`} />
                  <Fact label="손익 결과" value={RETURN_OUTCOME_LABEL[offer.completion.returnOutcome]} />
                  <Fact label="일정 결과" value={SCHEDULE_OUTCOME_LABEL[offer.completion.scheduleOutcome]} />
                  <Fact label="시나리오 가정 원인" value={offer.completion.assumptionTags.map((tag) => ASSUMPTION_TAG_LABEL[tag]).join(" · ")} />
                </FactGrid>
                <p className={s.blockNote}>시나리오 가정 요약 · {offer.completion.assumptionSummary}</p>
              </section>
            ) : null}

            <section className={s.reviewBlock}>
              <h3>{offer.participants.platformOperator.label} 과거 완료 사례 3건</h3>
              <p className={s.blockLead}>같은 운영그룹으로 묶인 완료 입력 사례의 파생 계산이며 실제 운영사 실적이 아닙니다.</p>
              {operatorHistory.length > 0 ? (
                <div className={s.historyGrid}>
                  {operatorHistory.map((past) => {
                    const pastMetrics = calculateCompletionMetrics(past);
                    return (
                      <article key={past.offerId}>
                        <h4>{past.asset.publicName}</h4>
                        <p>{past.completion ? formatDate(past.completion.actualExitOn) : "회수일 미확인"} 종료</p>
                        <p>{pastMetrics ? `손익 ${RETURN_OUTCOME_LABEL[past.completion!.returnOutcome]} · 일정 ${SCHEDULE_OUTCOME_LABEL[past.completion!.scheduleOutcome]}` : "파생 계산 불가"}</p>
                        <p>{pastMetrics ? `단순 총수익률 ${formatPercent(pastMetrics.totalReturnRatePercent)}` : null}</p>
                      </article>
                    );
                  })}
                </div>
              ) : <p className={s.emptyText}>같은 운영그룹의 완료 입력 사례가 아직 3건에 이르지 않습니다.</p>}
            </section>
          </div>
        </div>
      </section>

      <div className={s.detailWrap}>
        <ScenarioEvidenceQuery scenarioId={offer.scenarioId} offerId={offer.offerId} />
      </div>

      <aside className={s.disclosure} aria-label="데모 데이터 안내">
        <div className={s.wrap}>{SCENARIO_DEMO_DISCLOSURE}</div>
      </aside>
    </main>
  );
}
