import { describe, expect, it } from "vitest";
import {
  NO_MAJOR_CONFLICT_LABEL,
  evaluateScenarioReview,
} from "../scenario-review";
import { loadApprovedScenarios } from "../loader";
import { ScenarioOfferSchema, type ScenarioOffer } from "../schema";
import { validScenarioOffer } from "./fixtures";

const offer = (): ScenarioOffer => ScenarioOfferSchema.parse(validScenarioOffer());

const settled = (
  scenarioId: string,
  returnOutcome: "profit" | "loss" | "breakeven",
  scheduleOutcome: "early" | "on-time" | "delayed",
): ScenarioOffer => {
  const value = offer();
  value.scenarioId = scenarioId;
  value.offerId = `${scenarioId}-offer`;
  value.asOf = "2026-08-24";
  value.offering.phase = "settled";
  value.offering.opensOn = "2024-08-20";
  value.offering.closesOn = "2024-08-30";
  value.offering.tradabilityStatus = "ended";
  const netCash = returnOutcome === "profit" ? 1_100_000_000 : returnOutcome === "loss" ? 900_000_000 : 1_000_000_000;
  const targetExitOn = "2026-06-30";
  const actualExitOn = scheduleOutcome === "early" ? "2026-06-01" : scheduleOutcome === "delayed" ? "2026-07-31" : targetExitOn;
  value.completion = {
    targetExitOn,
    actualExitOn,
    cumulativeDistributionWon: 0,
    saleProceedsWon: netCash,
    additionalContributionsWon: 0,
    refundsWon: 0,
    feesWon: 0,
    cashFlowCompleteness: "complete",
    taxBasis: "pre-tax",
    returnOutcome,
    scheduleOutcome,
    assumptionTags: ["market-conditions"],
    assumptionSummary: "가상 완료 이력입니다.",
    dataNature: "scenario",
  };
  return ScenarioOfferSchema.parse(value);
};

const area = (review: ReturnType<typeof evaluateScenarioReview>, id: string) =>
  review.areas.find((item) => item.area === id)!;

