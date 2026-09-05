import {
  PIG_DISCLOSURE_PRODUCTS,
  PIG_MARKET,
  type PigDisclosureProduct,
  type PigMarketSnapshot,
} from "@/lib/content/pig";

export const LIVESTOCK_TRACE_URL =
  "https://www.data.go.kr/data/15058923/openapi.do";

export const PIG_EXTRA_DISTRIBUTION_FILING = {
  filedAt: "2026-08-14",
  rceptNo: "20260814001492",
  reportName: "호가중개시스템을 통한 소액매출 공시서류",
} as const;

export const PIG_REPORT_COPY = {
  breadcrumbBack: "한돈 분석",
  imageAlt: "한돈 분석 대표 이미지",
  reportStatus: "검증 리포트",
  headerMetaPrefix: "DART 공시 기준",
  facts: {
    subscription: "청약 기간",
    offering: "총 공모금액",
    units: "발행 단위",
    farm: "사육 농장",
  },
  sections: {
    summary: "요약",
    filing: "신고서 정보",
    amendment: "정정 이력",
    history: "이행 이력",
    reality: "실재 확인",
    disease: "질병",
    price: "가격 위치",
  },
} as const;

export const PIG_REVIEW_COPY = {
  beginner: {
    label: "처음 읽는 공시",
    title: "공시는 세 단계를 나눠서 읽습니다",
    description:
      "숫자 하나만 보지 않고 누가 적은 사실인지, 같은 대상을 외부 자료와 이을 수 있는지, 무엇이 아직 남아 있는지를 차례로 봅니다.",
    badge: "60초 안내",
    stepsAriaLabel: "한돈 공시 읽기 세 단계",
    steps: [
      {
        number: "1",
        title: "공시 기재값을 찾습니다",
        body: "두수·발행금액·청약 일정과 정정 이력을 확인합니다. 서류 제출 사실과 현재 운영 상태는 서로 다른 정보입니다.",
      },
      {
        number: "2",
        title: "같은 대상을 잇는 근거를 봅니다",
        body: "공시 속 돼지와 외부 이력 원장을 연결할 개체 또는 묶음 식별자가 있는지 확인합니다. 연결 키가 없으면 대조 불가로 남깁니다.",
      },
      {
        number: "3",
        title: "남은 확인 항목을 적습니다",
        body: "공시로 확인한 범위와 외부에서 대조하지 못한 범위를 나누고, 추가로 요청할 원문과 원장을 질문으로 남깁니다.",
      },
    ],
    equationAriaLabel:
      "공시 제출, 실물 확인, 손익 확정은 서로 다른 단계입니다",
    equation: [
      { kind: "term", text: "공시 제출" },
      { kind: "operator", text: "≠" },
      { kind: "term", text: "실물 확인" },
      { kind: "operator", text: "≠" },
      { kind: "term", text: "손익 확정" },
    ],
    termsTitle: "먼저 알아둘 네 가지 용어",
    guideUrl: "https://www.fsc.go.kr/no010101/86064",
    guideLinkLabel: "투자계약증권과 토큰증권 구분 근거 보기",
    terms: [
      {
        term: "투자계약증권",
        definition:
          "공동 사업의 결과에 따라 손익이 달라지는 증권입니다. 이 화면은 DART에 기재된 법적 유형을 기준으로 읽습니다.",
      },
      {
        term: "STO",
        definition:
          "토큰증권의 발행·유통을 가리키는 넓은 표현입니다. 공시에서 확인된 법적 유형과 구분해 봅니다.",
      },
      {
        term: "정정공시",
        definition:
          "처음 제출한 신고서의 내용을 바꾸거나 보완한 문서입니다. 최초본과 최종본의 차이가 검토 근거가 됩니다.",
      },
      {
        term: "경락가격",
        definition:
          "도매시장의 거래 집계값입니다. 기간·지역·등급이 다르면 선택 상품의 실제 판매가격과 직접 비교할 수 없습니다.",
      },
    ],
  },
  layerReview: {
    label: "선택 회차 검토",
    titleSuffix: "를 세 층으로 나눠 봅니다",
    description:
      "공시 문서, 기초자산 연결, 판매·정산을 같은 표에 놓고 확인된 범위와 남은 범위를 구분합니다.",
    badge: "층위별 확인",
    tableCaption: "선택한 한돈 공모의 층위별 검토 결과",
    tableHeaders: ["확인 층위", "상태", "판단 근거"],
    rows: {
      disclosure: {
        label: "공시 계보",
        status: "공시 확인",
      },
      asset: {
        label: "기초자산 연결",
        status: "대조 불가",
      },
      settlement: {
        label: "판매·정산",
        disclosedStatus: "공시 확인",
        pendingStatus: "대조 불가",
      },
    },
    insights: [
      {
        key: "document",
        label: "확인된 범위",
        title: "문서 계보는 한 회차로 따라갈 수 있습니다",
      },
      {
        key: "constraint",
        label: "먼저 볼 제한",
        title: "공시 속 돼지와 외부 원장을 직접 잇지 못했습니다",
      },
      {
        key: "next",
        label: "다음 확인 항목",
        title: "식별자와 정산 근거를 별도로 요청합니다",
      },
    ],
  },
  extraFiling: {
    label: "추가 공시",
    title: "새 유통 관련 공시는 회차 연결을 더 확인해야 합니다",
    description:
      "제출 사실은 확인되지만 제1~3호 중 어느 회차와 어떤 방식으로 연결되는지는 공개 자료만으로 분류하지 못했습니다.",
    badge: "추가 분류 필요",
    body: "이 문서만으로 실제 거래 여부나 정산 상태를 결론 내리지 않고, 관련 원문과 후속 공시를 함께 확인할 항목으로 둡니다.",
    linkLabel: "추가 공시 원문 보기",
  },
  questions: {
    label: "발행사 확인 질문",
    title: "원문 밖의 빈칸은 네 가지 질문으로 남깁니다",
    description:
      "공시 제출 사실만으로 알 수 없는 연결 근거와 정산 자료를 구체적으로 요청하기 위한 질문입니다.",
    badge: "확인 목록",
    listAriaLabel: "발행사에 확인할 네 가지 질문",
    items: [
      "공시상 500두를 가리키는 유효한 농장·돼지·묶음 식별자를 제공할 수 있나요?",
      "소유권, 양도·담보 제한과 같은 돼지의 중복 매각 방지를 확인할 증빙이 있나요?",
      "입식 이후 현재 두수, 감소 사유, 출하 내역과 각 증빙의 기준일은 언제인가요?",
      "제2호 모집금액이 공시 사이에서 600만원 다른 이유와 최종 확정 근거는 무엇인가요?",
    ],
  },
  sources: {
    label: "근거 수집 상태",
    title: "공시 원문·축산 이력 경로·시장 저장본을 함께 봅니다",
    description:
      "세 자료는 확인하는 대상이 다릅니다. DART는 제출 문서를, 축산물이력제는 원장 조회 경로를, 시장 저장본은 월별 거래 집계를 보여줍니다.",
    badge: "정적 자료",
    gridAriaLabel: "한돈 공시·축산 이력·시장 근거 수집 상태",
    dart: {
      label: "DART 원문",
      detail:
        "공시 제출 사실과 문서 기재 내용을 보여주며 농장·돼지·정산 원장을 독립적으로 대조한 자료는 아닙니다.",
      linkLabel: "선택 회차 근거 원문",
    },
    livestockTrace: {
      label: "축산물이력제 원장 경로",
      value: "연결 키 미제공 · 조회 불가",
      detail:
        "공공 OpenAPI 경로는 확인했지만 공시 상품의 돼지와 원장을 잇는 개체·묶음 식별자가 제공되지 않아 선택 회차를 조회하지 못했습니다.",
      linkLabel: "축산물이력제 원장 경로 보기",
    },
    market: {
      label: "시장 통계 저장본",
      linkLabel: "시장 통계 출처 보기",
    },
    disclaimer:
      "이 화면은 공시 기재값·공식 시장 집계·공개 질병 자료를 서로 구분해 보여줍니다. 시장가격과 지역 발생 이력은 선택 상품의 실제 판매가·농장 감염·손익을 뜻하지 않습니다. 매수·청약 결정을 대신하지 않으며 수익률 예측이나 법률·회계 검토를 제공하지 않습니다.",
  },
} as const;

