export const FILING_SECTION_TITLE = "신고서 구조 정보";

export const FILING_NOTICE =
  "이 표는 신고서 기재 사항의 요약이며 투자판단이 아닙니다. 원문은 전자공시(DART)에서 접수번호로 열람할 수 있습니다.";

export const FILING_SOURCE_PREFIX = "기재 위치";

export const filingSourceLine = (rcpNo: string): string =>
  `출처 · 증권신고서 원문 (DART 접수번호 ${rcpNo})`;
