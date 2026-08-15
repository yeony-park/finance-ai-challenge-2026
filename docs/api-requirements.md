# 한돈 공시 대조 API 준비 목록

기준일: 2026-08-15 KST

## 지금 발급받을 것

| 우선순위 | 준비 항목 | 키 | 별도 활용신청 |
| --- | --- | --- | --- |
| P0 | OpenDART | `OPENDART_API_KEY` | 인증키 신청 |
| P0 | 공공데이터포털 | `DATA_GO_KR_SERVICE_KEY` | `15058923`, `15058822` 각각 신청 |
| P0 | 데이터젠 상품↔기초자산 매핑 | 공개 API 없음 | 서면 제공·사용 허가 |
| P1 | 농식품부 가축질병 API | `MAFRA_API_KEY` | 동적 감시가 필요할 때만 신청 |
| P2 | AI 추출·설명 | `OPENAI_API_KEY` | 결정론적 대조 연결 후 선택 |

키는 채팅, Git, 브라우저 코드에 넣지 않는다. 로컬은 `.env.local`, 배포는 Vercel의 server environment variable에만 저장한다.

## 1. OpenDART — P0

- 신청: [OpenDART 인증키 신청](https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do)
- 공시 목록: `GET https://opendart.fss.or.kr/api/list.json`
  - 주요 파라미터: `crtfc_key`, `corp_code`, `bgn_de`, `end_de`, `last_reprt_at`, `pblntf_ty`, `page_no`, `page_count`
  - 최초·정정본을 모두 보존하려면 `last_reprt_at=N`을 사용한다.
- 회사 고유번호: `GET https://opendart.fss.or.kr/api/corpCode.xml`
  - ZIP/XML에서 데이터젠의 `corp_code`를 찾는다.
- 원문 파일: `GET https://opendart.fss.or.kr/api/document.xml`
  - `rcept_no`로 ZIP/XML 원문을 받고 접수번호, 보고서명, 접수일, 해시, 정정 계보를 저장한다.
- 공식 가이드: [공시검색](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001), [고유번호](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019018), [원문파일](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019003)

`C005` 분류만으로 투자계약증권을 확정하지 않고 실제 `report_nm`과 원문을 함께 확인한다.

## 2. 축산물통합이력정보 — P0

- 활용신청: [공공데이터포털 15058923](https://www.data.go.kr/data/15058923/openapi.do)
- 서비스: `animalTrace/traceNoSearch`
- 필수 입력: `serviceKey`, `traceNo`
- 조건 입력: `optionNo`, 묶음 구성업체의 `corpNo`
- 돼지 검토 옵션:
  - `1`: 사육
  - `3`: 도축
  - `4`: 포장
  - `8`: 묶음 기본정보
  - `9`: 묶음 구성내역

이 API는 상품명이나 농장명으로 돼지를 찾아주지 않는다. 유효한 `pigNo` 또는 `lotNo`를 먼저 받아야 하며, 묶음 조회에는 `corpNo`가 추가로 필요할 수 있다. 조회 성공은 소유권 증명이 아니다.

응답의 농장주명, 상세주소, 사업자번호는 사용자 화면·로그·AI 입력에서 제거한다. 공식 서비스 URL이 HTTP로 안내되므로 브라우저에서 직접 호출하지 않고 서버에서 호출하며, 운영 전 HTTPS 지원 주소를 축산물품질평가원에 확인한다.

## 3. 돼지 등급·경락가격 — P0

- 활용신청: [축산물등급판정정보 15058822](https://www.data.go.kr/data/15058822/openapi.do)
- 같은 `DATA_GO_KR_SERVICE_KEY`를 사용할 수 있지만 `15058923`과 별도로 활용신청해야 한다.
- 우선 사용할 기능:
  - `pigRepresentativePrice`: `startYmd`, `endYmd`, 페이지 조건으로 돼지 대표가격 조회
  - `pigGrade`: `startYmd`, `endYmd`, `skinYn`, `sexCd`, `egradeExceptYn`으로 등급·시장별 집계 조회
  - `pigPriceDetail`: `abattCd`, 날짜, 탕박/박피, 성별 조건으로 두수·도체중·평균/최저/최고가격 조회

기존 조사에서 후보였던 `15057912`는 현재 전국 돼지 MVP에 적합하지 않아 사용하지 않는다. 키가 늦으면 [돼지 등급별 경락가격 통계표 15148902](https://www.data.go.kr/data/15148902/fileData.do)를 공식 다운로드해 시장 배경 스냅샷으로 사용할 수 있다.

가격 API는 필터별 시장 집계이지 상품 로트의 실제 정산 내역이 아니다. 직접 대조하려면 데이터젠에서 도축장 코드 `abattCd`, 출하·경매일, 탕박/박피, 성별, 등급, 도체중, 실제 단가와 매각대금을 받아야 한다.

## 4. ASF·가축질병 — P1

MVP는 키 없이 [농식품부 ASF 발생현황](https://mafra.go.kr/FMD-AI2/2145/subview.do)의 공식 PDF/HWP/HWPX를 내려받아 기준일·수집일·파일 해시를 저장한다. 공개 지도 좌표는 실제 농장 위치가 아닐 수 있으므로 시군·발생일 맥락까지만 표시한다.

자동 갱신이 필요할 때만 다음을 추가한다.

- 데이터: [농식품부 가축질병발생정보](https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20151204000000000563&service_ty=&filter_ty=G&sort_id=regist_dt&s_data_nm=&cl_code=&instt_id=)
- 신청: [MAFRA OpenAPI 이용신청](https://data.mafra.go.kr/apply/indexApiPrcuseReqst.do)
- API ID: `Grid_20151204000000000316_1`
- 주요 필드: 발생번호, 축종, 발생일, 진단기관 코드·명칭

응답에 농장명과 법정동 정보가 포함될 수 있으므로 공개 화면에는 시군 수준의 파생값만 사용한다. 특정 시군의 발생 사실만으로 상품 농장의 감염이나 손익을 판단하지 않는다.

## 5. 데이터젠·핀돈 제공 데이터 — P0 블로커

[핀돈](https://findon.kr/) 공개 화면을 자동 수집하는 대신 데이터젠에 사용 허가를 받은 샘플 파일 또는 API를 요청한다. 최소 요청 데이터는 다음과 같다.

- 상품 회차 ID와 DART `rcept_no`, 공시 버전
- 상품↔`farmUniqueNo`↔`pigNo`↔`lotNo`↔`corpNo` 매핑과 기준일
- 입식·폐사·출하·도축 사건의 일시, 두수, 증빙 URI와 해시
- 출하별 도축장 코드, 탕박/박피, 성별, 등급, 도체중, 실제 경락단가·매각대금
- 사료·자돈·관리·운송·경매 비용 원장과 정산 산식
- 보험·보호기금 조건, 사고접수와 지급·미지급 내역
- 월간보고·수시공시 원본과 정정 버전

서면 허가에는 저장, 파싱, 외부 대조, 파생 판정, 공개 표시 범위, 허용 필드, 보관기간, 재제공 금지, 삭제·철회, 정정 통지와 개인정보 마스킹 조건을 포함한다. 공모전 MVP는 승인된 샘플 CSV/PDF 한 회차면 충분하다.

## 6. 추후 실서비스 경로

[축산 마이데이터](https://ekape.or.kr/contents/list.do?menuId=menu122182)는 농가 동의를 전제로 돼지 사육·도축·등급 데이터를 맞춤 API로 제공한다. 신청 공문과 보안서약, 내부 심의가 필요해 공모전 MVP보다 실서비스 단계에 적합하다.
