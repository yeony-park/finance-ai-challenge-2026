import { describe, expect, test } from "vitest";

import {
  baseReportName,
  buildLineage,
  hasLaterAmendmentRemark,
  isAmendmentReport,
} from "../dart/amendment-lineage";
import { listFilings, type DartFiling } from "../dart/list-filings";

const CORP_CODE = "01234567";

const filing = (
  rcpNo: string,
  reportName: string,
  remark = "",
): DartFiling => ({
  corpCode: CORP_CODE,
  corpName: "발행사 A",
  reportName,
  rcpNo,
  receivedOn: rcpNo.slice(0, 8),
  remark,
});

const BASE = filing("20260806000159", "증권신고서(투자계약증권)");

describe("정정 표기 판독", () => {
  test("대괄호 정정 표기가 있으면 정정신고서로 본다", () => {
    expect(isAmendmentReport("[기재정정]증권신고서(투자계약증권)")).toBe(true);
    expect(isAmendmentReport("[첨부정정]증권신고서(투자계약증권)")).toBe(true);
    expect(isAmendmentReport("증권신고서(투자계약증권)")).toBe(false);
  });

  test("서류 종류 비교는 대괄호 표기를 제거한 이름으로 한다", () => {
    expect(baseReportName("[기재정정]증권신고서(투자계약증권)")).toBe(
      "증권신고서(투자계약증권)",
    );
  });

  test("비고의 정정 표시를 읽는다", () => {
    expect(hasLaterAmendmentRemark("정")).toBe(true);
    expect(hasLaterAmendmentRemark("")).toBe(false);
  });
});

describe("정정 계보 구성", () => {
  test("후속 접수가 없으면 정정 0건을 정상 산출한다", () => {
    const lineage = buildLineage(BASE, [BASE], "20260814");

    expect(lineage.amendments).toEqual([]);
    expect(lineage.baseRcpNo).toBe(BASE.rcpNo);
    expect(lineage.checkedThrough).toBe("20260814");
    expect(lineage.notes).toEqual([]);
  });

  test("같은 종류의 정정신고서를 접수 순서대로 모은다", () => {
    const lineage = buildLineage(
      BASE,
      [
        filing("20260820000010", "[기재정정]증권신고서(투자계약증권)"),
        BASE,
        filing("20260812000021", "[기재정정]증권신고서(투자계약증권)"),
        filing("20260815000003", "투자설명서"),
      ],
      "20260901",
    );

    expect(lineage.amendments.map((item) => item.rcpNo)).toEqual([
      "20260812000021",
      "20260820000010",
    ]);
  });

  test("다음 공모의 신규 신고서 앞에서 계보를 끊는다", () => {
    const lineage = buildLineage(
      BASE,
      [
        BASE,
        filing("20260812000021", "[기재정정]증권신고서(투자계약증권)"),
        filing("20261001000005", "증권신고서(투자계약증권)"),
        filing("20261010000007", "[기재정정]증권신고서(투자계약증권)"),
      ],
      "20261101",
    );

    expect(lineage.amendments.map((item) => item.rcpNo)).toEqual([
      "20260812000021",
    ]);
    expect(lineage.notes[0]).toContain("20261001000005");
  });

  test("비고에 정정 표시가 있으나 정정신고서를 못 찾으면 정직하게 남긴다", () => {
    const lineage = buildLineage(
      filing("20260806000159", "증권신고서(투자계약증권)", "정"),
      [],
      "20260814",
    );

    expect(lineage.amendments).toEqual([]);
    expect(lineage.notes[0]).toContain("비고에 정정 표시");
  });
});

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("공시검색 조회", () => {
  test("조회 결과 없음(013)은 빈 목록으로 돌려준다", async () => {
    const result = await listFilings(
      { bgnDe: "20260806", endDe: "20260814" },
      "test-key",
      async () => jsonResponse({ status: "013", message: "조회된 데이타가 없습니다." }),
    );

    expect(result).toEqual([]);
  });

  test("오류 상태는 삼키지 않고 던진다", async () => {
    await expect(
      listFilings(
        { bgnDe: "20260806", endDe: "20260814" },
        "test-key",
        async () => jsonResponse({ status: "020", message: "요청 제한을 초과하였습니다." }),
      ),
    ).rejects.toThrow("status=020");
  });

  test("정상 응답을 내부 필링 형태로 정규화한다", async () => {
    const result = await listFilings(
      { bgnDe: "20260806", endDe: "20260806", corpCode: CORP_CODE },
      "test-key",
      async () =>
        jsonResponse({
          status: "000",
          message: "정상",
          page_no: 1,
          total_page: 1,
          total_count: 1,
          list: [
            {
              corp_code: CORP_CODE,
              corp_name: "발행사 A",
              report_nm: "증권신고서(투자계약증권)",
              rcept_no: "20260806000159",
              rcept_dt: "20260806",
              rm: "",
            },
          ],
        }),
    );

    expect(result).toEqual([BASE]);
  });
});
