import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { extractClaims } from "../claims/extract-rules";
import type { DocumentRef } from "../types";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const BANKCOW9: DocumentRef = {
  offerId: "livestock-9",
  rcpNo: "20260806000159",
  submittedOn: "2026-08-06",
};

const RAW_XML_PATH = rawXmlPath(BANKCOW9.rcpNo);
const hasRawXml = hasLocalFile(RAW_XML_PATH);

const rawXml = (): string => readFileSync(RAW_XML_PATH, "utf8");

describe.skipIf(!hasRawXml)(
  `규칙 기반 claim 추출 — 뱅카우 9호 원문 ${hasRawXml ? "" : skipReason(RAW_XML_PATH)}`,
  () => {
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
      expect(traceNos[23]).toBe("217935879"); // 24번째 개체
      expect(traceNos[36]).toBe("214820575");
    });

    test("개체별 취득가액을 숫자로 정규화한다", () => {
      const result = extractClaims(rawXml(), BANKCOW9);
      const first = result.claims.find(
        (c) => c.kind === "acquisition_price" && c.location.row === 1,
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
      // 지명 자체는 테스트에 박지 않는다 — "시도 + 시·군" 형태인지만 확인한다
      expect(of("custody_location")[0].value).toMatch(/[가-힣]+도\s*[가-힣]+(시|군)/);
    });

    test("성별은 개체 행에서 읽어 전 개체가 확인 가능 상태다", () => {
      const result = extractClaims(rawXml(), BANKCOW9);
      const sex = result.claims.filter((c) => c.kind === "livestock_sex");

      expect(sex.every((c) => c.verifiability === "verifiable")).toBe(true);
      expect(new Set(sex.map((c) => c.value))).toEqual(new Set(["수"]));
    });

    test("claim에 문서 버전 축과 원문 좌표가 붙는다", () => {
      const result = extractClaims(rawXml(), BANKCOW9);
      const claim = result.claims[0];

      expect(claim.document.rcpNo).toBe("20260806000159");
      expect(claim.document.submittedOn).toBe("2026-08-06");
      expect(claim.location.row).toBeGreaterThan(0);
      expect(claim.location.table.length).toBeGreaterThan(0);
      expect(claim.id).toBe(`livestock_trace_no:${claim.subject}`);
    });
  },
);

const SYNTHETIC_XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<P>본건 기초자산은 한우 송아지(숫소)입니다.</P>
<TABLE>
<TBODY>
<TR><TD>구분</TD><TD>기초자산 취득가액</TD><TD>취득가액</TD></TR>
<TR><TD>한우 송아지(숫소) 검증 1호</TD><TD>212786152</TD><TD>4,574,865</TD></TR>
</TBODY>
</TABLE>
<TABLE>
<TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>검증 1호</TD><TD>한우 송아지</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865 </TD><TD ROWSPAN="3">강원도 검증군가상읍</TD></TR>
<TR><TD>검증 2호</TD><TD>한우 송아지</TD><TD>12345</TD><TD>2026-07-14</TD><TD>미정</TD></TR>
<TR><TD>합계</TD><TD>9,029,730</TD></TR>
</TBODY>
</TABLE>
</DOCUMENT>`;

describe("스키마 게이트 강등", () => {
  test("형식 위반 필드는 파이프라인을 멈추지 않고 확인 불가로 강등된다", () => {
    // Act
    const result = extractClaims(SYNTHETIC_XML, BANKCOW9);
    const badTrace = result.claims.find(
      (c) => c.kind === "livestock_trace_no" && c.subject === "검증 2호",
    );
    const badPrice = result.claims.find(
      (c) => c.kind === "acquisition_price" && c.subject === "검증 2호",
    );

    // Assert — 정상 행은 그대로 살아 있다
    expect(
      result.claims.find(
        (c) => c.kind === "livestock_trace_no" && c.subject === "검증 1호",
      )?.verifiability,
    ).toBe("verifiable");

    expect(badTrace?.verifiability).toBe("unparsed");
    expect(badTrace?.demotionReason).toMatch(/9자리/);
    expect(badPrice?.verifiability).toBe("unparsed");
  });

  test("ROWSPAN 보관장소가 아래 행으로 전파된다", () => {
    const result = extractClaims(SYNTHETIC_XML, BANKCOW9);
    const custody = result.claims.filter((c) => c.kind === "custody_location");

    expect(custody).toHaveLength(2);
    expect(custody[1].value).toBe("강원도 검증군가상읍");
  });

  test("개체 명세표가 없으면 claim 0건과 사유를 돌려준다", () => {
    const result = extractClaims("<DOCUMENT><P>표 없음</P></DOCUMENT>", BANKCOW9);

    expect(result.claims).toEqual([]);
    expect(result.notes.join(" ")).toMatch(/개체 명세표/);
  });
});

/**
 * 성별은 문서 전체 1회 스캔이 아니라 개체 행에서 읽어야 한다.
 * 혼성 우군(숫소·암소·거세우 혼재)에서 문서 전체 스캔은 전 개체에 같은 값을 붙여
 * 가짜 불일치를 제조한다 — 이 스위트가 그 회귀를 막는다.
 */
const MIXED_HERD_XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<P>본건 기초자산 중 거세우인 경우 26개월 이후 출하합니다.</P>
<TABLE>
<TBODY>
<TR><TD>구분</TD><TD>이력번호</TD><TD>취득가액</TD></TR>
<TR><TD>한우 송아지(숫소) 검증 1호</TD><TD>212786152</TD><TD>4,574,865</TD></TR>
<TR><TD>한우 송아지(암소) 검증 2호</TD><TD>214838454</TD><TD>4,654,865</TD></TR>
<TR><TD>한우 거세우 검증 3호</TD><TD>214836967</TD><TD>4,454,865</TD></TR>
</TBODY>
</TABLE>
<TABLE>
<TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>검증 1호</TD><TD>한우 송아지</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865</TD><TD ROWSPAN="4">강원도 검증군가상읍</TD></TR>
<TR><TD>검증 2호</TD><TD>한우 송아지</TD><TD>214838454</TD><TD>2026-07-14</TD><TD>4,654,865</TD></TR>
<TR><TD>검증 3호</TD><TD>한우 송아지</TD><TD>214836967</TD><TD>2026-07-14</TD><TD>4,454,865</TD></TR>
<TR><TD>검증 4호</TD><TD>한우 송아지</TD><TD>214820575</TD><TD>2026-07-14</TD><TD>4,419,865</TD></TR>
</TBODY>
</TABLE>
</DOCUMENT>`;

