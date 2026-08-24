import { describe, expect, test } from "vitest";

import { buildNarrativeDigest } from "../narrative/source";
import { loadLatestReport } from "../report/load";
import { toDemoView, type RichText } from "../report/view-model";

const OFFER_ID = "real-estate-bbric-hiwon";
const plain = (rich: RichText): string => rich.map((part) => part.text).join("");

describe("희원감천 운영 상품 화면 모델", () => {
  test("운영 상품을 매각 공시·사후 대조로 표현하지 않는다", async () => {
    const loaded = await loadLatestReport(OFFER_ID);
    const view = toDemoView(loaded);
    const text = JSON.stringify({
      offer: view.offer,
      verdict: view.verdict,
      reality: view.reality,
      history: view.history,
    });

    expect(view.offer.title).toContain("희원감천");
    expect(view.offer.tag).toContain("상품 원문");
    expect(view.verdict.when).toContain("플랫폼 원문 확인일");
    expect(view.verdict.eyebrow).toContain("국토부 건축물대장");
    expect(view.meta.items).toContainEqual(
      expect.stringContaining("국토교통부 건축물대장"),
    );
    expect(plain(view.verdict.oneLiner.easy)).toContain("건축면적");
    expect(text).not.toContain("매각 공시");
    expect(text).not.toContain("공시된 매각 내역");
    expect(text).not.toContain("지번 단위 대조");
  });

  test("근거 카드는 플랫폼 원문과 건축물대장 출처를 각각 연결한다", async () => {
    const view = toDemoView(await loadLatestReport(OFFER_ID));
    const focus = view.reality.focuses[0];

    expect(focus?.claimHeading).toContain("상품 원문 기재");
    expect(focus?.ledgerHeading).toContain("국토부 건축물대장");
    expect(view.reality.subjects[0]?.label).toBe("희원감천");
    expect(focus?.title).toContain("희원감천");
    expect(focus?.sourceDocUrl).toContain("bbric.com/building.php");
    expect(focus?.sourceLedgerUrl).toBe(
      "https://www.data.go.kr/data/15134735/openapi.do",
    );
    expect(view.price.source).toContain("국토부 실거래 비교군");
    expect(view.price.items[0]?.source?.url).toBe(
      "https://www.data.go.kr/data/15126463/openapi.do",
    );
    expect(
      focus?.ledgerRows.find((row) => row.label === "사용승인월")?.note,
    ).toContain("월 단위");
  });

  test("운영·거래 가능 상태는 각각 원문과 기준일을 가진다", async () => {
    const view = toDemoView(await loadLatestReport(OFFER_ID));
    const lifecycle = view.history.items.find(
      (item) => item.id === "real-estate-lifecycle-status",
    );
    const tradability = view.history.items.find(
      (item) => item.id === "real-estate-tradability-status",
    );

    expect(lifecycle?.title).toContain("운영 중");
    expect(lifecycle?.meta).toContain(
      "플랫폼 제공 주장 · 2026-05-27 기준 운영·배당 이력",
    );
    expect(lifecycle?.meta).toContain(
      "현재 상태를 독립 원장으로 확정한 결과가 아닙니다",
    );
    expect(lifecycle?.meta).not.toContain("공개 원문에 근거한 현재 상태");
    expect(lifecycle?.source).toMatchObject({
      url: "https://bbric.com/notice.php",
      asOf: "2026. 5. 27.",
    });
    expect(tradability?.title).toContain("거래 가능 여부 미확인");
    expect(tradability?.meta).toContain("플랫폼 공개 화면 기준 미확인");
    expect(tradability?.meta).toContain(
      "거래 가능 상태를 독립 원장으로 확정한 결과가 아닙니다",
    );
    expect(tradability?.source).toMatchObject({
      url: "https://www.bbric.com/building.php",
      asOf: "2026. 8. 23.",
    });
  });

  test("상태 근거 라벨은 sourceKind가 플랫폼 주장일 때만 플랫폼 주장으로 표시한다", async () => {
    const loaded = await loadLatestReport(OFFER_ID);
    const lifecycleSource =
      loaded.report.realEstate?.statusEvidence?.assetLifecycle;
    expect(lifecycleSource).toBeDefined();

    const report = {
      ...loaded.report,
      realEstate: {
        ...loaded.report.realEstate!,
        statusEvidence: {
          ...loaded.report.realEstate!.statusEvidence,
          assetLifecycle: {
            ...lifecycleSource!,
            sourceKind: "official-document" as const,
          },
        },
      },
    };
    const view = toDemoView({ report, versionCount: loaded.versionCount });
    const lifecycle = view.history.items.find(
      (item) => item.id === "real-estate-lifecycle-status",
    );

    expect(lifecycle?.meta).toContain(lifecycleSource?.label);
    expect(lifecycle?.meta).not.toContain("플랫폼 제공 주장");
  });

  test("v1 부동산 리포트는 공개 별칭과 판정 zero-state를 유지한다", async () => {
    const view = toDemoView(await loadLatestReport("real-estate-a"));

    expect(view.offer.title).toContain("부동산 A");
    expect(view.reality.subjects).toEqual([]);
    expect(view.history.items[0]?.title).toContain("매각 공시");
    expect(view.history.items).not.toContainEqual(
      expect.objectContaining({ id: "real-estate-lifecycle-status" }),
    );
  });

  test("v1 매각금액은 외부 실거래 확정값이 아니라 매각 공시 기재값으로 표시한다", async () => {
    const view = toDemoView(await loadLatestReport("real-estate-a"));
    const text = JSON.stringify({
      oneLiner: view.verdict.oneLiner,
      price: view.price,
    });

    expect(text).toContain("매각 공시 기재값");
    expect(text).toContain("동일 물건");
    expect(text).toContain("확정한 결과가 아닙니다");
    expect(text).not.toContain("실거래 확정(실제값)");
    expect(text).not.toContain("실거래로 확정된 실제값");
    expect(text).not.toContain("실거래로 확정된 매각금액");
  });

  test("판정 없이 미판정만 있는 SOU 화면은 모두 대조 보류로 표시한다", async () => {
    const view = toDemoView(
      await loadLatestReport("real-estate-sou-daejeon-startup"),
    );
    const oneLiner = plain(view.verdict.oneLiner.easy);
    const caption = plain(view.reality.caption);

    expect(oneLiner).toContain("모두 대조 보류");
    expect(caption).toContain("모두 대조 보류");
    expect(`${oneLiner}${caption}`).not.toContain(
      "공시된 매각 내역 0건이 국토부 실거래 원장에서 확인됩니다",
    );
    expect(caption).not.toContain("실거래 원장과 일치합니다");
  });

  test("판정과 미판정이 모두 없으면 대조할 공시 항목 없음으로 보류한다", async () => {
    const loaded = await loadLatestReport("real-estate-sou-daejeon-startup");
    const view = toDemoView({
      ...loaded,
      report: {
        ...loaded.report,
        summary: { total: 0, match: 0, mismatch: 0, unverifiable: 0 },
        bySubject: [],
        judgements: [],
        unjudged: [],
      },
    });
    const text = `${plain(view.verdict.oneLiner.easy)}${plain(view.reality.caption)}`;

    expect(text).toContain("대조할 공시 항목이 없어 판정을 보류합니다");
    expect(text).not.toContain("매각 내역 0건");
    expect(text).not.toContain("실거래 원장과 일치합니다");
  });

  test("가축 리포트에는 부동산 상태 출처 문구가 추가되지 않는다", async () => {
    const view = toDemoView(await loadLatestReport("livestock-1"));
    const text = JSON.stringify(view.history);

    expect(view.history.items[0]?.title).toContain("증권신고서");
    expect(text).not.toContain("플랫폼 제공 주장");
    expect(text).not.toContain("플랫폼 공개자료 기준 운영 상태");
  });

  test("narrative digest도 상품 원문 기준과 운영 상태를 유지한다", async () => {
    const loaded = await loadLatestReport(OFFER_ID);
    const digest = buildNarrativeDigest(loaded.report, loaded.versionCount);
    const raw = JSON.stringify(digest);

    expect(digest.history.documentBasis).toContain("상품 원문");
    expect(digest.history.documentBasis).toContain("운영 중");
    expect(digest.history.documentBasis).not.toContain("매각 공시");
    expect(raw).toContain("희원감천");
    expect(raw).not.toContain("하나대체투자부산특구부동산투자신탁1호");
    expect(raw).not.toContain("희원감천빌딩");
  });
});
