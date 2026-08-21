import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import type { DartFiling } from "../dart/list-filings";
import { buildTrackRecord } from "../track-record/build";
import { classifyFilings, pickLatestPerLineage } from "../track-record/filings";
import { parseIssuanceResult } from "../track-record/issuance-result";
import { issuerKeyForOffer } from "../track-record/registry";
import {
  assertMaskedTrackRecord,
  parseTrackRecord,
} from "../track-record/schema";
import { trackRecordPath } from "../track-record/store";
import { toTrackRecordView } from "../track-record/view";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const CORP_CODE = "01234567";

const filing = (rcpNo: string, reportName: string): DartFiling => ({
  corpCode: CORP_CODE,
  corpName: "발행사 A 주식회사",
  reportName,
  rcpNo,
  receivedOn: rcpNo.slice(0, 8),
  remark: "",
});

const allocationRow = (
  label: string,
  cells: readonly string[],
): string =>
  `<TR><TE ACODE="DST_CD">${label}</TE>${cells
    .map((cell) => `<TE ACODE="X">${cell}</TE>`)
    .join("")}</TR>`;

const seriesBlock = (
  seriesLabel: string,
  operator: readonly string[],
  general: readonly string[],
): string =>
  [
    `<TABLE><TR><TD>회차 :</TD><TE ACODE="SEQ_NO">${seriesLabel}</TE></TR></TABLE>`,
    "<TABLE><THEAD>",
    "<TR><TH>구  분</TH><TH>최초 배정</TH><TH>청약 현황</TH><TH>최종 배정 현황</TH></TR>",
    "</THEAD><TBODY>",
    allocationRow("공동사업 운영자", operator),
    allocationRow("일반투자자", general),
    "</TBODY></TABLE>",
  ].join("");

const OVER_SUBSCRIBED = seriesBlock(
  "1-1",
  ["2,163", "10", "-", "-", "-", "2,163", "43,260,000", "10"],
  ["19,467", "90", "42,977", "859,540,000", "221", "19,467", "389,340,000", "90"],
);

const UNDER_SUBSCRIBED = seriesBlock(
  "1-2",
  ["3,055", "10", "-", "-", "-", "10,435", "208,700,000", "34"],
  ["27,492", "90", "20,112", "402,240,000", "73", "20,112", "402,240,000", "66"],
);

describe("발행실적보고서 계보 — 정정된 보고서가 원 보고서를 대신한다", () => {
  test("최초 제출 뒤 이어진 정정본만 남긴다", () => {
    const latest = pickLatestPerLineage([
      filing("20250507000443", "증권발행실적보고서"),
      filing("20250515001113", "[기재정정]증권발행실적보고서"),
      filing("20250703000286", "증권발행실적보고서"),
      filing("20250718000392", "[기재정정]증권발행실적보고서"),
      filing("20250731000259", "[기재정정]증권발행실적보고서"),
    ]);

    expect(latest.map((item) => item.rcpNo)).toEqual([
      "20250515001113",
      "20250731000259",
    ]);
  });

  test("공시 목록을 서류 종류별로 가른다", () => {
    const classified = classifyFilings([
      filing("20240220002223", "증권신고서(투자계약증권)"),
      filing("20240503000803", "[기재정정]증권신고서(투자계약증권)"),
      filing("20240116000225", "철회신고서"),
      filing("20240705000021", "증권발행실적보고서"),
      filing("20240722000088", "[기재정정]증권발행실적보고서"),
      filing("20240620000032", "투자설명서"),
    ]);

    expect(classified.offeringBases).toHaveLength(1);
    expect(classified.offeringAmendments).toHaveLength(1);
    expect(classified.withdrawals).toHaveLength(1);
    expect(classified.resultBases).toHaveLength(1);
    expect(classified.resultAmendments).toHaveLength(1);
    expect(classified.latestResultFilings.map((item) => item.rcpNo)).toEqual([
      "20240722000088",
    ]);
  });
});

