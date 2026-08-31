import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { parseDocument } from "../parse/document";
import { itemDepth, readOutline, stripMarkup } from "../parse/outline";
import {
  findTableRanges,
  MAX_TABLE_CELLS_PER_ROW,
  MAX_TABLE_ROWS,
  MAX_TABLE_SPAN,
  readTables,
} from "../parse/tables";
import {
  FALLBACK_PROFILE,
  resolveDocumentProfile,
} from "../parse/profiles";
import { hasLocalFile, rawXmlPath, skipReason } from "./local-data";

const SECTIONED_XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<BODY>
<PART>
<TITLE ATOC="Y">제1부 모집 또는 매출에 관한 사항</TITLE>
<SECTION-1>
<TITLE ATOC="Y">II. 증권의 주요 권리내용</TITLE>
<P USERMARK="B">7. 보고서 전달 절차</P>
<TABLE><TBODY>
<TR><TD>구분</TD><TD>내용</TD></TR>
<TR><TD>공시</TD><TD>8. 이 문단은 표 안이라 항목이 아니다</TD></TR>
</TBODY></TABLE>
<P USERMARK="B">8. 기초자산 취득에 관한 사항</P>
<P><SPAN USERMARK="B">가. 기초자산 요약정보</SPAN>본건 공동사업의 기초자산은 한우 송아지(숫소)이며 아래 표와 같습니다.</P>
<TABLE><TBODY>
<TR><TD>구분</TD><TD>고유명칭</TD><TD>이력번호</TD><TD>취득시기</TD><TD>취득원가(원)</TD><TD>보관장소</TD></TR>
<TR><TD>검증 1호</TD><TD>한우 송아지</TD><TD>212786152</TD><TD>2026-07-14</TD><TD>4,574,865</TD><TD>강원도 검증군가상읍</TD></TR>
</TBODY></TABLE>
</SECTION-1>
</PART>
</BODY>
</DOCUMENT>`;

describe("항목 목차 파서", () => {
  test("마크업을 걷어내고 한 줄로 만든다", () => {
    expect(stripMarkup("<SPAN A='1'>가.  요약</SPAN>\n정보")).toBe(
      "가. 요약 정보",
    );
  });

  test("번호 문단만 항목으로 인정하고, 본문이 붙은 긴 문단은 제외한다", () => {
    expect(itemDepth("8. 기초자산 취득에 관한 사항")).toBe(0);
    expect(itemDepth("7-1. 증권발행 실적")).toBe(1);
    expect(itemDepth("가. 기초자산 요약정보")).toBe(1);
    expect(itemDepth("본건 공동사업의 기초자산은 한우입니다.")).toBeUndefined();
    expect(
      itemDepth(
        "가. 기초자산 요약정보본건 공동사업의 기초자산은 농림축산식품부 및 가축 및 축산물 이력관리에 관한 법률에 따라 관리됩니다.",
      ),
    ).toBeUndefined();
  });

  test("표 안의 번호 문단은 항목으로 잡히지 않는다", () => {
    const ranges = findTableRanges(SECTIONED_XML);

    const outline = readOutline(SECTIONED_XML, ranges);
    const titles = outline.map((node) => node.title);

    expect(titles).toContain("8. 기초자산 취득에 관한 사항");
    expect(titles).not.toContain("8. 이 문단은 표 안이라 항목이 아니다");
  });
});

describe("문서 모델 — 표마다 항목 경로와 원문 오프셋", () => {
  test("표는 자기를 감싼 항목 경로를 갖는다", () => {
    const document = parseDocument(SECTIONED_XML);
    const headTable = document.tables[1];

    expect(document.tables).toHaveLength(2);
    expect(headTable.sectionPath).toEqual([
      "제1부 모집 또는 매출에 관한 사항",
      "II. 증권의 주요 권리내용",
      "8. 기초자산 취득에 관한 사항",
      "가. 기초자산 요약정보",
    ]);
    expect(headTable.section).toBe("8. 기초자산 취득에 관한 사항");
  });

  test("원문 오프셋은 그 위치에서 표가 실제로 시작하는 지점이다", () => {
    const document = parseDocument(SECTIONED_XML);

    for (const entry of document.tables) {
      expect(SECTIONED_XML.slice(entry.charOffset, entry.charOffset + 6)).toBe(
        "<TABLE",
      );
    }
  });

  test("항목 앞에 놓인 표는 그 항목에 속하지 않는다", () => {
    const document = parseDocument(SECTIONED_XML);

    expect(document.tables[0].section).toBe("7. 보고서 전달 절차");
  });

  test("항목 태그가 없는 문서도 표를 잃지 않는다 (좌표만 빈다)", () => {
    const bare = "<DOCUMENT><TABLE><TBODY><TR><TD>가</TD></TR></TBODY></TABLE></DOCUMENT>";
    const document = parseDocument(bare);

    expect(document.tables).toHaveLength(1);
    expect(document.tables[0].section).toBe("");
    expect(document.tables[0].sectionPath).toEqual([]);
  });
});

describe("표 자원 상한", () => {
  test("과도한 span·row·cell 확장을 fail-closed한다", () => {
    expect(() => readTables(`<TABLE><TR><TD COLSPAN="${MAX_TABLE_SPAN + 1}">값</TD></TR></TABLE>`))
      .toThrow("span");
    expect(() => readTables(`<TABLE>${"<TR><TD>값</TD></TR>".repeat(MAX_TABLE_ROWS + 1)}</TABLE>`))
      .toThrow("row");
    expect(() => readTables(`<TABLE><TR>${"<TD>값</TD>".repeat(MAX_TABLE_CELLS_PER_ROW + 1)}</TR></TABLE>`))
      .toThrow("cell");
  });
});

describe("발행사 프로필 — 데이터로 분리된 항목 매핑", () => {
  test("등록된 공모는 전용 프로필로 해석된다", () => {
    const resolved = resolveDocumentProfile("livestock-9");

    expect(resolved.matched).toBe(true);
    expect(resolved.profile.tableName).toBe("기초자산 개체 명세표");
  });

  test("미등록 공모는 폴백 프로필을 쓰고 그 사실이 드러난다", () => {
    const resolved = resolveDocumentProfile("unknown-offer-1");

    expect(resolved.matched).toBe(false);
    expect(resolved.profile.id).toBe(FALLBACK_PROFILE.id);
  });
});

const RCP_NO = "20260806000159";
const RAW_XML_PATH = rawXmlPath(RCP_NO);
const hasRawXml = hasLocalFile(RAW_XML_PATH);

describe.skipIf(!hasRawXml)(
  `원문 회귀 — 일반화한 파서가 기존 표 목록을 그대로 재현한다 ${hasRawXml ? "" : skipReason(RAW_XML_PATH)}`,
  () => {
    test("표 개수·행 구성이 평면 파서와 동일하다", () => {
      const xml = readFileSync(RAW_XML_PATH, "utf8");

      const document = parseDocument(xml);
      const flat = readTables(xml);

      expect(document.tables).toHaveLength(flat.length);
      const rowCounts = (rows: readonly number[]) => [...rows].sort();
      expect(
        rowCounts(document.tables.map((entry) => entry.table.rows.length)),
      ).toEqual(rowCounts(flat.map((table) => table.rows.length)));
    });

    test("개체 명세표는 실제 항목 좌표를 갖는다", () => {
      const document = parseDocument(readFileSync(RAW_XML_PATH, "utf8"));
      const signature = ["고유명칭", "이력번호", "취득시기", "보관장소"];
      const candidates = document.tables.filter((entry) =>
        signature.every((needle) =>
          entry.table.header.some((cell) =>
            cell.replace(/\s/g, "").includes(needle),
          ),
        ),
      );

      expect(candidates).toHaveLength(1);
      expect(candidates[0].section).toBe("8. 기초자산 취득에 관한 사항");
      expect(candidates[0].sectionPath[0]).toContain("제1부");
      expect(candidates[0].charOffset).toBeGreaterThan(0);
      expect(candidates[0].table.rows).toHaveLength(38);
    });
  },
);