export interface PigReviewLayerRow {
  readonly key: "disclosure" | "asset" | "settlement";
  readonly label: string;
  readonly status: string;
  readonly tone: "document" | "unknown";
  readonly basis: string;
}

export interface PigReviewInsight {
  readonly key: "document" | "constraint" | "next";
  readonly label: string;
  readonly title: string;
  readonly body: string;
}

export interface PigReviewSourceState {
  readonly dartValue: string;
  readonly marketValue: string;
  readonly marketDetail: string;
}

const roundLabel = (product: PigDisclosureProduct): string =>
  `제${product.round}호`;

export const buildPigReviewLayerTitle = (
  product: PigDisclosureProduct,
): string => `${roundLabel(product)}${PIG_REVIEW_COPY.layerReview.titleSuffix}`;

export const buildPigReviewLayerRows = (
  product: PigDisclosureProduct,
): readonly PigReviewLayerRow[] => {
  const settlementBasis = product.settlement.completed
    ? `후속 공시에 ${product.settlement.completedAt ?? "정산일 미기재"} 정산과 출하 ${product.settlement.shippedHeads?.toLocaleString("ko-KR") ?? "미기재"}두가 적혀 있습니다. 계좌·정산 원장은 별도로 확인되지 않았습니다.`
    : "수집한 DART 문서는 발행 완료까지이며 최종 판매·정산 숫자는 공개 자료에서 확인되지 않았습니다.";

  return [
    {
      key: "disclosure",
      label: PIG_REVIEW_COPY.layerReview.rows.disclosure.label,
      status: PIG_REVIEW_COPY.layerReview.rows.disclosure.status,
      tone: "document",
      basis: `최초 신고서부터 정정·투자설명서·발행실적까지 ${product.documents.length}개 문서를 한 회차로 추적할 수 있습니다.`,
    },
    {
      key: "asset",
      label: PIG_REVIEW_COPY.layerReview.rows.asset.label,
      status: PIG_REVIEW_COPY.layerReview.rows.asset.status,
      tone: "unknown",
      basis: `공시상 ${product.offering.heads.toLocaleString("ko-KR")}두와 외부 이력 원장을 잇는 개체·묶음 식별자가 공개 자료에 없습니다.`,
    },
    {
      key: "settlement",
      label: PIG_REVIEW_COPY.layerReview.rows.settlement.label,
      status: product.settlement.completed
        ? PIG_REVIEW_COPY.layerReview.rows.settlement.disclosedStatus
        : PIG_REVIEW_COPY.layerReview.rows.settlement.pendingStatus,
      tone: product.settlement.completed ? "document" : "unknown",
      basis: settlementBasis,
    },
  ];
};

