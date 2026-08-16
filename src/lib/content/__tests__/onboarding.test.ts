import { describe, expect, test } from "vitest";

import { PROFILE_CONCERNS, PROFILE_LEVELS } from "@/components/site/profile";
import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  CATEGORY_ORDER_NOTE,
  CHECK_ORDER_NOTE,
  CHECKLIST_LINK_LABEL,
  CONCERN_OPTIONS,
  CONCERN_QUESTION,
  CONCERN_TAG,
  concernShort,
  INTEREST_HINT,
  INTEREST_QUESTION,
  INTEREST_TAG,
  LEVEL_OPTIONS,
  LEVEL_QUESTION,
  levelShort,
  ONBOARDING_DONE_LABEL,
  ONBOARDING_LEAD,
  ONBOARDING_OPEN_LABEL,
  ONBOARDING_SKIP_LABEL,
  ONBOARDING_TITLE,
  STORAGE_NOTE,
} from "../onboarding";

const ALL_COPY: readonly string[] = [
  ONBOARDING_TITLE,
  ONBOARDING_LEAD,
  LEVEL_QUESTION,
  CONCERN_QUESTION,
  INTEREST_QUESTION,
  INTEREST_HINT,
  STORAGE_NOTE,
  CHECKLIST_LINK_LABEL,
  CONCERN_TAG,
  CHECK_ORDER_NOTE,
  INTEREST_TAG,
  CATEGORY_ORDER_NOTE,
  ONBOARDING_SKIP_LABEL,
  ONBOARDING_DONE_LABEL,
  ONBOARDING_OPEN_LABEL,
  ...LEVEL_OPTIONS.flatMap((option) => [option.label, option.short]),
  ...CONCERN_OPTIONS.flatMap((option) => [option.label, option.short]),
];

describe("온보딩 카피 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY)("필터 통과: %s", (text) => {
    const result = filterOutput(text);
    expect(result.violations, text).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("온보딩 선택지 — 프로파일 어휘와 전단사", () => {
  test("걱정 선택지는 프로파일 걱정 4값을 정확히 한 번씩 덮는다", () => {
    expect(CONCERN_OPTIONS.map((option) => option.concern).sort()).toEqual(
      [...PROFILE_CONCERNS].sort(),
    );
  });

  test("눈높이 선택지는 프로파일 눈높이 2값을 정확히 한 번씩 덮는다", () => {
    expect(LEVEL_OPTIONS.map((option) => option.level).sort()).toEqual(
      [...PROFILE_LEVELS].sort(),
    );
  });

  test("짧은 라벨 조회는 모든 어휘에 대해 원어 코드로 새지 않는다", () => {
    for (const concern of PROFILE_CONCERNS) {
      expect(concernShort(concern)).not.toBe(concern);
    }
    for (const level of PROFILE_LEVELS) {
      expect(levelShort(level)).not.toBe(level);
    }
  });
});
