import { describe, expect, test } from "vitest";

import { loadLatestReplayDiff, parseReplayDiff } from "../amend/replay-load";
import {
  ACTUAL_REPLAY_BADGE,
  SYNTHETIC_REPLAY_BADGE,
  toAmendmentReplayView,
} from "../amend/replay-view";
import type { ReplayDiffArtifact } from "../amend/replay-fixture";

const loadArtifact = async (): Promise<ReplayDiffArtifact> => {
  const artifact = await loadLatestReplayDiff("livestock-9");
  if (!artifact) throw new Error("livestock-9 정정 diff 자료를 찾지 못했습니다");
  return artifact;
};

const SYNTHETIC_FIXTURE = parseReplayDiff({
  kind: "synthetic-amendment-diff",
  offerId: "livestock-9",
  generatedAt: "2026-08-13T17:46:58.162Z",
  disclosure:
    "실제 접수된 정정신고서가 아니라 원문에 합성 편집을 가해 재검증 경로를 시연한 자료입니다.",
  editLabels: ["개체 1호 이력번호 편집"],
  facts: ["값이 달라진 항목 1건"],
  diff: {
    from: {
      offerId: "livestock-9",
      rcpNo: "20260806000159",
      submittedOn: "2026-08-06",
    },
    to: {
      offerId: "livestock-9",
      rcpNo: "20260813900001",
      submittedOn: "2026-08-13",
    },
    changedClaims: [
      {
        changeKind: "changed",
        claimId: "cattle-1-trace",
        subject: "개체 1호",
        field: "이력번호",
        before: "002000000001",
        after: "002000000002",
        verdictBefore: "match",
        verdictAfter: "unverifiable",
        verdictShift: "changed",
      },
    ],
    verdictChanges: [
      {
        claimId: "cattle-1-trace",
        subject: "개체 1호",
        field: "이력번호",
        before: "match",
        after: "unverifiable",
        shift: "changed",
      },
    ],
    summary: {
      changedClaims: 1,
      verdictMaintained: 184,
      verdictChanged: 1,
      verdictUnknown: 0,
      notJudged: 0,
    },
    notes: [],
  },
});

describe("loadLatestReplayDiff — 정정 자료는 파일에서만 온다", () => {
  test("livestock-9는 실제 정정 접수 diff가 최신이다", async () => {
    const artifact = await loadArtifact();

    expect(artifact.kind).toBe("actual-amendment-diff");
    expect(artifact.offerId).toBe("livestock-9");
    expect(artifact.disclosure).toContain("실제 접수된 정정신고서");
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

describe("toAmendmentReplayView — 실제 정정 자료 (repo 데이터)", () => {
  test("접수·재추출·재대조·판정 순서로 4단계를 만든다", async () => {
    const view = toAmendmentReplayView(await loadArtifact());

    expect(view.stages.map((stage) => stage.id)).toEqual([
      "filing",
      "extract",
      "recheck",
      "verdict",
    ]);
  });

  test("실제 접수 기록임을 배지로 밝히고 합성 표기는 쓰지 않는다", async () => {
    const view = toAmendmentReplayView(await loadArtifact());

    expect(view.badge).toBe(ACTUAL_REPLAY_BADGE);
    expect(view.lead).not.toContain("합성");
    expect(view.disclosure).not.toContain("합성");
  });

  test("단계 요약 건수는 diff summary에서 그대로 온다", async () => {
    const artifact = await loadArtifact();
    const view = toAmendmentReplayView(artifact);

    expect(view.stages[1]?.summary).toBe(
      `값이 달라진 항목 ${artifact.diff.summary.changedClaims}건`,
    );
    expect(view.stages[1]?.rows).toHaveLength(artifact.diff.changedClaims.length);
    expect(view.stages[3]?.summary).toBe(
      `판정 유지 ${artifact.diff.summary.verdictMaintained}건 · 변동 ${artifact.diff.summary.verdictChanged}건`,
    );
    expect(view.stages[3]?.rows).toHaveLength(artifact.diff.verdictChanges.length);
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

    for (const banned of ["심각", "위험도", "등급", "경고 수준"]) {
      expect(text).not.toContain(banned);
    }
  });
});

describe("toAmendmentReplayView — 합성 시연 자료 (픽스처)", () => {
  test("합성본임을 리드와 배지에 함께 적는다", () => {
    const view = toAmendmentReplayView(SYNTHETIC_FIXTURE);

    expect(view.lead).toContain("합성");
    expect(view.disclosure).toContain("실제 접수된 정정신고서가 아니라");
    expect(view.badge).toBe(SYNTHETIC_REPLAY_BADGE);
  });

  test("재추출 단계는 값이 달라진 항목만 나열한다", () => {
    const stage = toAmendmentReplayView(SYNTHETIC_FIXTURE).stages[1];

    expect(stage?.summary).toBe("값이 달라진 항목 1건");
    expect(stage?.rows).toHaveLength(1);
    expect(stage?.rows[0]?.detail).toContain("→");
  });

  test("판정 단계는 유지·변동 건수와 변동 항목만 적는다", () => {
    const stage = toAmendmentReplayView(SYNTHETIC_FIXTURE).stages[3];

    expect(stage?.summary).toBe("판정 유지 184건 · 변동 1건");
    expect(stage?.rows).toHaveLength(1);
    expect(stage?.rows[0]?.detail).toBe("일치 → 대조 불가");
  });
});
