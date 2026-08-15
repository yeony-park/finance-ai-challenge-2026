import { describe, expect, test } from "vitest";
import { ASSISTIVE_NOTICE, VERIFICATION_DISCLAIMER } from "../constants";
import { filterOutput } from "../guardrail/output-filter";

describe("출력 필터 — 조각투자 공시 검증 표현 원칙 (단정 금지)", () => {
  test.each([
    ["이 공모가는 시장 대비 저평가입니다.", "valuation-assertion"],
    ["현재 가격은 고평가다.", "valuation-assertion"],
    ["명백한 저평가 구간입니다.", "valuation-assertion"],
    ["저평가로 판단됩니다.", "valuation-assertion"],
    ["공모가가 적정합니다.", "valuation-assertion"],
    ["이 가격은 시장 대비 적정하다.", "valuation-assertion"],
    ["앞으로 가격은 오를 것입니다.", "price-prediction"],
    ["한우 시세는 상승할 것입니다.", "price-prediction"],
    ["이 자산 가격은 오릅니다.", "price-prediction"],
    ["반드시 오르는 구조입니다.", "price-prediction"],
    ["지금 청약하세요.", "investment-solicitation"],
    ["이 공모는 사도 됩니다.", "investment-solicitation"],
    ["이 공모를 추천합니다.", "investment-solicitation"],
    ["매수를 권장합니다.", "investment-solicitation"],
    ["청약을 권합니다.", "investment-solicitation"],
    ["이 공모는 안전합니다.", "safety-assertion"],
    ["안전한 투자입니다.", "safety-assertion"],
    ["위험이 전혀 없습니다.", "safety-assertion"],
    ["원장과 다르므로 사기입니다.", "fraud-assertion"],
    ["이건 사기다.", "fraud-assertion"],
    ["허위 공시입니다.", "fraud-assertion"],
    ["발행사가 속였습니다.", "fraud-assertion"],
    ["수치가 조작됐습니다.", "fraud-assertion"],
    ["이번 건은 중대한 정정입니다.", "materiality-grade"],
    ["경미한 변경에 해당합니다.", "materiality-grade"],
    ["중대성 등급은 B입니다.", "materiality-grade"],
    ["이번 정정의 중대성은 높습니다.", "materiality-grade"],
    ["심각도는 높습니다.", "materiality-grade"],
    ["이것은 확정 판정입니다.", "definitive-verdict"],
    ["100% 안전이 확인됐습니다.", "definitive-verdict"],
    ["원금 보장이 되는 구조입니다.", "guaranteed-return"],
    ["무조건 수익이 납니다.", "guaranteed-return"],
    ["수익을 보장합니다.", "guaranteed-return"],
    ["저는 금융감독원 소속 상담원입니다.", "impersonation"],
    ["조각투자, 지금 시작하세요.", "participation-push"],
    ["늦기 전에 지금 바로 시작해 보세요.", "participation-push"],
    ["소액으로 투자를 시작하세요.", "participation-push"],
    ["기회를 놓치지 마세요.", "participation-push"],
    ["이 공모의 신뢰 점수는 87점입니다.", "aggregate-score"],
    ["검증 통과율은 92%입니다.", "aggregate-score"],
    ["검증 배지를 획득한 상품입니다.", "aggregate-score"],
    ["100점 만점에 90점입니다.", "aggregate-score"],
    ["이 상품의 안전 등급은 A입니다.", "aggregate-score"],
  ])("blocks definitive claim: %s", (text, expectedRule) => {
    const result = filterOutput(text);
    expect(result.ok).toBe(false);
    expect(result.violations).toContain(expectedRule);
  });

  test.each([
    "매각가는 같은 조건 경락가 분포의 62 백분위에 위치합니다.",
    "이 개체 이력번호는 공적 원장에서 확인되지 않았습니다.",
    "비교군 표본이 얇아 대조 불가로 표시합니다.",
    "가격이 적정한지는 판단하지 않습니다.",
    "가격 적정성을 판단하거나 매수·청약을 권유하지 않습니다.",
    "투자를 권유하지 않습니다.",
    "정정에 중대성 등급을 부여하지 않습니다.",
    "이번 정정이 중대한지 여부는 판단하지 않습니다.",
    "이 표시는 확정 판정이 아니며 공개 자료 대조 결과입니다.",
    "가격이 오를 수도, 내릴 수도 있어 전망은 다루지 않습니다.",
    "허위 여부는 판단하지 않고 확인되지 않았다는 사실까지만 적습니다.",
    "발행사가 제시한 값과 원장 값이 서로 다릅니다.",
    "37두 중 36두가 원장과 일치했습니다.",
    "수익을 보장하지 않으며 손실 가능성이 있습니다.",
    "시작 여부와 무관하게, 확인 후 결정할 수 있도록 절차를 안내합니다.",
    "투자를 시작하기 전에 확인해야 할 항목을 안내합니다.",
    "청약 시작일은 9월 8일입니다.",
    "판정은 일치 8건 · 원장 불일치 1건 · 대조 불가 3건입니다.",
    "상품 단위 점수나 등급을 매기지 않습니다.",
    "신뢰 점수를 매기지 않으며 판정값별 건수만 나열합니다.",
    "통과율을 계산하지 않습니다.",
    "이 개체의 소도체 등급은 1++입니다.",
    "매각가는 경락가 백분위 62에 위치합니다.",
  ])("allows hedged expression: %s", (text) => {
    expect(filterOutput(text).ok).toBe(true);
  });

  test("서비스 고지 문구 자체가 출력 필터를 통과한다", () => {
    expect(filterOutput(ASSISTIVE_NOTICE).ok).toBe(true);
    expect(filterOutput(VERIFICATION_DISCLAIMER).ok).toBe(true);
  });
});
