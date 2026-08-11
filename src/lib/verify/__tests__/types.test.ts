import { describe, expect, test } from "vitest";
import {
  createJudgement,
  diffClaims,
  summarizeVerdicts,
  type Claim,
  type Evidence,
} from "../types";

const doc = (rcpNo: string, submittedOn: string) => ({
  offerId: "bankcow-9",
  rcpNo,
  submittedOn,
});

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: "livestock_trace_no:학산 1호",
  kind: "livestock_trace_no",
  subject: "학산 1호",
  field: "이력번호",
  value: "212786152",
  document: doc("20260806000159", "2026-08-06"),
  location: { section: "8. 기초자산 취득에 관한 사항", table: "개체 명세", row: 1 },
  verifiability: "verifiable",
  ...over,
});

const evidence = (over: Partial<Evidence> = {}): Evidence => ({
  sourceId: "livestock-trace",
  sourceName: "축산물이력제(축산물품질평가원)",
  url: "http://data.ekape.or.kr/openapi-data/service/user/animalTrace/traceNoSearch",
  observedAt: "2026-08-10T01:40:38.382Z",
  field: "이력번호",
  claimed: "212786152",
  observed: "002212786152 (등록 확인)",
  stance: "supports",
  ...over,
});

describe("판정 계약", () => {
  test("근거가 붙은 판정만 생성된다", () => {
    // Arrange
    const backing = [evidence()];

    // Act
    const judgement = createJudgement({
      claim: claim(),
      verdict: "match",
      evidence: backing,
      rationale: "공적 원장에 개체가 등록되어 있습니다.",
    });

    // Assert
    expect(judgement.verdict).toBe("match");
    expect(judgement.evidence).toHaveLength(1);
  });

  test("근거 0건이면 판정 생성이 런타임에서 차단된다", () => {
    expect(() =>
      createJudgement({
        claim: claim(),
        verdict: "match",
        evidence: [],
        rationale: "근거 없는 판정",
      }),
    ).toThrow(/근거/);
  });

  test("자료 부족은 mismatch가 아니라 unverifiable로 남는다", () => {
    const judgement = createJudgement({
      claim: claim(),
      verdict: "unverifiable",
      evidence: [
        evidence({
          stance: "context",
          observed: "조회 결과 개체 없음(빈 응답)",
        }),
      ],
      rationale: "공적 원장에서 조회되지 않아 확인할 수 없습니다.",
    });

    expect(judgement.verdict).toBe("unverifiable");
    expect(judgement.evidence.length).toBeGreaterThan(0);
  });

  test("판정 집계는 3값을 각각 센다", () => {
    const make = (verdict: "match" | "mismatch" | "unverifiable") =>
      createJudgement({
        claim: claim(),
        verdict,
        evidence: [evidence()],
        rationale: "-",
      });

    const summary = summarizeVerdicts([
      make("match"),
      make("match"),
      make("mismatch"),
      make("unverifiable"),
    ]);

    expect(summary).toEqual({
      total: 4,
      match: 2,
      mismatch: 1,
      unverifiable: 1,
    });
  });
});

describe("문서 버전 간 claim diff", () => {
  const v1 = doc("20260806000159", "2026-08-06");
  const v2 = doc("20260901000111", "2026-09-01");

  test("값이 바뀐 필드만 changed로 나온다", () => {
    // Arrange
    const before = [
      claim({ document: v1 }),
      claim({
        id: "acquisition_price:학산 1호",
        kind: "acquisition_price",
        field: "취득원가",
        value: "4574865",
        document: v1,
      }),
    ];
    const after = [
      claim({ document: v2, value: "217935879" }),
      claim({
        id: "acquisition_price:학산 1호",
        kind: "acquisition_price",
        field: "취득원가",
        value: "4574865",
        document: v2,
      }),
    ];

    // Act
    const diff = diffClaims(before, after);

    // Assert
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0]).toMatchObject({
      changeKind: "changed",
      claimId: "livestock_trace_no:학산 1호",
      before: "212786152",
      after: "217935879",
    });
    expect(diff.from.rcpNo).toBe("20260806000159");
    expect(diff.to.rcpNo).toBe("20260901000111");
  });

  test("추가·삭제된 claim을 구분한다", () => {
    const before = [claim({ document: v1 })];
    const after = [
      claim({
        id: "livestock_trace_no:학산 2호",
        subject: "학산 2호",
        value: "214838454",
        document: v2,
      }),
    ];

    const diff = diffClaims(before, after);
    const kinds = diff.changes.map((c) => c.changeKind).sort();

    expect(kinds).toEqual(["added", "removed"]);
  });

  test("변경이 없으면 빈 목록", () => {
    const diff = diffClaims([claim({ document: v1 })], [claim({ document: v2 })]);
    expect(diff.changes).toEqual([]);
  });
});