describe("성별 추출 — 개체 행 단위", () => {
  test("혼성 우군에서 개체마다 자기 행의 성별을 갖는다", () => {
    // Act
    const result = extractClaims(MIXED_HERD_XML, BANKCOW9);
    const sexOf = (subject: string) =>
      result.claims.find(
        (c) => c.kind === "livestock_sex" && c.subject === subject,
      );

    // Assert
    expect(sexOf("검증 1호")?.value).toBe("수");
    expect(sexOf("검증 2호")?.value).toBe("암");
    expect(sexOf("검증 3호")?.value).toBe("거세");
    expect(
      ["검증 1호", "검증 2호", "검증 3호"].every(
        (s) => sexOf(s)?.verifiability === "verifiable",
      ),
    ).toBe(true);
  });

  test("행에서 성별을 못 찾으면 그 행만 확인 불가로 강등된다", () => {
    const result = extractClaims(MIXED_HERD_XML, BANKCOW9);
    const fourth = result.claims.find(
      (c) => c.kind === "livestock_sex" && c.subject === "검증 4호",
    );

    expect(fourth?.verifiability).toBe("unparsed");
    expect(fourth?.demotionReason).toMatch(/성별/);
    expect(
      result.demotions.some((d) => d.claimId === "livestock_sex:검증 4호"),
    ).toBe(true);
    // 다른 개체는 전혀 영향받지 않는다
    expect(
      result.claims.find(
        (c) => c.kind === "livestock_sex" && c.subject === "검증 1호",
      )?.verifiability,
    ).toBe("verifiable");
  });

  test("문서 산문의 성별 서술은 개체에 전파되지 않는다", () => {
    // 산문에만 "거세우"가 등장하고 개체 행에는 성별 서술이 없는 문서
    const proseOnly = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<P>거세우의 경우 26개월 이후 출하합니다.</P>
<TABLE>
<TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>검증 1호</TD><TD>한우 송아지</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865</TD><TD>강원도 검증군가상읍</TD></TR>
</TBODY>
</TABLE>
</DOCUMENT>`;

    const result = extractClaims(proseOnly, BANKCOW9);
    const sex = result.claims.find((c) => c.kind === "livestock_sex");

    expect(sex?.verifiability).toBe("unparsed");
    expect(result.notes.join(" ")).toMatch(/성별/);
  });
});