export const buildPigReviewInsights = (
  product: PigDisclosureProduct,
): readonly PigReviewInsight[] => {
  const [document, constraint, next] = PIG_REVIEW_COPY.layerReview.insights;

  return [
    {
      ...document,
      body: `${product.documents.length}개 DART 문서의 접수번호와 제출일을 이용해 최초본부터 발행실적까지 순서를 확인할 수 있습니다.`,
    },
    {
      ...constraint,
      body: `공시상 ${product.offering.heads.toLocaleString("ko-KR")}두에 대응하는 개체·묶음 식별자가 없어 존재·현재 두수·소유 관계를 외부 원장과 대조하지 못했습니다.`,
    },
    {
      ...next,
      body: product.settlement.completed
        ? "후속 공시에 적힌 정산 숫자와 연결되는 최종 정산 원문, 계좌 입금 근거, 비용 명세를 확인합니다."
        : "개체·묶음 식별자와 함께 최종 출하 두수, 판매대금, 비용, 배분액을 잇는 정산 자료를 확인합니다.",
    },
  ];
};

export const buildPigReviewSourceState = (
  product: PigDisclosureProduct,
  market: PigMarketSnapshot,
): PigReviewSourceState => ({
  dartValue: `${product.settlement.sourceFiledAt} · ${product.settlement.sourceLabel}`,
  marketValue: `${market.asOf} 월별 저장본`,
  marketDetail: `${market.filters.skinType}·${market.filters.grade}·${market.filters.region} · ${market.retrievedAt} · SHA-256 ${market.sha256.slice(0, 12)}… · ${market.limitation}`,
});

const collectStrings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
};

export const pigReviewCopyStrings = (): readonly string[] => [
  ...new Set([
    ...collectStrings(PIG_REVIEW_COPY),
    ...collectStrings(PIG_REPORT_COPY),
    ...collectStrings(PIG_EXTRA_DISTRIBUTION_FILING),
    LIVESTOCK_TRACE_URL,
    ...PIG_DISCLOSURE_PRODUCTS.flatMap((product) => {
      const rows = buildPigReviewLayerRows(product);
      const insights = buildPigReviewInsights(product);
      const sourceState = buildPigReviewSourceState(product, PIG_MARKET);

      return [
        buildPigReviewLayerTitle(product),
        ...rows.flatMap((row) => [row.label, row.status, row.basis]),
        ...insights.flatMap((insight) => [
          insight.label,
          insight.title,
          insight.body,
        ]),
        sourceState.dartValue,
        sourceState.marketValue,
        sourceState.marketDetail,
      ];
    }),
  ]),
];