describe("real-estate scenario review v1", () => {
  it("동일 대상·동일 정의의 현재 자산값 불일치만 critical로 본다", () => {
    const value = offer();
    value.claimedAssetFacts[0].value = "판매시설";
    expect(area(evaluateScenarioReview(value, [value]), "asset")).toMatchObject({
      headline: "건축물대장 공개정보와 상품 조건 비교",
      state: "critical",
    });

    const observed = value.asset.facts[0];
    if (observed.status !== "confirmed") throw new Error("테스트 fixture 오류");
    observed.validThrough = "2026-08-23";
    const stale = area(evaluateScenarioReview(value, [value]), "asset");
    expect(stale.state).toBe("insufficient");
    expect(stale.findings[0].code).toBe("asset-observation-expired");
  });

  it("누락은 위험 대신 insufficient로 반환하고 사용자 label을 고정한다", () => {
    const value = offer();
    value.offering.cashFlowReview.annualRentalIncomeWon = null;
    value.offering.exitReview.decisionAuthority = null;
    const review = evaluateScenarioReview(value, [value]);
    expect(area(review, "return-cost").state).toBe("insufficient");
    expect(area(review, "exit").state).toBe("insufficient");

    const complete = evaluateScenarioReview(offer(), [offer(), settled("history-1", "profit", "on-time")]);
    expect(complete.overallLabel).toBe(NO_MAJOR_CONFLICT_LABEL);
  });

  it("payout coverage와 stress DSCR 데모 임계값을 적용한다", () => {
    const payout = offer();
    payout.offering.cashFlowReview.annualRentalIncomeWon = 60_000_000;
    payout.offering.cashFlowReview.annualOperatingExpenseWon = 20_000_000;
    const payoutArea = area(evaluateScenarioReview(payout, [payout]), "return-cost");
    expect(payoutArea.state).toBe("critical");
    expect(payoutArea.headline).toContain("예상 분배 충당배수");
    expect(payoutArea.findings[0].message).toContain("예상 분배 충당배수");
    expect(payoutArea.findings[0].message).not.toContain("payout coverage");

    const dscrCritical = offer();
    dscrCritical.offering.cashFlowReview.annualDebtServiceWon = 70_000_000;
    const criticalArea = area(evaluateScenarioReview(dscrCritical, [dscrCritical]), "financing");
    expect(criticalArea.state).toBe("critical");
    expect(criticalArea.headline).toContain("금리상승 가정 부채상환여력");
    expect(criticalArea.findings[0].message).toContain("금리상승 가정 부채상환여력");
    expect(criticalArea.findings[0].message).not.toContain("DSCR");

    const dscrCaution = offer();
    dscrCaution.offering.cashFlowReview.annualDebtServiceWon = 55_000_000;
    const cautionReview = evaluateScenarioReview(dscrCaution, [dscrCaution]);
    expect(area(cautionReview, "financing").state).toBe("caution");
    expect(cautionReview.overallState).toBe("caution");
    expect(cautionReview.evidenceLevel).toBe("partial");
  });

  it("대출만기가 목표 회수일보다 빠르면 caution이다", () => {
    const value = offer();
    value.offering.financing.maturityOn = "2027-01-01";
    expect(area(evaluateScenarioReview(value, [value]), "financing").findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "loan-matures-before-target-exit", state: "caution" })]),
    );
  });

  it.each(["fundsSafekeeping", "bankruptcyRemoteness", "rightsAdministration"] as const)(
    "핵심 투자자보호 %s attention은 금융 영역 caution으로 반영한다",
    (key) => {
      const value = offer();
      value.investorProtection[key].status = "attention";
      const review = evaluateScenarioReview(value, [value, settled("history-1", "profit", "on-time")]);
      const financing = area(review, "financing");
      expect(financing.state).toBe("caution");
      expect(review.overallState).toBe("caution");
      expect(financing.findings).toEqual(expect.arrayContaining([
        expect.objectContaining({
          code: "core-investor-protection-attention",
          state: "caution",
          basis: "scenario",
          sourceIds: [],
        }),
      ]));
      const finding = financing.findings.find((item) => item.code === "core-investor-protection-attention")!;
      expect(`${finding.message} ${finding.impact}`).toContain("추가 확인");
      expect(`${finding.message} ${finding.impact}`).not.toContain("공식 확인");
    },
  );

  it("투자자보호 unknown은 critical이 아니라 근거 부족과 다음 질문으로 남긴다", () => {
    const value = offer();
    value.investorProtection.bankruptcyRemoteness.status = "unknown";
    const financing = area(evaluateScenarioReview(value, [value]), "financing");
    expect(financing.state).toBe("insufficient");
    expect(financing.evidenceLevel).toBe("partial");
    const finding = financing.findings.find((item) => item.code === "investor-protection-unknown")!;
    expect(finding).toMatchObject({ state: "insufficient", basis: "scenario", sourceIds: [] });
    expect(finding.nextQuestion).toContain("도산 시 재산 분리 조건");
    expect(financing.findings.every((item) => item.state !== "critical")).toBe(true);
  });

  it("confirmed-in-scenario는 안전 판정이 아니라 입력조건 등록으로만 표시한다", () => {
    const financing = area(evaluateScenarioReview(offer(), [offer()]), "financing");
    const finding = financing.findings.find((item) => item.code === "investor-protection-scenario-input-recorded")!;
    expect(finding).toMatchObject({ state: "no-major-conflict", basis: "scenario", sourceIds: [] });
    expect(finding.message).toContain("상품 화면에 표시");
    expect(finding.impact).toContain("안전성을 판정하지 않습니다");
  });

  it("현재 상품을 제외한 전체 완료 모집단에서 반복 손실·지연을 caution으로만 본다", () => {
    const current = offer();
    const population = [
      current,
      settled("history-1", "loss", "delayed"),
      settled("history-2", "loss", "delayed"),
      settled("history-3", "profit", "on-time"),
    ];
    const history = area(evaluateScenarioReview(current, population), "operator-history");
    expect(history.state).toBe("caution");
    expect(history.findings[0].message).toContain("완료 3건");
    expect(history.findings.every((finding) => finding.state !== "critical")).toBe(true);
  });

  it("승인된 re02의 명백한 자산 주장 차이를 critical 시연으로 유지한다", async () => {
    const population = await loadApprovedScenarios();
    const baseline = population.find((item) => item.scenarioId === "re-scenario-01");
    const current = population.find((item) => item.scenarioId === "re-scenario-02");
    expect(baseline).toBeDefined();
    expect(current).toBeDefined();
    const baselineAsset = area(evaluateScenarioReview(baseline!, population), "asset");
    expect(baselineAsset.findings.filter((item) => item.state === "no-major-conflict"))
      .toHaveLength(1);
    expect(baselineAsset.findings[0]).toMatchObject({ code: "asset-values-matched" });
    for (const label of ["건물명", "주용도", "연면적", "대지면적", "사용승인일"]) {
      expect(baselineAsset.findings[0].message).toContain(label);
    }
    const asset = area(evaluateScenarioReview(current!, population), "asset");
    expect(asset).toMatchObject({ state: "critical" });
    expect(asset.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "asset-value-conflict", state: "critical" }),
      ]),
    );
    expect(asset.findings.find((item) => item.code === "asset-value-conflict")?.message)
      .toContain("연면적");
    expect(asset.findings.some((item) => item.message.includes("gross-floor-area"))).toBe(false);
  });
});
