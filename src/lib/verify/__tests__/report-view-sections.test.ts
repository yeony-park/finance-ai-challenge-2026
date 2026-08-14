import { describe, expect, test } from "vitest";
import { loadLatestReport } from "../report/load";
import { buildReportContext } from "../report/view-model/context";
import { buildHistorySection } from "../report/view-model/history-section";
import { buildPriceSection } from "../report/view-model/price-section";
import { assignSubjectNos } from "../report/view-model/subject-cards";
import type { ReportContext } from "../report/view-model/context";

const buildContext = async (): Promise<ReportContext> =>
  buildReportContext(await loadLatestReport("livestock-9"));

describe("assignSubjectNos — 개체 번호는 이름에서 읽되 겹치지 않는다", () => {
  test("이름의 번호를 그대로 쓴다", () => {
    const subjects = ["학산 1호", "학산 24호", "학산 37호"];

    const nos = assignSubjectNos(subjects);

    expect(nos).toEqual([1, 24, 37]);
  });

  test("이름에 번호가 없으면 아직 쓰이지 않은 번호를 받는다", () => {
    const nos = assignSubjectNos(["미상 개체", "학산 1호", "미상 개체"]);

    expect(nos).toEqual([2, 1, 3]);
  });

  test("같은 번호가 두 번 나오면 뒤 개체를 빈 번호로 민다", () => {
    const nos = assignSubjectNos(["학산 2호", "학산 2호", "학산 3호"]);

    expect(nos).toEqual([2, 1, 3]);
    expect(new Set(nos).size).toBe(nos.length);
  });

  test("개체가 몇이든 번호는 유일하다", async () => {
    const ctx = await buildContext();
    const nos = ctx.subjects.map((subject) => subject.no);

    expect(new Set(nos).size).toBe(nos.length);
  });
});

describe("목록 항목은 안정 id를 갖는다 (자유 텍스트를 key로 쓰지 않는다)", () => {
  test("② 가격 위치 항목 id가 유일하다", async () => {
    const items = buildPriceSection(await buildContext()).items;

    expect(items.length).toBeGreaterThan(0);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  test("③ 이행 이력 항목 id가 유일하고 엔진 note를 순번으로 구분한다", async () => {
    const ctx = await buildContext();
    const items = buildHistorySection(ctx).items;

    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(items.filter((item) => item.id.startsWith("engine-note-"))).toHaveLength(
      ctx.report.notes.length,
    );
  });

});
