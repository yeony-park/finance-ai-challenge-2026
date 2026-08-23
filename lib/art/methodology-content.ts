/**
 * Stage 3 copy contract for the art-analysis demo.
 *
 * This is display copy only.  It describes the implemented art MVP and does
 * not add an assessment rule or turn missing data into a value.
 */
export const ART_DEMO_METHODOLOGY = {
  anchor: "art-analysis-demo",
  version: "art-mvp-v1.0",
  title: "미술품 분석 DEMO 방법론",
  intro:
    "공시·경매·플랫폼 저장본을 네 분석축으로 나누어 사실과 계산을 보여주는 데모입니다. 누락·충돌·현재성 만료는 확인 불가 또는 판정 보류로 남깁니다. 투자 권유, 자문, 수익률·가격 예측이 아닙니다.",
  axes: [
    {
      key: "price",
      title: "공모가격",
      description:
        "총 공모금액·작품 취득가·공개 비용을 저장 사실로 연결하고, 총액−취득가와 공개 비용을 뺀 미설명 차액, 취득가 대비 차이율을 계산합니다. 취득가나 총액이 없으면 감정가로 대체하지 않으며 null을 0으로 바꾸지 않습니다. 값이 누락·충돌하거나 위험 규칙의 기준일(기본 365일)을 넘으면 해당 규칙은 판정 보류입니다. 계산값은 가격 적정성이나 수익률을 뜻하지 않습니다.",
      evidence: [
        "공모 문서·상품 저장본의 총 공모금액, 작품 취득가, 공개 비용, 기준일",
        "priceDifference·pricePremiumRate·unexplainedDifference·sumDisclosedCosts 계산",
        "price_identity·fact_currentness·correction_lineage 위험 규칙",
      ],
    },
    {
      key: "artist",
      title: "작가·비교표본",
      description:
        "작가의 최근 3년 경매 출품·낙찰·유찰과 낙찰률, 현재 작품에 연결된 동일 시리즈·유사 비교표본을 분리해 표시합니다. 검색의 최근 거래량은 2023-08-15 이후 경매 기록으로 세고, 낙찰률은 같은 기간 sold/(sold+unsold)로 계산합니다. 통화가 확인되지 않거나 KRW가 아닌 금액은 KRW 통계에 섞지 않습니다. 표본 부족·식별 누락·충돌·현재성 만료는 추정하지 않으며, 비교 충분성 fact가 없거나 불확실하면 위험 규칙은 판정 보류입니다.",
      evidence: [
        "AuctionRecord·ComparableRecord·AnnualAuctionMetric 저장본",
        "AUCTION_METRIC_START(2023-08-15) 이후 거래량·recentSellThroughRate",
        "artwork_identity·comparable_sufficiency·fact_currentness 위험 규칙",
      ],
    },
    {
      key: "exit",
      title: "회수·처분",
      description:
        "목표·실제 보유기간, 상품 상태와 생애주기, 처분 방식, 실제 매각·분배 금액, 지연 일수를 구분해 보여줍니다. 기록된 양의 delayDays만 평균 지연개월에 넣고, 청산 완료·지연·손실확정 기록으로 기간 내 청산률을 계산합니다. 현재 상태·목표기간·처분 결과가 없거나 서로 충돌하거나 오래되면 확인 불가로 남기며 회수 시점이나 금액을 예측하지 않습니다. 회수 축은 데모 분석에 표시되지만 위험 엔진의 필수 fact를 대신하지 않습니다.",
      evidence: [
        "Offering의 targetHoldingMonths·actualHoldingMonths·lifecycle·exitMethod·처분 금액",
        "TrackRecord의 status·delayDays·soldAt·liquidatedAt·정산 필드",
        "averageDelayMonths·onTimeLiquidationRate 계산 및 원문 기준일·상태 충돌",
      ],
    },
    {
      key: "platform",
      title: "플랫폼 이력",
      description:
        "플랫폼별 과거 상품의 매각·청산·반환·지연 상태와 지연 일수를 검증된 저장 스냅샷에서 레코드·뷰로 정규화해 연결하되 sourcePayload·sourceIds·sourceUrl·기준일을 보존합니다. 아트앤가이드 187건, 아트투게더 145건, TESSA 6건은 각각 다른 자체 게시·공시 자료로 보며 법적 발행사 청산 실적으로 자동 합산하지 않습니다. 플랫폼별 통화·상태·발행사 연결이 없거나 충돌·현재성 만료가 있으면 미확인으로 남기고, 자체 게시 이력만으로 성공·수익을 단정하지 않습니다.",
      evidence: [
        "Platform·TrackRecord와 플랫폼별 sourceDataset·sourceIds·기준일",
        "artnguide_track_records 187건·weshareart_research 145건·tessa_sale_records 6건",
        "플랫폼 자체 게시·정산 공시 및 independent verification 제한",
      ],
    },
  ],
  verdicts: [
    {
      key: "worth_considering",
      label: "해볼 만함",
      definition:
        "상품 AnalysisResult에 저장된 고정 DEMO 표시 레이블 해볼 만함입니다. 네 분석축에서 다시 계산하거나 재분류한 등급이 아닙니다. 매수·청약 권유가 아닙니다.",
    },
    {
      key: "conditional",
      label: "조건부 해볼 만함",
      definition:
        "상품 AnalysisResult에 저장된 고정 DEMO 표시 레이블 조건부 해볼 만함입니다. 네 분석축에서 다시 계산하거나 재분류한 등급이 아닙니다. 투자 판단이나 보장을 뜻하지 않습니다.",
    },
    {
      key: "caution",
      label: "주의",
      definition:
        "상품 AnalysisResult에 저장된 고정 DEMO 표시 레이블 주의입니다. 네 분석축에서 다시 계산하거나 재분류한 등급이 아닙니다. 손실 확정이나 매도 권유가 아닙니다.",
    },
    {
      key: "danger",
      label: "위험",
      definition:
        "상품 AnalysisResult에 저장된 고정 DEMO 표시 레이블 위험입니다. 네 분석축에서 다시 계산하거나 재분류한 등급이 아닙니다. 매수·매도 결론이 아닙니다.",
    },
  ],
  principles: [
    {
      title: "사실과 계산을 분리합니다",
      description:
        "원문·저장본의 값은 확인된 사실로, 차이율·낙찰률·지연개월은 코드 계산으로 표시합니다. 계산값을 새로운 사실이나 수익률 예측으로 바꾸지 않습니다.",
    },
    {
      title: "저장 verdict·위험 엔진·AI를 분리합니다",
      description:
        "상품의 저장 AnalysisResult verdict는 네 고정 DEMO 표시 레이블 중 하나입니다. 별도 art-risk-v1 위험 엔진에서 필수 fact가 누락·충돌·현재성 만료이면 decisionStatus는 not_assessed, verdict는 null이며, 이 평가는 네 상품 verdict를 만들거나 대체하지 않습니다. AI는 근거가 붙은 설명·질의응답 보조일 뿐 판정값을 만들지 않습니다. 저장 verdict와 위험 평가 판정값은 AI가 만들지 않습니다.",
    },
    {
      title: "날짜와 출처를 함께 둡니다",
      description:
        "핵심 사실에는 sourceUrl·asOfDate·collectedAt를 연결하고, 저장된 값과 실시간 OpenDART 원문 ZIP 수신 확인을 구분합니다. 기준일이 없거나 오래된 값은 현재 사실로 포장하지 않습니다.",
    },
    {
      title: "결측을 채우지 않습니다",
      description:
        "null·미확인·충돌을 0이나 추정값으로 바꾸지 않습니다. 자료 부족은 부정 판정의 근거가 아니며, 필요한 근거가 없으면 확인 불가 또는 판정 보류로 남깁니다.",
    },
    {
      title: "데모의 경계를 지킵니다",
      description:
        "이 네 축과 네 verdict는 가상 DEMO 상품을 포함한 art-mvp-v1.0 시연용입니다. 데이터 커버리지 전체를 뜻하지 않으며, 개인화된 매수·매도 권유·자문·원금 보장·수익률 또는 가격 예측을 제공하지 않습니다.",
    },
  ],
  sourcePriority: [
    "법정 공시",
    "공공기관",
    "공식 공모 문서",
    "경매사 기록",
    "작가·기관 공식 자료",
    "신뢰 가능한 제3자",
  ],
} as const;
