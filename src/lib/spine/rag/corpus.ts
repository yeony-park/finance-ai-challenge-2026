/**
 * 출처 레지스트리 — 인용 가능한 공식 문서의 화이트리스트.
 * 주제 확정 후 실제 코퍼스로 교체한다. 샘플은 메커니즘 검증용(보이스피싱 공식 절차 요약).
 * 원칙: 여기 등록되지 않은 출처는 인용으로 인정하지 않는다 (RAG 오염 3세대 공격 방어).
 */
import type { Citation, CorpusDoc } from "../types";

export const SAMPLE_CORPUS: readonly CorpusDoc[] = [
  {
    id: "counterscam-112",
    title: "전기통신금융사기 통합신고대응센터 안내",
    url: "https://www.counterscam112.go.kr",
    issuer: "경찰청·금융감독원·KISA",
    content:
      "보이스피싱 피해 발생 시 112로 신고하면 경찰·금감원·KISA·통신3사가 합동으로 초동 대응한다. 지급정지는 송금 금융회사 콜센터 또는 112를 통해 요청할 수 있다.",
  },
  {
    id: "fss-remedy-procedure",
    title: "전기통신금융사기 피해금 환급 절차",
    url: "https://www.fss.or.kr",
    issuer: "금융감독원",
    content:
      "지급정지 요청 후 3영업일 이내에 경찰서 발급 사건사고사실확인원 등 서류를 갖춰 금융회사에 서면으로 피해구제를 신청해야 한다. 이후 약 2개월의 채권소멸 공고를 거쳐 피해금 환급이 진행된다.",
  },
  {
    id: "finlife-products",
    title: "금융상품통합비교공시(금융상품한눈에)",
    url: "https://finlife.fss.or.kr",
    issuer: "금융감독원",
    content:
      "전 금융권의 정기예금·적금·주택담보대출·전세자금대출·개인신용대출 상품 조건과 금리를 비교 공시한다. 오픈API로 동일 데이터를 제공한다.",
  },
  // ---- 약관 위험조건 검증 도메인 코퍼스 (주제 확정 후 추가) ----
  {
    id: "std-disease-injury",
    title: "질병·상해보험 표준약관 (보험업감독업무시행세칙 별표15)",
    url: "https://law.go.kr/행정규칙/보험업감독업무시행세칙",
    issuer: "금융감독원",
    content:
      "보험상품 표준약관은 보험업감독업무시행세칙 제5-13조 별표15로 관리된다. 표준약관은 해지권 행사 기간(안 날부터 1개월), 면책 사유의 한정 열거, 계약자 의사표시에 의한 갱신 등 소비자 보호 기준선을 정한다.",
  },
  {
    id: "act-terms-regulation",
    title: "약관의 규제에 관한 법률 제6~14조 (무효 조항 유형)",
    url: "https://law.go.kr/법령/약관의규제에관한법률",
    issuer: "법제처 국가법령정보센터",
    content:
      "신의성실 위반(6조), 부당 면책(7조), 과중한 손해배상 예정(8조), 해지권 제한·확대(9조), 급부의 일방 결정(10조), 고객 권익 침해(11조), 의사표시 의제(12조), 대리인 책임 가중(13조), 소제기 제한(14조) 유형의 약관 조항은 무효가 될 수 있다.",
  },
  {
    id: "ftc-decisions",
    title: "공정거래위원회 결정문 (불공정약관 심결례)",
    url: "https://case.ftc.go.kr",
    issuer: "공정거래위원회",
    content:
      "2008년 이후 공개된 의결서·시정권고 등 결정문에서 불공정약관 시정 사례를 조회할 수 있다. 유형별 심결례는 약관규제법 조문 체계로 분류돼 있다.",
  },
  {
    id: "fss-dispute-cases",
    title: "금융감독원 분쟁조정 사례",
    url: "https://www.fss.or.kr",
    issuer: "금융감독원",
    content:
      "보험 약관 조항 유형이 실제 분쟁으로 이어진 조정 사례를 통합검색으로 조회할 수 있다.",
  },
];

const byId = new Map(SAMPLE_CORPUS.map((doc) => [doc.id, doc]));

export const findDoc = (id: string): CorpusDoc | undefined => byId.get(id);

export const isRegisteredSource = (id: string): boolean => byId.has(id);

/** abstain 응답에 안내할 공식 채널 (코퍼스에서 파생) */
export const officialChannels = (): readonly Citation[] =>
  SAMPLE_CORPUS.map((doc) => ({
    sourceId: doc.id,
    title: doc.title,
    url: doc.url,
  }));

/** 시스템 프롬프트에 주입할 코퍼스 컨텍스트 직렬화 */
export const corpusAsContext = (): string =>
  SAMPLE_CORPUS.map(
    (doc) => `[${doc.id}] ${doc.title} (${doc.issuer})\n${doc.content}`,
  ).join("\n\n");
