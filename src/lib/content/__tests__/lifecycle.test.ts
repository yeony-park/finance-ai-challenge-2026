import { describe, expect, test } from "vitest";

import { filterOutput } from "@/lib/spine/guardrail/output-filter";
import {
  FILING_NOTICE,
  FILING_SECTION_TITLE,
  FILING_SOURCE_PREFIX,
  filingSourceLine,
} from "../filing";
import {
  buildLifecycleStages,
  HOLDING_STAGE_LABELS,
  LIFECYCLE_NOTE,
  LIFECYCLE_TITLE,
  STAGE_NOTE_EXIT_VERIFIED,
  STAGE_NOTE_OPERATING,
  STAGE_NOTE_PENDING,
} from "../lifecycle";

const ALL_COPY: readonly string[] = [
  LIFECYCLE_TITLE,
  LIFECYCLE_NOTE,
  ...Object.values(HOLDING_STAGE_LABELS),
  FILING_SECTION_TITLE,
  FILING_NOTICE,
  FILING_SOURCE_PREFIX,
  filingSourceLine("20260814003572"),
  ...buildLifecycleStages({ phase: "closed", assetKind: "livestock" }).flatMap(
    (stage) => [stage.label, stage.note],
  ),
];

describe("라이프사이클·신고서 정보 카피 — 출력 필터 전건 통과", () => {
  test.each(ALL_COPY.filter((text) => text.length > 0))(
    "필터 통과: %s",
    (text) => {
      const result = filterOutput(text);
      expect(result.violations, text).toEqual([]);
      expect(result.ok).toBe(true);
    },
  );
});

describe("buildLifecycleStages — 단계 파생", () => {
  test("청약 예정: 청약이 현재 단계, 이후는 무표기 대기", () => {
    const stages = buildLifecycleStages({ phase: "upcoming", assetKind: "livestock" });
    expect(stages.map((stage) => stage.state)).toEqual([
      "current",
      "pending",
      "pending",
      "pending",
    ]);
    expect(stages[0]?.note).toBe("예정");
  });

  test("청약 중: 청약이 현재 단계로 진행 중 표기", () => {
    const stages = buildLifecycleStages({ phase: "open", assetKind: "livestock" });
    expect(stages[0]?.state).toBe("current");
    expect(stages[0]?.note).toBe("진행 중");
  });

  test("청약 종료: 이후 단계는 공시 접수 대기로 정직 표기", () => {
    const stages = buildLifecycleStages({ phase: "closed", assetKind: "livestock" });
    expect(stages[0]?.state).toBe("done");
    for (const stage of stages.slice(1)) {
      expect(stage.state).toBe("pending");
      expect(stage.note).toBe(STAGE_NOTE_PENDING);
    }
  });

  test("매각 공시 대조 완료(부동산 사후 대조): 전 단계 완료 + 매각 단계에 대조 근거 표기", () => {
    const stages = buildLifecycleStages({
      phase: "closed",
      assetKind: "real-estate",
      isExitVerified: true,
    });
    expect(stages.every((stage) => stage.state === "done")).toBe(true);
    expect(stages.at(-1)?.note).toBe(STAGE_NOTE_EXIT_VERIFIED);
  });

  test("정산 완료 메타만 있고 외부 종료 검증이 없으면 매각 대조 완료로 올리지 않는다", () => {
    const stages = buildLifecycleStages({
      phase: "closed",
      assetKind: "real-estate",
      assetLifecycle: "settled",
      isExitVerified: false,
    });

    expect(stages.at(-1)).toMatchObject({
      id: "exit",
      state: "pending",
      note: STAGE_NOTE_PENDING,
    });
    expect(stages.at(-1)?.note).not.toBe(STAGE_NOTE_EXIT_VERIFIED);
  });

  test("운영 중 부동산: 청약·배정 완료, 운영 현재, 매각·정산 대기", () => {
    const stages = buildLifecycleStages({
      phase: "closed",
      assetKind: "real-estate",
      assetLifecycle: "operating",
    });

    expect(stages.map((stage) => stage.state)).toEqual([
      "done",
      "done",
      "current",
      "pending",
    ]);
    expect(stages[2]?.note).toBe(STAGE_NOTE_OPERATING);
    expect(stages[2]?.note).toContain("플랫폼 공지 기준");
    expect(stages[3]?.note).toBe(STAGE_NOTE_PENDING);
  });

  test.each(["upcoming", "open"] as const)(
    "운영 메타가 있어도 청약 %s이면 청약·배정을 완료 처리하지 않는다",
    (phase) => {
      const stages = buildLifecycleStages({
        phase,
        assetKind: "real-estate",
        assetLifecycle: "operating",
      });

      expect(stages[0]?.state).toBe("current");
      expect(stages[1]?.state).toBe("pending");
    },
  );

  test("보유 단계 라벨은 자산 종류를 따른다", () => {
    expect(
      buildLifecycleStages({ phase: "open", assetKind: "livestock" })[2]?.label,
    ).toBe(HOLDING_STAGE_LABELS.livestock);
    expect(
      buildLifecycleStages({ phase: "open", assetKind: "real-estate" })[2]?.label,
    ).toBe(HOLDING_STAGE_LABELS["real-estate"]);
  });

  test("단계 수와 순서는 고정이다 — 등급·게이지 없음", () => {
    const stages = buildLifecycleStages({ phase: "open", assetKind: "livestock" });
    expect(stages.map((stage) => stage.id)).toEqual([
      "subscription",
      "allotment",
      "holding",
      "exit",
    ]);
  });
});