describe("증권발행실적보고서 원문 파싱 — 청약·배정 실측", () => {
  test("청약수량이 최초 배정수량을 넘으면 미달로 세지 않는다", () => {
    const [series] = parseIssuanceResult(OVER_SUBSCRIBED);

    expect(series?.seriesLabel).toBe("1-1");
    expect(series?.generalSubscribedUnits).toBe(42977);
    expect(series?.isUnderSubscribed).toBe(false);
    expect(series?.operatorTookUnallocated).toBe(false);
  });

  test("청약수량이 최초 배정수량에 못 미치고 운영자 배정이 늘면 둘 다 기록한다", () => {
    const [series] = parseIssuanceResult(UNDER_SUBSCRIBED);

    expect(series?.generalInitialUnits).toBe(27492);
    expect(series?.generalSubscribedUnits).toBe(20112);
    expect(series?.generalSubscriptionRatePercent).toBe(73);
    expect(series?.operatorInitialUnits).toBe(3055);
    expect(series?.operatorFinalUnits).toBe(10435);
    expect(series?.operatorFinalAmountKrw).toBe(208700000);
    expect(series?.isUnderSubscribed).toBe(true);
    expect(series?.operatorTookUnallocated).toBe(true);
  });

  test("한 보고서가 여러 회차를 담으면 회차별로 읽는다", () => {
    const series = parseIssuanceResult(`${OVER_SUBSCRIBED}${UNDER_SUBSCRIBED}`);

    expect(series.map((item) => item.seriesLabel)).toEqual(["1-1", "1-2"]);
  });

  test("같은 회차가 정정 전·후로 두 번 실리면 앞선 기재만 읽는다", () => {
    const series = parseIssuanceResult(`${UNDER_SUBSCRIBED}${UNDER_SUBSCRIBED}`);

    expect(series).toHaveLength(1);
  });
});

describe("트랙레코드 집계 — 사실을 세고 판정하지 않는다", () => {
  const record = buildTrackRecord({
    issuerKey: "issuer-test",
    collectedAt: "2026-08-14T07:00:00.000Z",
    fromYmd: "20240101",
    throughYmd: "20260814",
    filings: [
      filing("20240220002223", "증권신고서(투자계약증권)"),
      filing("20240503000803", "[기재정정]증권신고서(투자계약증권)"),
      filing("20240116000225", "철회신고서"),
      filing("20240705000021", "증권발행실적보고서"),
      filing("20240722000088", "[기재정정]증권발행실적보고서"),
    ],
    resultReports: [
      {
        filing: filing("20240722000088", "[기재정정]증권발행실적보고서"),
        series: parseIssuanceResult(`${OVER_SUBSCRIBED}${UNDER_SUBSCRIBED}`),
      },
    ],
  });

  test("공모·정정·회차 건수를 공시 목록 그대로 센다", () => {
    expect(record.counts.offeringFilings).toBe(1);
    expect(record.counts.offeringAmendments).toBe(1);
    expect(record.counts.withdrawalFilings).toBe(1);
    expect(record.counts.seriesChecked).toBe(2);
    expect(record.counts.underSubscribedSeries).toBe(1);
    expect(record.counts.operatorTookUnallocatedSeries).toBe(1);
  });

  test("집계 단위는 법적 발행사이고 브랜드·플랫폼을 합산하지 않는다", () => {
    expect(record.aggregation.unit).toBe("legal-issuer");
    expect(record.aggregation.brandsAggregated).toBe(false);
    expect(record.aggregation.platformsAggregated).toBe(false);
  });

  test("표시할 사실만 회차 단위로 남기고 출처를 붙인다", () => {
    expect(record.flaggedSeries).toHaveLength(1);
    expect(record.flaggedSeries[0]?.seriesLabel).toBe("1-2");
    expect(record.flaggedSeries[0]?.source.rcpNo).toBe("20240722000088");
  });

  test("스키마를 통과하고 발행사 식별자를 담지 않는다", () => {
    expect(() =>
      assertMaskedTrackRecord(parseTrackRecord(record), {
        forbiddenValues: [CORP_CODE, "발행사 A 주식회사"],
      }),
    ).not.toThrow();
  });

  test("발행사명이 섞이면 저장 전에 막는다", () => {
    expect(() =>
      assertMaskedTrackRecord(
        { ...record, notes: ["발행사 A 주식회사가 제출했습니다"] },
        { forbiddenValues: [CORP_CODE, "발행사 A 주식회사"] },
      ),
    ).toThrow();
  });

  test("corp_code가 섞이면 저장 전에 막는다", () => {
    expect(() =>
      assertMaskedTrackRecord(
        { ...record, notes: [`corp ${CORP_CODE}`] },
        { forbiddenValues: [CORP_CODE] },
      ),
    ).toThrow();
  });
});

