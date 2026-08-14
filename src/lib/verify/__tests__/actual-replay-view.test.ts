import { describe, expect, test } from "vitest";

import { loadLatestReplayDiff, parseReplayDiff } from "../amend/replay-load";
import type { ActualReplayDiffArtifact } from "../amend/replay-fixture";
import {
  ACTUAL_REPLAY_BADGE,
  SYNTHETIC_REPLAY_BADGE,
  toAmendmentReplayView,
} from "../amend/replay-view";

const loadArtifact = async (): Promise<ActualReplayDiffArtifact> => {
  const artifact = await loadLatestReplayDiff("livestock-7");
  if (!artifact) throw new Error("실제 정정 diff 자료를 찾지 못했습니다");
  if (artifact.kind !== "actual-amendment-diff") {
    throw new Error(`실제 정정 자료가 아닙니다: ${artifact.kind}`);
  }
  return artifact;
};

describe("loadLatestReplayDiff — 실제 정정 자료도 같은 규약으로 읽는다", () => {
  test("실제 정정 자료는 접수 계보를 함께 담는다", async () => {
    const artifact = await loadArtifact();

    expect(artifact.offerId).toBe("livestock-7");
    expect(artifact.filings.filter((filing) => filing.role === "base")).toHaveLength(1);
    expect(
      artifact.filings.filter((filing) => filing.role === "amendment").length,
    ).toBeGreaterThanOrEqual(2);
  });

  test("정정본마다 신고서에 적힌 정정 항목이 붙어 있다", async () => {
    const artifact = await loadArtifact();
    const amendments = artifact.filings.filter(
      (filing) => filing.role === "amendment",
    );

    for (const amendment of amendments) {
      expect(amendment.correctionItems.length).toBeGreaterThan(0);
    }
  });

  test("접수번호와 접수일 형식이 규약대로다", async () => {
    const artifact = await loadArtifact();

    for (const filing of artifact.filings) {
      expect(filing.rcpNo).toMatch(/^\d{14}$/);
      expect(filing.receivedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("계보 항목이 빠진 자료는 조용히 넘어가지 않는다", () => {
    expect(() => parseReplayDiff({ kind: "actual-amendment-diff" })).toThrow(
      /형식이 올바르지 않습니다/,
    );
  });
});

describe("toAmendmentReplayView — 실제 정정은 합성 시연과 다르게 표시된다", () => {
  test("합성 시연 배지 대신 실제 접수 기록 배지를 단다", async () => {
    const view = toAmendmentReplayView(await loadArtifact());

    expect(view.badge).toBe(ACTUAL_REPLAY_BADGE);
    expect(view.badge).not.toBe(SYNTHETIC_REPLAY_BADGE);
    expect(view.lead).not.toContain("합성");
  });

  test("접수 단계는 정정 접수일과 정정 항목을 나열한다", async () => {
    const artifact = await loadArtifact();
    const stage = toAmendmentReplayView(artifact).stages[0];
    const items = artifact.filings.flatMap((filing) => filing.correctionItems);

    expect(stage?.id).toBe("filing");
    expect(stage?.summary).toContain("정정신고서");
    for (const item of items) {
      expect(stage?.rows.some((row) => row.detail === item)).toBe(true);
    }
  });

  test("개체 명세가 그대로면 그 사실을 재추출 단계에 적는다", async () => {
    const artifact = await loadArtifact();
    const stage = toAmendmentReplayView(artifact).stages[1];

    expect(stage?.summary).toBe(
      `값이 달라진 항목 ${artifact.diff.summary.changedClaims}건`,
    );
    if (artifact.diff.summary.changedClaims === 0) {
      expect(stage?.emptyText).toContain("개체 명세표에서 값이 달라진 항목은 없습니다");
    }
  });

  test("화면 금지 용어와 중대성 등급 표현이 들어가지 않는다", async () => {
    const view = toAmendmentReplayView(await loadArtifact());
    const text = [
      view.heading,
      view.lead,
      view.badge,
      view.disclosure,
      ...view.stages.flatMap((stage) => [
        stage.name,
        stage.title,
        stage.summary,
        stage.emptyText ?? "",
        ...stage.rows.map((row) => `${row.label} ${row.detail}`),
      ]),
    ].join(" ");

    for (const banned of ["불일치", "심각", "위험도", "등급", "경고 수준"]) {
      expect(text).not.toContain(banned);
    }
  });

  test("공개 자료에 발행사명·플랫폼명이 남지 않는다", async () => {
    const artifact = await loadArtifact();
    const serialized = JSON.stringify(artifact);

    for (const banned of ["스탁키퍼", "뱅카우", "bancow"]) {
      expect(serialized).not.toContain(banned);
    }
  });
});
