import { describe, expect, test } from "vitest";

import type { OfferEntry } from "../../../components/site/offers";
import { POST_CLOSE_NOTE, scheduleNotes } from "../offer-notes";

const OFFER: OfferEntry = {
  id: "livestock-7",
  title: "가축 7호",
  assetLabel: "가축",
  assetKind: "livestock",
  subscription: {
    opensAt: "2026-02-28T10:00:00+09:00",
    closesAt: "2026-03-30T16:00:00+09:00",
  },
};

const LIVESTOCK_7_RCP_NO = "20260225002022";

describe("scheduleNotes — 청약이 끝난 공모는 사후 대조임을 리포트에 남긴다", () => {
  test("청약 종료 뒤 대조하면 사후 대조 노트를 붙인다", () => {
    const notes = scheduleNotes(LIVESTOCK_7_RCP_NO, new Date("2026-08-14T00:00:00Z"), [
      OFFER,
    ]);

    expect(notes).toEqual([POST_CLOSE_NOTE]);
  });

  test("청약이 진행 중이면 노트를 붙이지 않는다", () => {
    const notes = scheduleNotes(LIVESTOCK_7_RCP_NO, new Date("2026-03-01T00:00:00Z"), [
      OFFER,
    ]);

    expect(notes).toEqual([]);
  });

  test("등록되지 않은 접수번호는 노트 없이 넘어간다", () => {
    expect(
      scheduleNotes("20200101000001", new Date("2026-08-14T00:00:00Z"), [OFFER]),
    ).toEqual([]);
  });
});
