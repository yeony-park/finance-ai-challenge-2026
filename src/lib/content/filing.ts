export const FILING_SECTION_TITLE = "신고서 구조 정보";

export const FILING_SECTION_LEAD =
  "증권신고서의 기재 사항 중 확인 질문과 맞닿는 항목을 구조화해 옮겼습니다 — 대조 판정이 아니며, 원문 문언이 기준입니다.";

export const FILING_NOTICE =
  "이 표는 신고서 기재 사항의 요약이며 투자판단이 아닙니다. 원문은 전자공시(DART)에서 접수번호로 열람할 수 있습니다.";

export const FILING_SOURCE_PREFIX = "기재 위치";

export const filingSourceLine = (rcpNo: string): string =>
  `출처 · 증권신고서 원문 (DART 접수번호 ${rcpNo})`;
