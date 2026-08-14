import { describe, expect, test } from "vitest";

import { loadLatestReplayDiff, parseReplayDiff } from "../amend/replay-load";
import type { ActualReplayDiffArtifact } from "../amend/replay-fixture";
import {
  ACTUAL_REPLAY_BADGE,
  highlightSegments,
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

describe("정정 전·후 발췌 — correctionDetails가 행 diff로 실린다", () => {
  const DOC = { offerId: "livestock-7", rcpNo: "20260203000427", submittedOn: "2026-02-03" };
  const EMPTY_DIFF = {
    from: DOC,
    to: { ...DOC, rcpNo: "20260225002022", submittedOn: "2026-02-25" },
    changedClaims: [],
    verdictChanges: [],
    summary: {
      changedClaims: 0,
      verdictMaintained: 0,
      verdictChanged: 0,
      verdictUnknown: 0,
      notJudged: 0,
    },
    notes: [],
  };

  const artifactWith = (
    details: readonly {
      label: string;
      isOrderRelated: boolean;
      before: string;
      after: string;
      isExcerpt: boolean;
    }[] | undefined,
  ): ActualReplayDiffArtifact => ({
    kind: "actual-amendment-diff",
    offerId: "livestock-7",
    generatedAt: "2026-08-15T00:00:00.000Z",
    disclosure: "고지",
    sourceName: "출처",
    facts: [],
    diff: EMPTY_DIFF,
    filings: [
      {
        rcpNo: "20260203000427",
        receivedOn: "2026-02-03",
        role: "base",
        reportLabel: "증권신고서",
        isRechecked: true,
        correctionReason: "",
        correctionItems: [],
        correctionNotes: [],
      },
      {
        rcpNo: "20260225002022",
        receivedOn: "2026-02-25",
        role: "amendment",
        reportLabel: "[기재정정]증권신고서",
        isRechecked: true,
        correctionReason: "요구 정정",
        correctionItems: ["4. 모집 일정"],
        ...(details === undefined ? {} : { correctionDetails: details }),
        correctionNotes: [],
      },
    ],
  });

  test("전·후 발췌가 있으면 행에 diff가 붙는다", () => {
    const view = toAmendmentReplayView(
      artifactWith([
        {
          label: "4. 모집 일정",
          isOrderRelated: false,
          before: "청약기일 2026년 2월 20일",
          after: "청약기일 2026년 3월 5일",
          isExcerpt: true,
        },
      ]),
    );

    const itemRow = view.stages[0]?.rows.find((row) => row.diff !== undefined);
    expect(itemRow?.diff?.before).toContain("2월 20일");
    expect(itemRow?.diff?.after).toContain("3월 5일");
    expect(itemRow?.diff?.sourceNote).toContain("원문 발췌");
  });

  test("구버전 자료(correctionDetails 없음)는 diff 없이 항목만 나열한다", () => {
    const view = toAmendmentReplayView(artifactWith(undefined));

    const rows = view.stages[0]?.rows ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.diff === undefined)).toBe(true);
  });

  test("전·후가 모두 빈 항목에는 diff를 붙이지 않는다", () => {
    const view = toAmendmentReplayView(
      artifactWith([
        { label: "4. 모집 일정", isOrderRelated: false, before: "", after: "", isExcerpt: false },
      ]),
    );

    const rows = view.stages[0]?.rows ?? [];
    expect(rows.every((row) => row.diff === undefined)).toBe(true);
  });
});

describe("highlightSegments — 전·후 발췌에서 달라진 구간만 표시한다", () => {
  test("공통 접두·접미부 사이의 변경 구간을 표시한다", () => {
    const before = "청약기일은 2026년 2월 20일까지입니다.";
    const after = "청약기일은 2026년 3월 5일까지입니다.";

    const segs = highlightSegments(before, after);
    const changed = segs.filter((seg) => seg.isChanged).map((seg) => seg.text);
    expect(changed.join("")).toContain("2월 20");
    expect(segs.map((seg) => seg.text).join("")).toBe(before);
  });

  test("공통부가 거의 없으면(신설 등) 전체를 강조하지 않는다", () => {
    const segs = highlightSegments("(신설)", "완전히 새로 들어간 위험 조항 본문");
    expect(segs).toEqual([{ text: "(신설)", isChanged: false }]);
  });

  test("한쪽이 비어 있으면 그대로 둔다", () => {
    expect(highlightSegments("", "본문")).toEqual([]);
    expect(highlightSegments("본문", "")).toEqual([
      { text: "본문", isChanged: false },
    ]);
  });

  test("행 diff에 세그먼트가 함께 실린다", () => {
    const view = toAmendmentReplayView(
      {
        kind: "actual-amendment-diff",
        offerId: "livestock-7",
        generatedAt: "2026-08-15T00:00:00.000Z",
        disclosure: "고지",
        sourceName: "출처",
        facts: [],
        diff: {
          from: { offerId: "livestock-7", rcpNo: "20260203000427", submittedOn: "2026-02-03" },
          to: { offerId: "livestock-7", rcpNo: "20260225002022", submittedOn: "2026-02-25" },
          changedClaims: [],
          verdictChanges: [],
          summary: {
            changedClaims: 0,
            verdictMaintained: 0,
            verdictChanged: 0,
            verdictUnknown: 0,
            notJudged: 0,
          },
          notes: [],
        },
        filings: [
          {
            rcpNo: "20260225002022",
            receivedOn: "2026-02-25",
            role: "amendment",
            reportLabel: "[기재정정]증권신고서",
            isRechecked: true,
            correctionReason: "요구 정정",
            correctionItems: ["일정"],
            correctionDetails: [
              {
                label: "일정",
                isOrderRelated: false,
                before: "청약기일은 2월 20일입니다",
                after: "청약기일은 3월 5일입니다",
                isExcerpt: true,
              },
            ],
            correctionNotes: [],
          },
        ],
      },
    );

    const row = view.stages[0]?.rows.find((item) => item.diff !== undefined);
    expect(row?.diff?.beforeSegments.some((seg) => seg.isChanged)).toBe(true);
    expect(row?.diff?.afterSegments.some((seg) => seg.isChanged)).toBe(true);
  });
});
