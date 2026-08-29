import { describe, expect, test } from "vitest";

import { loadFilingFacts } from "../report/filing-facts";

const PIG_OFFER_IDS = ["pig-1", "pig-2", "pig-3"] as const;

const FORBIDDEN_NAME_PATTERN = new RegExp(
  [
    ["데이터", "젠"],
    ["무", "주"],
    ["옥", "산"],
    ["0193", "6340"],
  ]
    .map((parts) => parts.join(""))
    .join("|"),
);

describe("한돈 filing-facts — 스키마·익명화 게이트", () => {
  test.each(PIG_OFFER_IDS)("%s는 filingFacts 스키마로 로드된다", async (offerId) => {
    const facts = await loadFilingFacts(offerId);
    expect(facts, offerId).not.toBeNull();
    expect(facts?.offerId).toBe(offerId);
    expect(facts?.facts.length).toBeGreaterThan(0);
  });

  test.each(PIG_OFFER_IDS)("%s rcpNo는 14자리 공시 좌표로 보존된다", async (offerId) => {
    const facts = await loadFilingFacts(offerId);
    expect(facts?.rcpNo).toMatch(/^\d{14}$/);
  });

  test.each(PIG_OFFER_IDS)("%s에 원문 실명·발행사 corp_code가 남지 않는다", async (offerId) => {
    const facts = await loadFilingFacts(offerId);
    const serialized = JSON.stringify(facts);
    expect(serialized).not.toMatch(FORBIDDEN_NAME_PATTERN);
  });
});
