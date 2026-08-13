/**
 * 서비스 정체성 상수 — 명칭은 팀 회의 전까지 가칭이다(PRD Open Questions).
 * 화면 곳곳에 문자열을 흩뿌리지 않고 여기 한 곳에서만 바꾼다.
 */

/** 가칭 워드마크 */
export const SERVICE_NAME = "공시대조";

/** 워드마크 옆 역할 문구 — 이름만으로 무엇인지 알 수 없으니 항상 붙인다 */
export const SERVICE_ROLE = "조각투자 공시 대조 검증";

/**
 * 한 문장 서비스 정의(표준문) — 화면에서 서비스가 주어인 문장은 이 한 줄뿐이다.
 * 메타데이터·OG description도 이 값을 공유한다.
 */
export const SERVICE_DEFINITION = "증권신고서를 국가 공공데이터와 대조합니다.";

/**
 * 대표 검증 리포트가 붙어 있는 공모 식별자 — 리포트 상세 라우트 키.
 * 공개 URL·데이터에 발행사 브랜드명을 남기지 않는다(익명화 원칙) — 자산군 기준 중립 id를 쓴다.
 */
export const FEATURED_OFFER_ID = "livestock-9";

/** 대표 검증 리포트 경로 */
export const FEATURED_OFFER_HREF = `/offers/${FEATURED_OFFER_ID}`;

/**
 * 리포트가 공개된 공모 — `/offers/[id]`가 정적으로 굽는 목록이자 허용목록이다.
 * 대조 결과가 나오기 전에는 화면을 만들어 두지 않는다(목록에 넣지 않으면 404).
 */
export const PUBLISHED_OFFER_IDS: readonly string[] = [FEATURED_OFFER_ID];

export const isPublishedOfferId = (offerId: string): boolean =>
  PUBLISHED_OFFER_IDS.includes(offerId);

/** 대조에 쓰는 공공 데이터 출처 — 전부 공개·무료 */
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
];
