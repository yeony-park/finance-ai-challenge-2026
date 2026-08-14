import { describe, expect, test } from "vitest";

import {
  correctionDetailOf,
  correctionItemLabel,
  correctionReasonText,
  focusExcerptPair,
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
<TR><TD>5. 청약기일</TD><TD>아니요</TD><TD>기재정정</TD><TD>2026년 2월 20일</TD><TD>2026년 3월 5일</TD></TR>
</TBODY>
</TABLE>
<P USERMARK="B">(주1) 정정 전</P>
<P>가. 모집 일정 — 청약기일은 2026년 2월 20일부터 2026년 2월 21일까지입니다.</P>
<SPAN USERMARK="B">(주1) 정정 후</SPAN>
<P>가. 모집 일정 — 청약기일은 2026년 3월 5일부터 2026년 3월 6일까지로 변경합니다.</P>
<P USERMARK="B">(주2) 정정 전</P>
<P>아. 일반청약자 배정방법에 따른 위험은 없습니다.</P>
<P USERMARK="B">(주2) 정정 후</P>
<P>아. 일반청약자 배정방법에 따라 배정수량이 달라질 수 있습니다.</P>
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
      "III. 투자위험요소 · 5. 청약기일",
    ]);
  });

  test("정정요구ㆍ명령 관련 여부를 항목마다 구분한다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);

    expect(notice?.items.map((item) => item.isOrderRelated)).toEqual([
      false,
      true,
      false,
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

describe("correctionDetailOf — 항목별 정정 전·후 내용을 해석한다", () => {
  test("(주N) 참조는 본문 발췌 블록으로 풀린다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);
    if (!notice) throw new Error("정정신고 블록을 읽지 못했습니다");

    const first = correctionDetailOf(notice, notice.items[0]);
    expect(first.before).toContain("청약기일은 2026년 2월 20일부터");
    expect(first.after).toContain("2026년 3월 5일부터");
    expect(first.isExcerpt).toBe(true);

    const second = correctionDetailOf(notice, notice.items[1]);
    expect(second.before).toContain("위험은 없습니다");
    expect(second.after).toContain("배정수량이 달라질 수 있습니다");
  });

  test("표 안에 직접 적힌 전·후 값은 그대로 쓴다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);
    if (!notice) throw new Error("정정신고 블록을 읽지 못했습니다");

    const inline = correctionDetailOf(notice, notice.items[2]);
    expect(inline.before).toBe("2026년 2월 20일");
    expect(inline.after).toBe("2026년 3월 5일");
    expect(inline.isExcerpt).toBe(false);
  });

  test("발췌 블록에는 다음 주석의 내용이 섞이지 않는다", () => {
    const notice = readCorrectionNotice(NOTICE_XML);
    if (!notice) throw new Error("정정신고 블록을 읽지 못했습니다");

    const first = correctionDetailOf(notice, notice.items[0]);
    expect(first.before).not.toContain("배정방법");
    expect(first.after).not.toContain("배정방법");
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

describe("focusExcerptPair — 긴 발췌는 변경 지점 앞으로 창을 맞춘다", () => {
  test("공통 접두부가 길면 잘라내고 문맥 80자를 남긴다", () => {
    const shared = "같은 내용 ".repeat(40);
    const pair = focusExcerptPair(`${shared}청약기일 2월 20일`, `${shared}청약기일 3월 5일`);

    expect(pair.before.startsWith("… ")).toBe(true);
    expect(pair.before).toContain("2월 20일");
    expect(pair.after).toContain("3월 5일");
    expect(pair.before.length).toBeLessThan(shared.length);
  });

  test("짧은 발췌나 한쪽이 빈 경우는 그대로 둔다", () => {
    expect(focusExcerptPair("가", "나")).toEqual({ before: "가", after: "나" });
    expect(focusExcerptPair("", "신설 내용")).toEqual({ before: "", after: "신설 내용" });
  });
});
