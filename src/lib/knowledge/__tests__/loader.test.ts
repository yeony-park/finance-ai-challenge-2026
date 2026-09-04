import { describe, expect, it } from "vitest";

import {
  findLegacyScenarioScope,
  findRoutableLegacyScenario,
  resolveWithin,
  routableLegacyScenarios,
} from "../loader";

describe("knowledge derived registry loader boundaries", () => {
  it("경로 traversal을 거부한다", () => {
    expect(() => resolveWithin("/tmp/data", "../secret.json")).toThrow();
    expect(() => resolveWithin("/tmp/data", "/etc/passwd")).toThrow();
  });

  it("중복 legacy offerId 및 exact scope가 아닌 항목은 첫 값으로 고르지 않는다", () => {
    const scenarios = [
      { categoryId: "real-estate" as const, scenarioId: "a", offerId: "same" },
      { categoryId: "real-estate" as const, scenarioId: "b", offerId: "same" },
      { categoryId: "real-estate" as const, scenarioId: "c", offerId: "unique" },
    ];
    expect(routableLegacyScenarios(scenarios).map((item) => item.offerId)).toEqual(["unique"]);
    expect(findRoutableLegacyScenario(scenarios, "same")).toBeNull();
    expect(findLegacyScenarioScope(scenarios, { categoryId: "real-estate", scenarioId: "b", offerId: "same" }))
      .toEqual(scenarios[1]);
    expect(findLegacyScenarioScope(scenarios, { categoryId: "cattle", scenarioId: "b", offerId: "same" }))
      .toBeNull();
  });
});
