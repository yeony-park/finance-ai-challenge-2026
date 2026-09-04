import { describe, expect, test, vi } from "vitest";

import {
  type LoadedReport,
  loadLatestReportOrNull,
  ReportCorruptError,
  ReportNotFoundError,
} from "../load";

const fakeReport = {
  report: { offerId: "livestock-1" },
  fileName: "report-2026.json",
  versionCount: 1,
} as unknown as LoadedReport;

describe("loadLatestReportOrNull — 리포트 없는 게시 공모 방어 가드", () => {
  test("ReportNotFoundError면 던지지 않고 null + 시끄러운 로그", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const loader = (): Promise<LoadedReport> =>
      Promise.reject(new ReportNotFoundError("없음"));

    const result = await loadLatestReportOrNull("art-1", loader);

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "[offers] 리포트 없는 게시 공모 — 카드 생략: art-1",
    );
    errorSpy.mockRestore();
  });

  test("리포트가 있으면 그대로 통과시킨다", async () => {
    const loader = (): Promise<LoadedReport> => Promise.resolve(fakeReport);

    const result = await loadLatestReportOrNull("livestock-1", loader);

    expect(result).toBe(fakeReport);
  });

  test("ReportCorruptError는 삼키지 않고 다시 던진다 (조용한 실패 금지)", async () => {
    const loader = (): Promise<LoadedReport> =>
      Promise.reject(
        new ReportCorruptError("report-x.json", new Error("깨짐")),
      );

    await expect(
      loadLatestReportOrNull("livestock-1", loader),
    ).rejects.toThrow(ReportCorruptError);
  });
});
