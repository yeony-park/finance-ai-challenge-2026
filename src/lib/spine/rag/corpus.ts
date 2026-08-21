import type { Citation, CorpusDoc } from "../types";

export const SAMPLE_CORPUS: readonly CorpusDoc[] = [
  {
    id: "dart-viewer",
    kind: "public_record",
    title: "전자공시시스템 DART — 증권신고서·정정신고서 원문",
    url: "https://dart.fss.or.kr",
    issuer: "금융감독원",
    content:
      "투자계약증권 공모의 증권신고서와 정정신고서 원문을 열람할 수 있다. 발행사가 제시한 기초자산 명세·공모 조건·수익 배분 구조는 모두 이 원문이 기준이며, 대조 결과에 붙는 좌표(문서 위치)도 이 원문을 가리킨다.",
  },
  {
    id: "opendart-filings",
    kind: "public_record",
    title: "OpenDART 공시검색 API (list.json · document.xml)",
    url: "https://opendart.fss.or.kr",
    issuer: "금융감독원",
    content:
      "공시 목록 조회(list.json)와 원문 문서 조회(document.xml)를 제공한다. 투자계약증권은 구조화 API 대상이 아니라 목록 조회 후 원문을 직접 파싱해야 한다. 정정신고서는 같은 공모의 후속 접수 건으로 조회되며, 정정 계보 추적과 재검증의 입력이 된다.",
  },
  {
    id: "livestock-trace",
    kind: "public_record",
    title: "축산물이력제 개체정보 (이력번호 조회)",
    url: "https://www.mtrace.go.kr",
    issuer: "농림축산식품부 · 축산물품질평가원",
    content:
      "개체 이력번호로 출생일·품종·성별·사육 농장 등록 이력을 조회한다. 오픈API는 data.go.kr 15058923으로 제공된다. 신고서에 적힌 개체가 공적 원장에 실재하는지 대조하는 근거이며, 원장 기재와 값이 다르면 '원장 불일치', 조회 자체가 안 되면 '대조 불가'로 표시할 뿐 허위로 단정하지 않는다.",
  },
  {
    id: "ekape-auction-price",
    kind: "public_record",
    title: "축산물등급판정정보 — 소도체 등급별 경락가격",
    url: "https://www.ekapepia.com",
    issuer: "축산물품질평가원",
    content:
      "품종·성별·등급·월별 소도체 경락가격을 제공한다. 오픈API는 data.go.kr 15058822이며 개발계정 호출 한도 때문에 월 집계를 사전 수집해 캐시로 사용한다. 발행사 제시 가격이 같은 조건 분포의 어느 위치(백분위)에 있는지 표시하는 데 쓰이며, 위치 제시일 뿐 가격 적정성 판단이 아니다.",
  },
  {
    id: "molit-rtms-nrg-trade",
    kind: "public_record",
    title: "국토교통부 상업업무용 부동산 매매 실거래가",
    url: "https://rt.molit.go.kr",
    issuer: "국토교통부",
    content:
      "상업업무용 부동산의 신고된 매매 실거래 내역을 제공한다. 오픈API는 data.go.kr RTMSDataSvcNrgTrade다. 동일 지역·용도 비교군의 단가 분포에서 공모가·매각가의 백분위 위치를 계산하며, 비교군 표본이 얇으면 '대조 불가'로 표시한다.",
  },
  {
    id: "capital-markets-decree-2026",
    kind: "regulation",
    title: "자본시장과 금융투자업에 관한 법률 시행령 (2026-07-28 시행 개정)",
    url: "https://law.go.kr/법령/자본시장과금융투자업에관한법률시행령",
    issuer: "금융위원회 · 법제처 국가법령정보센터",
    content:
      "소액공모 한도를 10억원에서 30억원으로 확대하면서 조각투자증권은 특례에서 배제해, 공모금액과 무관하게 증권신고서 제출을 의무화했다. 금융위가 밝힌 취지는 기초자산 가치평가와 투자위험을 충실히 알리게 하는 것이다. 이 개정으로 대조 가능한 공시 원문이 전수 확보된다.",
  },
  {
    id: "verification-methodology",
    kind: "service_doc",
    title: "본 서비스 검증 방법론 (/methodology)",
    url: "/methodology",
    issuer: "조각투자 공시 대조 검증 (본 서비스)",
    content:
      "claim 추출 → 검증가능성 판별 → 공개 원장 대조 → 판정의 4단계로 동작한다. 판정은 일치·원장 불일치·대조 불가 3값이고, 근거가 0건이면 판정을 내지 않는다. 자료 부족 자체는 부정 판정 사유가 아니며, 중대성 등급은 부여하지 않는다. 투자 권유·자문·가치 판단은 제공 범위 밖이다.",
  },
];

const byId = new Map(SAMPLE_CORPUS.map((doc) => [doc.id, doc]));

export const findDoc = (id: string): CorpusDoc | undefined => byId.get(id);

export const isRegisteredSource = (id: string): boolean => byId.has(id);

export const officialChannels = (): readonly Citation[] =>
  SAMPLE_CORPUS.filter((doc) => doc.kind !== "service_doc").map((doc) => ({
    sourceId: doc.id,
    title: doc.title,
    url: doc.url,
  }));

export const corpusAsContext = (): string =>
  SAMPLE_CORPUS.map(
    (doc) => `[${doc.id}] ${doc.title} (${doc.issuer})\n${doc.content}`,
  ).join("\n\n");
