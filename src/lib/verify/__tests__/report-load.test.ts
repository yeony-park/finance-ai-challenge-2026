import { describe, expect, test } from "vitest";
import { loadLatestReport, pickLatestFileName } from "../report/load";
import { parseReportSnapshot } from "../report/snapshot";

describe("pickLatestFileName — 리포트 버전링에서 최신 1건 선택", () => {
  test("report-*.json 중 파일명(ISO 시각) 사전순 최대값을 고른다", () => {
    // Arrange
    const files = [
      "report-2026-08-11T16-02-04-683Z.json",
      "report-2026-08-11T16-06-25-434Z.json",
      "report-2026-08-11T16-04-40-307Z.json",
    ];

    // Act
    const latest = pickLatestFileName(files);

    // Assert
    expect(latest).toBe("report-2026-08-11T16-06-25-434Z.json");
  });

  test("리포트가 아닌 파일은 무시한다", () => {
    expect(
      pickLatestFileName([".gitkeep", "notes.md", "report-2026-01-01T00-00-00-000Z.json"]),
    ).toBe("report-2026-01-01T00-00-00-000Z.json");
  });

  test("리포트가 없으면 undefined", () => {
    expect(pickLatestFileName(["README.md"])).toBeUndefined();
  });
});

describe("loadLatestReport — 스냅샷 JSON 로딩 (읽기 전용)", () => {
  test("뱅카우 9호 최신 리포트를 엔진 계약대로 읽는다", async () => {
    // Act
    const loaded = await loadLatestReport("livestock-9");

    // Assert
    expect(loaded.report.offerId).toBe("livestock-9");
    expect(loaded.report.bySubject).toHaveLength(37);
    expect(loaded.report.judgements.length).toBeGreaterThan(0);
    expect(loaded.report.unjudged.length).toBeGreaterThan(0);
    expect(loaded.fileName).toMatch(/^report-.*\.json$/);
    expect(loaded.versionCount).toBeGreaterThanOrEqual(1);
  });

  test("리포트가 없는 공모는 사람이 읽을 수 있는 오류를 던진다", async () => {
    await expect(loadLatestReport("no-such-offer")).rejects.toThrow(
      /리포트를 찾을 수 없습니다/,
    );
  });
});

describe("parseReportSnapshot — 경계 검증", () => {
  test("근거 0건 판정이 담긴 JSON은 거부한다", () => {
    // Arrange
    const broken = {
      offerId: "x",
      document: { offerId: "x", rcpNo: "20260806000159", submittedOn: "2026-08-06" },
      generatedAt: "2026-08-11T16:06:25.434Z",
      mode: "fake",
      sources: [],
      summary: { total: 1, match: 1, mismatch: 0, unverifiable: 0 },
      bySubject: [{ subject: "학산 1호", verdict: "match", judgementCount: 1 }],
      judgements: [
        {
          verdict: "match",
          claim: {
            id: "livestock_breed:학산 1호",
            kind: "livestock_breed",
            subject: "학산 1호",
            field: "품종",
            value: "한우",
            document: {
              offerId: "x",
              rcpNo: "20260806000159",
              submittedOn: "2026-08-06",
            },
            location: { section: "8", table: "명세표", row: 1 },
            verifiability: "verifiable",
          },
          evidence: [],
          rationale: "근거 없음",
        },
      ],
      unjudged: [],
      notes: [],
    };

    // Act + Assert
    expect(() => parseReportSnapshot(broken)).toThrow(/리포트 스냅샷/);
  });
});
