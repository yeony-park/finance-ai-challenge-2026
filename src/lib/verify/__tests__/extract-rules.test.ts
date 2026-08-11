import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { extractClaims } from "../claims/extract-rules";
import type { DocumentRef } from "../types";

const BANKCOW9: DocumentRef = {
  offerId: "bankcow-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const rawXml = (): string =>
  readFileSync("data/raw/20260806000159/20260806000159.xml", "utf8");

describe("규칙 기반 claim 추출 — 뱅카우 9호 원문", () => {
  test("37두 이력번호를 전수 추출한다", () => {
    // Arrange
    const xml = rawXml();

    // Act
    const result = extractClaims(xml, BANKCOW9);
    const traceNos = result.claims
      .filter((c) => c.kind === "livestock_trace_no")
      .map((c) => c.value);

    // Assert
    expect(traceNos).toHaveLength(37);
    expect(new Set(traceNos).size).toBe(37);
    expect(traceNos[0]).toBe("212786152");
    expect(traceNos[23]).toBe("217935879"); // 학산 24호
    expect(traceNos[36]).toBe("214820575");
  });

  test("개체별 취득가액을 숫자로 정규화한다", () => {
    const result = extractClaims(rawXml(), BANKCOW9);
    const first = result.claims.find(
      (c) => c.kind === "acquisition_price" && c.subject === "학산 1호",
    );

    expect(first?.numericValue).toBe(4574865);
    expect(first?.unit).toBe("원");
  });

  test("합계 행은 개체 claim으로 잡히지 않는다", () => {
    const result = extractClaims(rawXml(), BANKCOW9);
    const subjects = new Set(result.claims.map((c) => c.subject));

    expect(subjects.has("합계")).toBe(false);
    expect(subjects.size).toBe(37);
  });

  test("품종·성별·보관장소 claim이 개체마다 붙는다", () => {
    const result = extractClaims(rawXml(), BANKCOW9);
    const of = (kind: string) => result.claims.filter((c) => c.kind === kind);

    expect(of("livestock_breed")).toHaveLength(37);
    expect(of("livestock_breed")[0].value).toBe("한우");
    expect(of("livestock_sex")).toHaveLength(37);
    expect(of("livestock_sex")[0].value).toBe("수");
    expect(of("custody_location")[0].value).toContain("횡성");
  });

  test("claim에 문서 버전 축과 원문 좌표가 붙는다", () => {
    const result = extractClaims(rawXml(), BANKCOW9);
    const claim = result.claims[0];

    expect(claim.document.rcpNo).toBe("20260806000159");
    expect(claim.document.submittedOn).toBe("2026-08-06");
    expect(claim.location.row).toBeGreaterThan(0);
    expect(claim.location.table.length).toBeGreaterThan(0);
    expect(claim.id).toBe("livestock_trace_no:학산 1호");
  });
});

const SYNTHETIC_XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<P>본건 기초자산은 한우 송아지(숫소)입니다.</P>
<TABLE>
<TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>학산 1호</TD><TD>한우 송아지</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865 </TD><TD ROWSPAN="3">강원도 횡성군횡성읍</TD></TR>
<TR><TD>학산 2호</TD><TD>한우 송아지</TD><TD>12345</TD><TD>2026-07-14</TD><TD>미정</TD></TR>
<TR><TD>합계</TD><TD>9,029,730</TD></TR>
</TBODY>
</TABLE>
</DOCUMENT>`;

describe("스키마 게이트 강등", () => {
  test("형식 위반 필드는 파이프라인을 멈추지 않고 확인 불가로 강등된다", () => {
    // Act
    const result = extractClaims(SYNTHETIC_XML, BANKCOW9);
    const badTrace = result.claims.find(
      (c) => c.kind === "livestock_trace_no" && c.subject === "학산 2호",
    );
    const badPrice = result.claims.find(
      (c) => c.kind === "acquisition_price" && c.subject === "학산 2호",
    );

    // Assert — 정상 행은 그대로 살아 있다
    expect(
      result.claims.find(
        (c) => c.kind === "livestock_trace_no" && c.subject === "학산 1호",
      )?.verifiability,
    ).toBe("verifiable");

    expect(badTrace?.verifiability).toBe("unparsed");
    expect(badTrace?.demotionReason).toMatch(/9자리/);
    expect(badPrice?.verifiability).toBe("unparsed");
    expect(result.demotions.length).toBe(2);
  });

  test("ROWSPAN 보관장소가 아래 행으로 전파된다", () => {
    const result = extractClaims(SYNTHETIC_XML, BANKCOW9);
    const custody = result.claims.filter((c) => c.kind === "custody_location");

    expect(custody).toHaveLength(2);
    expect(custody[1].value).toBe("강원도 횡성군횡성읍");
  });

  test("개체 명세표가 없으면 claim 0건과 사유를 돌려준다", () => {
    const result = extractClaims("<DOCUMENT><P>표 없음</P></DOCUMENT>", BANKCOW9);

    expect(result.claims).toEqual([]);
    expect(result.notes.join(" ")).toMatch(/개체 명세표/);
  });
});
