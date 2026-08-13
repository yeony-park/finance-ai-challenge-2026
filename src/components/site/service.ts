export const SERVICE_NAME = "공시대조";

export const SERVICE_ROLE = "조각투자 공시 대조 검증";

export const SERVICE_DEFINITION = "증권신고서를 국가 공공데이터와 대조합니다.";

export interface DataSource {
  readonly name: string;
  readonly holder: string;
  readonly use: string;
}

export const DATA_SOURCES: readonly DataSource[] = [
  {
    name: "전자공시(DART) 증권신고서·정정신고서",
    holder: "금융감독원",
    use: "검증 대상 문서 수집과 정정 접수 감시",
  },
  {
    name: "축산물이력제 개체정보",
    holder: "축산물품질평가원",
    use: "공시된 기초자산 개체의 실재 확인",
  },
  {
    name: "축산물 등급판정·경락 정보",
    holder: "축산물품질평가원",
    use: "공시된 취득원가의 시장 위치 대조",
  },
  {
    name: "상업업무용 부동산 매매 신고 자료(실거래가)",
    holder: "국토교통부",
    use: "공시된 매각 내역 확인과 공모가·매각가의 실거래 비교군 내 위치 대조",
  },
];
