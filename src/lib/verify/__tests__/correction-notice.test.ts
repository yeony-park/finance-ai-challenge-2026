import { describe, expect, test } from "vitest";

import {
  correctionItemLabel,
  correctionReasonText,
  readCorrectionNotice,
  toIsoDate,
} from "../amend/correction-notice";

const NOTICE_XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT>
<LIBRARY>
<CORRECTION>
<TITLE>정 정 신 고 (보고)</TITLE>
<TABLE><TBODY>
<TR><TD></TD></TR>
<TR><TD>2026년 2월 10일</TD></TR>
</TBODY></TABLE>
<TABLE><TBODY>
<TR><TD>1. 정정대상 공시서류 :</TD><TD>증권신고서</TD></TR>
</TBODY></TABLE>
<TABLE><TBODY>
<TR><TD>2. 정정대상 공시서류의 최초제출일 :</TD><TD>2025년 2월 3일</TD></TR>
</TBODY></TABLE>
<TABLE>
<THEAD>
<TR><TH>항  목</TH><TH>정정요구ㆍ명령관련 여부</TH><TH>정정사유</TH><TH>정 정 전</TH><TH>정 정 후</TH></TR>
</THEAD>
<TBODY>
<TR><TD COLSPAN="5">- 금번 정정은 금융감독원 정정신고서 제출 요구 및 기재내용 추가, 보완을 위한 정정으로서, 정정사항은 "굵은 파란색"으로 기재하였습니다- 단순 오타는 본문에 직접 반영하였습니다.</TD></TR>
<TR><TD COLSPAN="5">I. 모집 또는 매출에 관한 일반사항</TD></TR>
<TR><TD>4. 모집 또는 매출절차 등에 관한 사항</TD><TD>아니요</TD><TD>기재정정</TD><TD>(주1)</TD><TD>(주1)</TD></TR>
<TR><TD COLSPAN="5">III. 투자위험요소</TD></TR>
<TR><TD>3. 기타위험</TD><TD>예</TD><TD>기재정정</TD><TD>(주2)</TD><TD>(주2)</TD></TR>
</TBODY>
</TABLE>
</CORRECTION>
</LIBRARY>
</DOCUMENT>`;

const PLAIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<DOCUMENT><BODY><TABLE><TBODY><TR><TD>본문</TD></TR></TBODY></TABLE></BODY></DOCUMENT>`;

describe("readCorrectionNotice — 정정신고 표에서 무엇이 정정됐는지 읽는다", () => {
  test("원 신고서에는 정정신고 블록이 없어 undefined를 돌려준다", () => {
    expect(readCorrectionNotice(PLAIN_XML)).toBeUndefined();
  });

  test("정정 항목을 소속 장·절과 함께 읽는다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);

    expect(notice?.items.map(correctionItemLabel)).toEqual([
      "I. 모집 또는 매출에 관한 일반사항 · 4. 모집 또는 매출절차 등에 관한 사항",
      "III. 투자위험요소 · 3. 기타위험",
    ]);
  });

  test("정정요구ㆍ명령 관련 여부를 항목마다 구분한다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);

    expect(notice?.items.map((item) => item.isOrderRelated)).toEqual([
      false,
      true,
    ]);
  });

  test("정정 대상 서류와 기재된 날짜를 함께 읽는다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);

    expect(notice?.noticeDate).toBe("2026-02-10");
    expect(notice?.targetDocument).toBe("증권신고서");
    expect(notice?.firstSubmittedOnText).toBe("2025년 2월 3일");
  });

  test("정정 사유는 색깔 표시 안내를 떼고 남긴다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);
    if (!notice) throw new Error("정정신고 블록을 읽지 못했습니다");

    expect(correctionReasonText(notice)).toBe(
      "금번 정정은 금융감독원 정정신고서 제출 요구 및 기재내용 추가, 보완을 위한 정정",
    );
  });
});

describe("toIsoDate — 신고서에 적힌 한글 날짜를 ISO로 옮긴다", () => {
  test("연·월·일 표기를 ISO 날짜로 바꾼다", () => {
    expect(toIsoDate("2026년 2월 3일")).toBe("2026-02-03");
  });

  test("날짜가 아닌 문자열은 빈 값으로 남긴다", () => {
    expect(toIsoDate("증권신고서")).toBe("");
  });
});
