/**
 * 서비스 정체성 상수 — 명칭은 팀 회의 전까지 가칭이다(PRD Open Questions).
 * 화면 곳곳에 문자열을 흩뿌리지 않고 여기 한 곳에서만 바꾼다.
 */

/** 가칭 워드마크 */
export const SERVICE_NAME = "공시대조";

/** 워드마크 옆 역할 문구 — 이름만으로 무엇인지 알 수 없으니 항상 붙인다 */
export const SERVICE_ROLE = "조각투자 공시 대조 검증";

/** 한 문장 서비스 정의 — 메타데이터와 푸터가 공유한다 */
export const SERVICE_DEFINITION =
  "발행사가 증권신고서에 공시한 주장을 국가 공공데이터와 자동으로 대조하고, 정정이 접수되면 다시 대조하는 독립 검증 레이어입니다.";

/** 대표 검증 리포트가 붙어 있는 공모 식별자 — 리포트 상세 라우트 키 */
export const FEATURED_OFFER_ID = "bankcow-9";

/** 대표 검증 리포트 경로 (상세 화면은 후속 단계에서 생성된다) */
export const FEATURED_OFFER_HREF = `/offers/${FEATURED_OFFER_ID}`;

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
