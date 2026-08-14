import { describe, expect, test } from "vitest";

import { loadLatestReplayDiff, parseReplayDiff } from "../amend/replay-load";
import { toAmendmentReplayView } from "../amend/replay-view";
import type { ReplayDiffArtifact } from "../amend/replay-fixture";

const loadArtifact = async (): Promise<ReplayDiffArtifact> => {
  const artifact = await loadLatestReplayDiff("livestock-9");
  if (!artifact) throw new Error("합성 정정 diff 자료를 찾지 못했습니다");
  return artifact;
};

describe("loadLatestReplayDiff — 합성 정정 자료는 파일에서만 온다", () => {
  test("공개 자료가 있는 공모는 최신 diff를 읽는다", async () => {
    const artifact = await loadArtifact();

    expect(artifact.kind).toBe("synthetic-amendment-diff");
    expect(artifact.offerId).toBe("livestock-9");
    expect(artifact.disclosure).toContain("합성");
  });

  test("자료가 없는 공모는 undefined를 돌려준다", async () => {
    expect(await loadLatestReplayDiff("real-estate-a")).toBeUndefined();
  });

  test("형식이 어긋난 자료는 조용히 넘어가지 않는다", () => {
    expect(() => parseReplayDiff({ kind: "synthetic-amendment-diff" })).toThrow(
      /형식이 올바르지 않습니다/,
    );
  });
});

describe("toAmendmentReplayView — 4단계는 diff에서 파생된다", () => {
  test("접수·재추출·재대조·판정 순서로 4단계를 만든다", async () => {
    const view = toAmendmentReplayView(await loadArtifact());

    expect(view.stages.map((stage) => stage.id)).toEqual([
      "filing",
      "extract",
      "recheck",
      "verdict",
    ]);
  });

  test("합성본임을 리드와 고지 문구에 함께 적는다", async () => {
    const view = toAmendmentReplayView(await loadArtifact());

    expect(view.lead).toContain("합성 시연");
    expect(view.disclosure).toContain("실제 접수된 정정신고서가 아니라");
    expect(view.badge).toBe("합성 시연");
  });

  test("재추출 단계는 값이 달라진 항목만 나열한다", async () => {
    const artifact = await loadArtifact();
    const stage = toAmendmentReplayView(artifact).stages[1];

    expect(stage?.summary).toBe(
      `값이 달라진 항목 ${artifact.diff.summary.changedClaims}건`,
    );
    expect(stage?.rows).toHaveLength(artifact.diff.changedClaims.length);
    expect(stage?.rows[0]?.detail).toContain("→");
  });

  test("판정 단계는 유지·변동 건수와 변동 항목만 적는다", async () => {
    const artifact = await loadArtifact();
    const stage = toAmendmentReplayView(artifact).stages[3];

    expect(stage?.summary).toBe(
      `판정 유지 ${artifact.diff.summary.verdictMaintained}건 · 변동 ${artifact.diff.summary.verdictChanged}건`,
    );
    expect(stage?.rows).toHaveLength(artifact.diff.verdictChanges.length);
    expect(stage?.rows[0]?.detail).toBe("일치 → 대조 불가");
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
});
