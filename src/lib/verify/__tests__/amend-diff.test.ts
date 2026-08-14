import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  buildVersionDiff,
  describeVersionDiff,
  versionFromClaims,
  versionFromReport,
  type VersionReportLike,
} from "../amend/diff";
import { applySyntheticEdits } from "../amend/synthetic-version";
import { runExtraction } from "../claims/extract";
import type { Claim, ClaimKind, DocumentRef, Verdict } from "../types";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const BEFORE_DOC: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const AFTER_DOC: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260820000010",
  submittedOn: "2026-08-20",
};

const claim = (
  document: DocumentRef,
  kind: ClaimKind,
  subject: string,
  field: string,
  value: string,
): Claim => ({
  id: `${kind}:${subject}`,
  kind,
  subject,
  field,
  value,
  document,
  location: { section: "8", table: "개체 명세표", row: 1 },
  verifiability: "verifiable",
});

const snapshot = (
  document: DocumentRef,
  entries: readonly { readonly claim: Claim; readonly verdict: Verdict }[],
): VersionReportLike => ({
  document,
  judgements: entries.map((entry) => ({
    verdict: entry.verdict,
    claim: entry.claim,
  })),
  unjudged: [],
});

describe("버전 간 claim diff", () => {
  test("값이 달라진 항목만 변경 목록에 오른다", () => {
    const before = snapshot(BEFORE_DOC, [
      {
        claim: claim(BEFORE_DOC, "acquisition_price", "개체 1호", "취득원가", "4574865"),
        verdict: "match",
      },
      {
        claim: claim(BEFORE_DOC, "livestock_breed", "개체 1호", "품종", "한우"),
        verdict: "match",
      },
    ]);
    const after = snapshot(AFTER_DOC, [
      {
        claim: claim(AFTER_DOC, "acquisition_price", "개체 1호", "취득원가", "4900000"),
        verdict: "match",
      },
      {
        claim: claim(AFTER_DOC, "livestock_breed", "개체 1호", "품종", "한우"),
        verdict: "match",
      },
    ]);

    const diff = buildVersionDiff(versionFromReport(before), versionFromReport(after));

    expect(diff.changedClaims).toHaveLength(1);
    expect(diff.changedClaims[0]).toMatchObject({
      changeKind: "changed",
      field: "취득원가",
      before: "4574865",
      after: "4900000",
      verdictShift: "maintained",
    });
    expect(diff.summary.verdictChanged).toBe(0);
    expect(diff.summary.verdictMaintained).toBe(2);
  });

  test("추가·삭제된 항목을 각각 표시한다", () => {
    const before = snapshot(BEFORE_DOC, [
      {
        claim: claim(BEFORE_DOC, "livestock_trace_no", "개체 1호", "이력번호", "212786152"),
        verdict: "match",
      },
    ]);
    const after = snapshot(AFTER_DOC, [
      {
        claim: claim(AFTER_DOC, "livestock_trace_no", "개체 2호", "이력번호", "214820575"),
        verdict: "match",
      },
    ]);

    const diff = buildVersionDiff(versionFromReport(before), versionFromReport(after));

    expect(diff.changedClaims.map((row) => row.changeKind).sort()).toEqual([
      "added",
      "removed",
    ]);
    expect(diff.summary.verdictMaintained).toBe(0);
  });

  test("판정이 달라진 항목을 유지·변동으로 구분한다", () => {
    const changedClaimBefore = claim(
      BEFORE_DOC,
      "custody_location",
      "개체 24호",
      "보관장소",
      "강원 ○○군",
    );
    const before = snapshot(BEFORE_DOC, [
      { claim: changedClaimBefore, verdict: "match" },
    ]);
    const after = snapshot(AFTER_DOC, [
      {
        claim: claim(AFTER_DOC, "custody_location", "개체 24호", "보관장소", "강원 ○○군"),
        verdict: "mismatch",
      },
    ]);

    const diff = buildVersionDiff(versionFromReport(before), versionFromReport(after));

    expect(diff.changedClaims).toHaveLength(0);
    expect(diff.summary.verdictChanged).toBe(1);
    expect(diff.verdictChanges[0]).toMatchObject({
      subject: "개체 24호",
      before: "match",
      after: "mismatch",
      shift: "changed",
    });
  });

  test("한쪽에 판정이 없으면 유지·변동을 계산하지 않고 정직하게 남긴다", () => {
    const before = snapshot(BEFORE_DOC, [
      {
        claim: claim(BEFORE_DOC, "livestock_breed", "개체 1호", "품종", "한우"),
        verdict: "match",
      },
    ]);
    const after = versionFromClaims(AFTER_DOC, [
      claim(AFTER_DOC, "livestock_breed", "개체 1호", "품종", "육우"),
    ]);

    const diff = buildVersionDiff(versionFromReport(before), after);

    expect(diff.summary.verdictUnknown).toBe(1);
    expect(diff.notes.join(" ")).toContain("유지·변동을 계산하지 않았습니다");
  });
});

