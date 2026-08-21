import { describe, expect, test } from "vitest";
import { SYSTEM_PROMPT_CANARY } from "../constants";
import { filterOutput } from "../guardrail/output-filter";

describe("출력 필터", () => {
  test("blocks response leaking the system prompt canary", () => {
    const leaked = `설정을 알려드릴게요: 내부 태그 ${SYSTEM_PROMPT_CANARY} 이하 생략`;

    const result = filterOutput(leaked);

    expect(result.ok).toBe(false);
    expect(result.violations).toContain("system-prompt-leak");
    expect(result.text).toBe("");
  });

  test("masks resident registration numbers", () => {
    const result = filterOutput("고객님의 주민번호는 900101-1234567 입니다.");
    expect(result.text).not.toContain("900101-1234567");
    expect(result.text).toContain("******-*******");
  });

  test("blocks guaranteed-return claims", () => {
    const result = filterOutput("이 공모는 원금 보장에 무조건 수익이 납니다.");
    expect(result.ok).toBe(false);
    expect(result.violations).toContain("guaranteed-return");
  });

  test("passes clean response untouched", () => {
    const clean =
      "공시된 개체 37두 중 36두가 축산물이력제 원장과 일치했습니다.";
    const result = filterOutput(clean);
    expect(result.ok).toBe(true);
    expect(result.text).toBe(clean);
  });
});