describe("트랙레코드 화면 문구 — 사실 나열만 남긴다", () => {
  const view = toTrackRecordView(
    buildTrackRecord({
      issuerKey: "issuer-test",
      collectedAt: "2026-08-14T07:00:00.000Z",
      fromYmd: "20240101",
      throughYmd: "20260814",
      filings: [filing("20240705000021", "증권발행실적보고서")],
      resultReports: [
        {
          filing: filing("20240705000021", "증권발행실적보고서"),
          series: parseIssuanceResult(`${OVER_SUBSCRIBED}${UNDER_SUBSCRIBED}`),
        },
      ],
    }),
  );

  test("모든 사실에 출처가 붙는다", () => {
    expect(view.facts.length).toBeGreaterThan(0);
    expect(view.facts.every((fact) => fact.source.startsWith("출처 ·"))).toBe(true);
  });

  test("사실 id가 유일하다", () => {
    expect(new Set(view.facts.map((fact) => fact.id)).size).toBe(view.facts.length);
  });

  test("사실 문장에 평가·등급·경고 표현을 쓰지 않는다", () => {
    const text = [view.title, ...view.facts.map((fact) => fact.text)].join(" ");

    for (const banned of [
      "위험",
      "부실",
      "등급",
      "경고",
      "주의",
      "추천",
      "우려",
      "평가",
    ]) {
      expect(text).not.toContain(banned);
    }
  });

  test("평가가 아니라 집계임을 고지한다", () => {
    expect(view.notice).toContain("평가");
    expect(view.notice).toContain("집계");
  });

  test("미달·추가 배정 회차를 실측 숫자와 함께 적는다", () => {
    const texts = view.facts.map((fact) => fact.text).join(" ");

    expect(texts).toContain("제1-2회차");
    expect(texts).toContain("20,112주");
    expect(texts).toContain("27,492주");
    expect(texts).toContain("미달했습니다");
  });
});

describe("공개 산출물 — 커밋되는 트랙레코드", () => {
  const file = trackRecordPath("issuer-a");

  test("발행사 키만 남기고 법인명·corp_code를 담지 않는다", () => {
    if (!hasLocalFile(file)) {
      console.warn(skipReason(file));
      return;
    }
    const record = parseTrackRecord(JSON.parse(readFileSync(file, "utf8")));

    expect(() => assertMaskedTrackRecord(record)).not.toThrow();
    expect(record.issuerKey).toBe("issuer-a");
  });

  test("실측 결과가 리서치 주장(8-2호 청약 미달·자기인수)과 맞는다", () => {
    if (!hasLocalFile(file)) {
      console.warn(skipReason(file));
      return;
    }
    const record = parseTrackRecord(JSON.parse(readFileSync(file, "utf8")));
    const flagged = record.flaggedSeries.find((item) => item.seriesLabel === "8-2");

    expect(flagged?.isUnderSubscribed).toBe(true);
    expect(flagged?.operatorTookUnallocated).toBe(true);
    expect(flagged?.source.reportName).toContain("증권발행실적보고서");
  });
});

describe("발행사 매핑 — 실적 데이터가 없는 공모는 카드를 만들지 않는다", () => {
  test("가축 공모 세 건은 같은 발행사 키를 쓴다", () => {
    expect(issuerKeyForOffer("livestock-7")).toBe("issuer-a");
    expect(issuerKeyForOffer("livestock-8")).toBe("issuer-a");
    expect(issuerKeyForOffer("livestock-9")).toBe("issuer-a");
  });

  test("부동산 공모는 발행사 실적 데이터가 없어 매핑이 없다", () => {
    expect(issuerKeyForOffer("real-estate-a")).toBeUndefined();
  });
});

describe("실키 원문 회귀 — 로컬 원문이 있을 때만", () => {
  test("정정된 실적보고서 원문에서 8-1·8-2 회차를 읽는다", () => {
    const file = rawXmlPath("20260611000015");
    if (!hasLocalFile(file)) {
      console.warn(skipReason(file));
      return;
    }
    const series = parseIssuanceResult(readFileSync(file, "utf8"));

    expect(series.map((item) => item.seriesLabel)).toEqual(["8-1", "8-2"]);
    expect(series[0]?.isUnderSubscribed).toBe(false);
    expect(series[1]?.isUnderSubscribed).toBe(true);
    expect(series[1]?.operatorFinalUnits).toBe(10435);
  });
});
