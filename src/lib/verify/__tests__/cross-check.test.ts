import { describe, expect, test } from "vitest";
import { crossCheckClaims } from "../claims/cross-check";
import type { Claim, ClaimKind, DocumentRef } from "../types";

/**
 * 교차검증 채택 규칙의 **계약 테스트**.
 * 주석이 아니라 이 스위트가 규칙의 정본이다 — 규칙을 바꾸려면 여기부터 바꿔야 한다.
 */
const DOCUMENT: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const claimOf = (
  kind: ClaimKind,
  subject: string,
  value: string,
  overrides: Partial<Claim> = {},
): Claim => ({
  id: `${kind}:${subject}`,
  kind,
  subject,
  field: "필드",
  value,
  document: DOCUMENT,
  location: { section: "8. 기초자산 취득에 관한 사항", table: "표", row: 1 },
  verifiability: "verifiable",
  ...overrides,
});

describe("교차검증 — 양쪽이 같은 값", () => {
  test("채택하고 출처를 both로 태깅한다", () => {
    // Arrange
    const rules = [claimOf("livestock_trace_no", "1호", "212786152")];
    const llm = [claimOf("livestock_trace_no", "1호", "212786152")];

    // Act
    const result = crossCheckClaims(rules, llm);

    // Assert
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].verifiability).toBe("verifiable");
    expect(result.claims[0].extractedBy).toBe("both");
    expect(result.entries[0].decision).toBe("agreed");
    expect(result.summary.agreed).toBe(1);
  });

  test("공백 차이는 불일치가 아니다", () => {
    const result = crossCheckClaims(
      [claimOf("custody_location", "1호", "강원도 검증군 가상읍")],
      [claimOf("custody_location", "1호", "강원도  검증군 가상읍 ")],
    );

    expect(result.entries[0].decision).toBe("agreed");
  });
});

describe("교차검증 — 양쪽이 다른 값", () => {
  test("파이프라인을 멈추지 않고 그 필드만 확인 불가로 강등한다", () => {
    // Arrange
    const rules = [
      claimOf("livestock_trace_no", "1호", "212786152"),
      claimOf("acquisition_price", "1호", "4574865"),
    ];
    const llm = [
      claimOf("livestock_trace_no", "1호", "212786152"),
      claimOf("acquisition_price", "1호", "4574000"),
    ];

    // Act
    const result = crossCheckClaims(rules, llm);
    const price = result.claims.find((c) => c.kind === "acquisition_price");
    const trace = result.claims.find((c) => c.kind === "livestock_trace_no");

    // Assert — 강등은 해당 필드에만 적용된다
    expect(price?.verifiability).toBe("cross_check_conflict");
    expect(trace?.verifiability).toBe("verifiable");
    expect(result.claims).toHaveLength(2);
  });

  test("강등 사유에 두 값이 모두 남아 사람이 되짚을 수 있다", () => {
    const result = crossCheckClaims(
      [claimOf("acquisition_date", "1호", "2026-07-14")],
      [claimOf("acquisition_date", "1호", "2026-07-04")],
    );

    expect(result.claims[0].demotionReason).toContain("2026-07-14");
    expect(result.claims[0].demotionReason).toContain("2026-07-04");
    expect(result.demotions[0].claimId).toBe("acquisition_date:1호");
    expect(result.summary.conflict).toBe(1);
  });
});

describe("교차검증 — 한쪽만 있을 때의 보수 채택", () => {
  test("규칙만 있으면 채택하되 출처를 rules로 태깅한다", () => {
    const result = crossCheckClaims([claimOf("livestock_sex", "1호", "수")], []);

    expect(result.claims[0].verifiability).toBe("verifiable");
    expect(result.claims[0].extractedBy).toBe("rules");
    expect(result.entries[0].decision).toBe("rules_only");
    expect(result.summary.rulesOnly).toBe(1);
  });

  test("LLM만 있으면 기록하되 판정은 보류한다", () => {
    const result = crossCheckClaims([], [claimOf("livestock_sex", "1호", "암")]);

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].verifiability).toBe("llm_only");
    expect(result.claims[0].extractedBy).toBe("llm");
    expect(result.claims[0].demotionReason).toContain("교차확인");
    expect(result.summary.llmOnly).toBe(1);
  });

  test("규칙이 스키마 게이트에 걸린 필드는 LLM 값으로 복구하지 않는다", () => {
    // Arrange — 원문이 "12345"라 9자리 게이트에 걸린 상태
    const rules = [
      claimOf("livestock_trace_no", "1호", "12345", {
        verifiability: "unparsed",
        demotionReason: "이력번호는 9자리 숫자여야 합니다",
      }),
    ];
    const llm = [claimOf("livestock_trace_no", "1호", "212786152")];

    // Act
    const result = crossCheckClaims(rules, llm);

    // Assert — 값도 상태도 규칙 쪽 그대로다
    expect(result.claims[0].value).toBe("12345");
    expect(result.claims[0].verifiability).toBe("unparsed");
    expect(result.entries[0].decision).toBe("rules_only");
    expect(result.entries[0].llmValue).toBe("212786152");
  });
});

describe("교차검증 — 결정성", () => {
  test("출력 순서는 규칙 추출 순서 → LLM 단독 순서다", () => {
    const rules = [
      claimOf("livestock_trace_no", "1호", "212786152"),
      claimOf("livestock_breed", "1호", "한우"),
    ];
    const llm = [
      claimOf("livestock_breed", "1호", "한우"),
      claimOf("livestock_sex", "2호", "암"),
    ];

    const result = crossCheckClaims(rules, llm);

    expect(result.claims.map((c) => c.id)).toEqual([
      "livestock_trace_no:1호",
      "livestock_breed:1호",
      "livestock_sex:2호",
    ]);
  });
});
