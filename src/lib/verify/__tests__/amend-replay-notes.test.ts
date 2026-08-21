import { describe, expect, test } from "vitest";

import { replayDisclosureOf, replayRunNoteOf } from "../amend/replay-notes";

describe("replayDisclosureOf — 청약 상태에 맞는 고지만 쓴다", () => {
  test("종료된 공모는 사후 대조 문안을 유지한다 (7·8호 기존 산출물과 동일)", () => {
    expect(replayDisclosureOf(3, "closed")).toBe(
      "청약이 종료된 공모를 사후에 대조한 기록입니다 — 실제 접수된 정정신고서 3건 가운데 최종 정정본을 원 신고서와 같은 절차로 각각 다시 대조했고, 개체 원장 조회는 대조 실행 시각 기준입니다.",
    );
  });

  test("종료 전 공모에는 종료 단정을 쓰지 않는다", () => {
    const disclosure = replayDisclosureOf(1, "open");

    expect(disclosure).not.toContain("청약이 종료된");
    expect(disclosure).not.toContain("사후");
    expect(disclosure).toContain("정정신고서 1건");
    expect(disclosure).toContain("대조 실행 시각 기준");
  });
});

describe("replayRunNoteOf — 원장 조회 시점 주의는 상태별 문안으로 남긴다", () => {
  test("종료된 공모는 청약 당시 대비 주의를 유지한다", () => {
    expect(replayRunNoteOf("closed")).toBe(
      "청약이 종료된 공모라 두 버전 모두 지금 시점의 원장과 대조했습니다 — 청약 당시의 원장 상태와는 다를 수 있습니다.",
    );
  });

  test("종료 전 공모는 제출 당시 대비 주의로 쓴다", () => {
    const note = replayRunNoteOf("open");

    expect(note).not.toContain("청약이 종료된");
    expect(note).toContain("대조 실행 시점의 원장");
    expect(note).toContain("다를 수 있습니다");
  });
});