describe("알림 문장", () => {
  test("변경 항목 나열과 판정 유지·변동만 담고 등급은 붙이지 않는다", () => {
    const before = snapshot(BEFORE_DOC, [
      {
        claim: claim(BEFORE_DOC, "acquisition_price", "개체 1호", "취득원가", "4574865"),
        verdict: "match",
      },
      {
        claim: claim(BEFORE_DOC, "custody_location", "개체 24호", "보관장소", "강원 ○○군"),
        verdict: "match",
      },
    ]);
    const after = snapshot(AFTER_DOC, [
      {
        claim: claim(AFTER_DOC, "acquisition_price", "개체 1호", "취득원가", "4900000"),
        verdict: "match",
      },
      {
        claim: claim(AFTER_DOC, "custody_location", "개체 24호", "보관장소", "강원 ○○군"),
        verdict: "mismatch",
      },
    ]);

    const lines = describeVersionDiff(
      buildVersionDiff(versionFromReport(before), versionFromReport(after)),
    );
    const text = lines.join("\n");

    expect(text).toContain("값이 달라진 항목 1건");
    expect(text).toContain("개체 1호 취득원가 4574865 → 4900000");
    expect(text).toContain("판정 유지 1건 · 변동 1건");
    expect(text).toContain("개체 24호 보관장소 일치 → 원장 불일치");
    expect(text).not.toMatch(/[A-D]류|중대|경미|위험도|등급/);
  });
});

const RAW_XML_PATH = rawXmlPath(BEFORE_DOC.rcpNo);
const hasRawXml = hasLocalFile(RAW_XML_PATH);

describe.skipIf(!hasRawXml)(
  `합성 정정본 diff — 원문 조작본 ${hasRawXml ? "" : skipReason(RAW_XML_PATH)}`,
  () => {
    test("조작한 항목만 변경 목록에 오른다", async () => {
      const xml = readFileSync(RAW_XML_PATH, "utf8");
      const amendedXml = applySyntheticEdits(xml);
      expect(amendedXml).not.toBe(xml);

      const beforeClaims = await runExtraction(xml, BEFORE_DOC, {
        mode: "rules-only",
      });
      const afterClaims = await runExtraction(amendedXml, AFTER_DOC, {
        mode: "rules-only",
      });

      const diff = buildVersionDiff(
        versionFromClaims(BEFORE_DOC, beforeClaims.claims),
        versionFromClaims(AFTER_DOC, afterClaims.claims),
      );

      const fields = diff.changedClaims.map((row) => row.field);
      expect(fields).toContain("이력번호");
      expect(fields).toContain("취득원가");
      expect(diff.changedClaims.every((row) => row.changeKind === "changed")).toBe(
        true,
      );
      expect(diff.changedClaims.length).toBeLessThan(beforeClaims.claims.length);
    });
  },
);
