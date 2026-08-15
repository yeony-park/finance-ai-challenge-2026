import { describe, expect, test } from "vitest";
import { loadLatestReport } from "../report/load";
import type { DemoView, RichText } from "../report/view-model";
import { toDemoView } from "../report/view-model";

const buildView = async (): Promise<DemoView> => {
  const loaded = await loadLatestReport("livestock-9");
  return toDemoView(loaded);
};

const plain = (rich: RichText): string => rich.map((part) => part.text).join("");

describe("toDemoView — 판정 집계는 엔진 산출에서만 나온다", () => {
  test("개체 단위 집계는 bySubject 롤업과 같다", async () => {
    const view = await buildView();

    expect(view.verdict.tallies.map((t) => [t.label, t.value])).toEqual([
      ["일치", 36],
      ["원장 불일치", 1],
      ["대조 불가", 0],
    ]);
  });

  test("항목 단위 집계는 미판정 건수까지 함께 표시한다", async () => {
    const view = await buildView();

    expect(view.verdict.itemLine).toContain("185건");
    expect(view.verdict.itemLine).toContain("일치 183");
    expect(view.verdict.itemLine).toContain("원장 불일치 1");
    expect(view.verdict.itemLine).toContain("대조 불가 1");
    expect(view.verdict.itemLine).toContain("미판정 1");
    expect(view.verdict.itemLine).toContain("가격 위치 제시 36");
  });

  test("한 줄 요약은 두 수준 모두 위치 제시와 대조 불가를 함께 말한다", async () => {
    const view = await buildView();

    for (const level of ["easy", "pro"] as const) {
      const text = plain(view.verdict.oneLiner[level]);
      expect(text).toContain("36");
      expect(text).toContain("37");
      expect(text).toMatch(/대조 불가|확인되지 않/);
      expect(text).toContain("적정성 판단이 아닙니다");
    }
  });

  test("단정 표현(허위·사기)은 어떤 문구에도 없다", async () => {
    const view = await buildView();
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain("허위");
    expect(serialized).not.toContain("사기");
    expect(serialized).not.toContain("조작");
  });
});

describe("toDemoView — 개체 카드와 드릴다운", () => {
  test("개체 카드 37장이 번호 순으로 만들어진다", async () => {
    const view = await buildView();

    expect(view.reality.subjects).toHaveLength(37);
    expect(view.reality.subjects[0]?.no).toBe(1);
    expect(view.reality.subjects[36]?.no).toBe(37);
  });

  test("24호만 원장 불일치 뱃지를 갖고 근거 카드로 연결된다", async () => {
    const view = await buildView();
    const flagged = view.reality.subjects.filter((s) => s.verdict !== "match");

    expect(flagged.map((s) => s.no)).toEqual([24]);
    expect(flagged[0]?.badge).toBe("원장 불일치");
    expect(flagged[0]?.hasFocus).toBe(true);
    expect(view.reality.focuses.map((f) => f.no)).toEqual([24]);
  });

  test("근거 카드 좌열은 신고서 기재값(마스킹)이다", async () => {
    const view = await buildView();
    const focus = view.reality.focuses[0];
    const rows = new Map(focus?.claimRows.map((r) => [r.label, r.value]));

    expect(rows.get("이력번호")).toBe("21●●●●●79");
    expect(rows.get("취득시기")).toBe("2026. 7. 28.");
    expect(rows.get("보관장소")).toBe("강원 ○○군");
    expect(rows.get("취득원가")).toBe("4,719,865원");
  });

  test("근거 카드 우열은 원장 관측값이며 원장 불일치 항목이 강조된다", async () => {
    const view = await buildView();
    const focus = view.reality.focuses[0];
    const rows = focus?.ledgerRows ?? [];
    const custody = rows.find((r) => r.label === "현재 사육지");

    expect(custody?.value).toContain("경북 ○○시");
    expect(custody?.isAlert).toBe(true);
    expect(rows.find((r) => r.label === "개체 존재")?.value).toContain("한우");
    expect(rows.find((r) => r.label === "취득 시점")?.isAlert).toBe(true);
    expect(rows.find((r) => r.label === "참고")?.value).toContain("36두");
    expect(rows.find((r) => r.label === "참고")?.value).toContain("2026. 7. 30.");
  });

  test("근거 카드는 원문 위치와 조회 시각을 함께 표시한다", async () => {
    const view = await buildView();
    const focus = view.reality.focuses[0];

    expect(focus?.sourceDoc).toContain("기초자산");
    expect(focus?.sourceDoc).toContain("24행");
    expect(focus?.sourceLedger).toMatch(/\d{4}\. \d{1,2}\. \d{1,2}\./);
  });

  test("취득시기 미확인 개체의 취득원가는 근거 카드에서도 대조 불가로 표시된다", async () => {
    const view = await buildView();
    const focus = view.reality.focuses[0];

    expect(focus?.claimRows.find((r) => r.label === "취득원가")?.note).toContain(
      "대조 불가",
    );
  });
});

describe("toDemoView — 미판정(unjudged)은 숨기지 않는다", () => {
  test("② 층위가 기준 월·모수·평균가를 출처와 함께 제시한다", async () => {
    const view = await buildView();
    const labels = view.price.items.map((i) => `${i.title} ${i.meta}`).join(" ");

    expect(view.price.heading).toContain("취득원가");
    expect(view.price.source).toContain("축산물등급판정정보");
    expect(labels).toMatch(/기준 2026-0\d/);
    expect(labels).toMatch(/등급판정 [\d,]+두/);
    expect(labels).toMatch(/원\/kg/);
  });

  test("위치를 만들지 못한 취득원가는 사유와 함께 대조 불가로 남는다", async () => {
    const view = await buildView();
    const unplaced = view.price.items.filter((item) =>
      item.title.includes("대조 불가"),
    );

    expect(unplaced.length).toBeGreaterThan(0);
    expect(unplaced[0].meta.length).toBeGreaterThan(0);
    expect(view.price.note).toContain("적정성 판단이 아닙니다");
    expect(view.price.note).toContain("대조 불가");
  });

  test("신고서 기재 합계·평균은 대조 전 값임을 명시한다", async () => {
    const view = await buildView();
    const labels = view.price.items.map((i) => `${i.title} ${i.meta}`).join(" ");

    expect(labels).toContain("신고서 기재");
  });
});

describe("toDemoView — 문서 버전·리플레이", () => {
  test("③ 층위는 리포트 버전링과 엔진 note를 그대로 노출한다", async () => {
    const loaded = await loadLatestReport("livestock-9");
    const view = toDemoView(loaded);
    const text = view.history.items.map((i) => `${i.title} ${i.meta}`).join(" ");

    expect(text).toContain("2026. 8. 14.");
    expect(text).toContain(`${loaded.versionCount}건`);
    expect(text).toContain(loaded.report.notes[0] ?? "");
  });

});

describe("toDemoView — 익명화 (목업 v4 수준 유지)", () => {
  test("직렬화된 화면 데이터에 실명·이력번호·지역·농장번호가 없다", async () => {
    const serialized = JSON.stringify(await buildView());

    for (const secret of [
      "학산",
      "217935879",
      "212786152",
      "횡성",
      "포항",
      "387221",
      "485464",
      "bankcow",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
