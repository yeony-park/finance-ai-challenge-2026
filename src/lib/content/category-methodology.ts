export interface CategoryExplanation {
  readonly title: string;
  readonly items: readonly { readonly label: string; readonly description: string }[];
  readonly sourceNote?: string;
}

export const METHODOLOGY_DATA_NOTICES = {
  art: "미술품 목록과 상세의 상품·가격·운영 이력은 시연용 더미데이터입니다. 아래에서 설명하는 실제 DART 공시 자료와는 구분됩니다.",
  "real-estate": "부동산 목록과 상세의 투자조건·수익·운영 이력은 시연용 더미데이터입니다. 건물명과 건축물대장 등 실제 공개정보를 바탕으로 가상의 공모를 구성했습니다.",
} as const;

export const CattleCrossCheckDiagramContent: CategoryExplanation = {
  title: "공시와 대조 자료",
  items: [
    {
      label: "원장 대조",
      description: "증권신고서에 적힌 개체 정보를 축산물이력제 원장과 대조합니다.",
    },
    {
      label: "시장 위치",
      description: "공모가를 경락가와 비교합니다.",
    },
    {
      label: "정정 추적",
      description: "최초 공시부터 현재 공시까지 정정 이력을 확인합니다.",
    },
  ],
};

export const AnalysisEvidenceDiagramContent: CategoryExplanation = {
  title: "확인 범위와 근거",
  items: [
    {
      label: "대조 자료",
      description: "공시 원문과 공적 원장·통계를 연결합니다.",
    },
    {
      label: "대조 결과",
      description: "확인된 값과 차이를 기록합니다.",
    },
    {
      label: "현재 확인할 수 없는 범위",
      description: "확인이 불가능한 범위와 사유를 함께 표시합니다.",
    },
  ],
  sourceNote: "근거 · 원문 · 출처 · 기준일",
};

export const PigDisclosureOverviewDiagramContent: CategoryExplanation = {
  title: "공시와 대조 자료",
  items: [
    {
      label: "회차·가격",
      description: "DART에 공시된 한돈 STO 제1호·제2호·제3호를 확인합니다.",
    },
    {
      label: "시장 참고",
      description: "돼지 경락가 월 통계를 가격 참고 자료로 사용합니다.",
    },
    {
      label: "개체 원장",
      description: "개체 이력번호가 없어 원장 대조는 불가합니다.",
    },
  ],
};

export const PigAnalysisScopeDiagramContent: CategoryExplanation = {
  title: "확인 범위와 근거",
  items: [
    {
      label: "대조 자료",
      description: "최초·정정 공시와 발행실적보고서를 돼지 경락가 월 통계와 함께 확인합니다.",
    },
    {
      label: "확인한 범위",
      description: "회차·공모가·발행·정산에 관해 공시된 내용을 확인합니다.",
    },
    {
      label: "현재 확인할 수 없는 범위",
      description: "개체·출하 로트·실제 정산가격은 확인할 수 없습니다.",
    },
  ],
  sourceNote: "근거 · 원문 · 출처 · 기준일",
};

export const ArtDisclosureOverviewDiagramContent: CategoryExplanation = {
  title: "공시와 대조 자료",
  items: [
    {
      label: "공시 문서",
      description: "DART의 미술품 투자계약증권 5건에 대한 신고서·투자설명서·발행실적보고서를 확인합니다.",
    },
    {
      label: "공모가 구성",
      description: "공모가·취득가·발행비용을 정리합니다.",
    },
    {
      label: "독립 원장",
      description: "독립 경매·보관 원장은 연결되지 않아 대조할 수 없습니다.",
    },
  ],
};

export const ArtAnalysisScopeDiagramContent: CategoryExplanation = {
  title: "확인 범위와 근거",
  items: [
    {
      label: "검산 자료",
      description: "공시 원문에 적힌 공모가·취득가·발행비용을 검산합니다.",
    },
    {
      label: "확인한 범위",
      description: "문서 좌표·공모금액·구성 산식을 확인합니다.",
    },
    {
      label: "현재 확인할 수 없는 범위",
      description: "독립 경매 낙찰·현재 보관·처분과 회수는 확인할 수 없습니다.",
    },
  ],
  sourceNote: "근거 · 원문 · 접수일 · 기준일",
};

export const RealEstateVerificationOverviewDiagramContent: CategoryExplanation = {
  title: "공시와 대조 자료",
  items: [
    {
      label: "소재지 실재",
      description: "종료된 공모의 공모 공고·매각 공시와 건축물대장 표제부를 대조합니다.",
    },
    {
      label: "가격 위치",
      description: "법정동 실거래 신고 비교군에서 공모가·매각가의 위치를 확인합니다.",
    },
    {
      label: "이행 대조",
      description: "공시된 매각금액·매각일을 확인합니다.",
    },
  ],
};

export const RealEstateAnalysisScopeDiagramContent: CategoryExplanation = {
  title: "확인 범위와 근거",
  items: [
    {
      label: "대조 자료",
      description: "공모·매각 공시의 소재지·공모가·매각가·매각일을 건축물대장·실거래 신고와 연결합니다.",
    },
    {
      label: "대조하는 범위",
      description: "건물 단위 실재·총액 기준 가격 위치·매각 내역을 대조합니다.",
    },
    {
      label: "확인이 제한됨",
      description: "층·호 소유 구조·제곱미터 단가·DART 정정 계보는 확인이 제한됩니다.",
    },
  ],
  sourceNote: "근거 · 공고·공시 · 원장 · 기준일",
};
