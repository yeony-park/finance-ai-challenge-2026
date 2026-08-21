import { describe, expect, test } from "vitest";
import { scoreAgainstPrelabels, scoreExtraction } from "../goldset/score";
import { goldSetSchema, isScorable, type GoldSet } from "../goldset/types";
import type { Claim, ClaimKind, DocumentRef } from "../types";

const DOCUMENT: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const claim = (kind: ClaimKind, subject: string, value: string): Claim => ({
  id: `${kind}:${subject}`,
  kind,
  subject,
  field: kind,
  value,
  document: DOCUMENT,
  location: { section: "8. 기초자산 취득에 관한 사항", table: "표", row: 1 },
  verifiability: "verifiable",
});

const goldset = (
  labels: readonly {
    readonly kind: ClaimKind;
    readonly subject: string;
    readonly value: string;
    readonly review: GoldSet["labels"][number]["review"];
  }[],
): GoldSet =>
  goldSetSchema.parse({
    offerId: "livestock-9",
    rcpNo: "20260806000159",
    generatedAt: "2026-08-13T00:00:00.000Z",
    prelabeledBy: "extract-rules",
    reviewer: "검수자",
    labels: labels.map((label) => ({
      subject: label.subject,
      kind: label.kind,
      field: label.kind,
      value: label.value,
      prelabeledValue: label.value,
      row: 1,
      section: "8. 기초자산 취득에 관한 사항",
      review: label.review,
      note: "",
    })),
  });

describe("골드셋 채점", () => {
  test("검수를 마치지 않은 라벨은 분모에서 빠지고 그 수가 보고된다", () => {
    const gold = goldset([
      { kind: "livestock_trace_no", subject: "1호", value: "212786152", review: "confirmed" },
      { kind: "livestock_trace_no", subject: "2호", value: "214838454", review: "pending" },
    ]);

    const result = scoreExtraction(gold, [
      claim("livestock_trace_no", "1호", "212786152"),
    ]);

    expect(result.breakdown.skippedPending).toBe(1);
    expect(result.breakdown.truePositive).toBe(1);
    expect(result.breakdown.f1).toBe(1);
  });

  test("값이 다르면 FP와 FN 양쪽에 든다", () => {
    const gold = goldset([
      { kind: "acquisition_price", subject: "1호", value: "4574865", review: "corrected" },
    ]);

    const result = scoreExtraction(gold, [
      claim("acquisition_price", "1호", "4574000"),
    ]);

    expect(result.breakdown.truePositive).toBe(0);
    expect(result.breakdown.falsePositive).toBe(1);
    expect(result.breakdown.falseNegative).toBe(1);
    expect(result.mismatches[0].kind).toBe("wrong_value");
  });

  test("골드에 없는 값을 만들어내면 FP다", () => {
    const gold = goldset([
      { kind: "livestock_breed", subject: "1호", value: "한우", review: "confirmed" },
    ]);

    const result = scoreExtraction(gold, [
      claim("livestock_breed", "1호", "한우"),
      claim("livestock_breed", "유령 9호", "한우"),
    ]);

    expect(result.breakdown.truePositive).toBe(1);
    expect(result.breakdown.falsePositive).toBe(1);
    expect(result.mismatches.map((m) => m.kind)).toEqual(["spurious"]);
    expect(result.breakdown.recall).toBe(1);
    expect(result.breakdown.precision).toBe(0.5);
  });

  test("빠뜨리면 FN이다", () => {
    const gold = goldset([
      { kind: "livestock_sex", subject: "1호", value: "수", review: "confirmed" },
    ]);

    const result = scoreExtraction(gold, []);

    expect(result.breakdown.falseNegative).toBe(1);
    expect(result.breakdown.f1).toBe(0);
    expect(result.mismatches[0].kind).toBe("missing");
  });

  test("검수 상태가 측정 가능 여부를 가른다", () => {
    const gold = goldset([
      { kind: "livestock_sex", subject: "1호", value: "수", review: "confirmed" },
      { kind: "livestock_sex", subject: "2호", value: "암", review: "corrected" },
      { kind: "livestock_sex", subject: "3호", value: "", review: "not_in_doc" },
      { kind: "livestock_sex", subject: "4호", value: "수", review: "pending" },
    ]);

    expect(gold.labels.map(isScorable)).toEqual([true, true, false, false]);
  });
});

describe("선라벨 대비 참고치 — 정식 점수와 섞이지 않는다", () => {
  test("미검수 라벨도 기준에 넣는다 (정식 점수는 같은 입력에서 0건 측정)", () => {
    const gold = goldset([
      { kind: "livestock_trace_no", subject: "1호", value: "212786152", review: "pending" },
      { kind: "livestock_trace_no", subject: "2호", value: "214838454", review: "pending" },
    ]);
    const predicted = [
      claim("livestock_trace_no", "1호", "212786152"),
      claim("livestock_trace_no", "2호", "999999999"),
    ];

    const official = scoreExtraction(gold, predicted);
    const reference = scoreAgainstPrelabels(gold, predicted);

    expect(official.breakdown.truePositive).toBe(0);
    expect(official.breakdown.skippedPending).toBe(2);
    expect(reference.breakdown.truePositive).toBe(1);
    expect(reference.breakdown.exactMatch).toBe(0.5);
    expect(reference.breakdown.skippedPending).toBe(0);
  });

  test("기준은 검수값이 아니라 선라벨값이다", () => {
    const gold = goldSetSchema.parse({
      offerId: "livestock-9",
      rcpNo: "20260806000159",
      generatedAt: "2026-08-13T00:00:00.000Z",
      prelabeledBy: "extract-rules",
      reviewer: "검수자",
      labels: [
        {
          subject: "1호",
          kind: "acquisition_price",
          field: "취득원가",
          value: "4574865",
          prelabeledValue: "4574000",
          row: 1,
          section: "8. 기초자산 취득에 관한 사항",
          review: "corrected",
          note: "",
        },
      ],
    });

    const reference = scoreAgainstPrelabels(gold, [
      claim("acquisition_price", "1호", "4574000"),
    ]);

    expect(reference.breakdown.truePositive).toBe(1);
    expect(scoreExtraction(gold, [claim("acquisition_price", "1호", "4574000")])
      .breakdown.truePositive).toBe(0);
  });
});
