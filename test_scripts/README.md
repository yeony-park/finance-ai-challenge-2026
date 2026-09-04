# API 사전 검증 스크립트

운영 코드에 연결하기 전에 공식 API 응답과 더미 상품 흐름을 확인하는 격리된 테스트 공간이다. 이 폴더는 앱, `package.json`, Next.js 코드에서 참조하지 않으므로 통째로 삭제해도 서비스에 영향을 주지 않는다.

## 포함 범위

- OpenDART 공시검색
- 행정안전부 행정표준코드 법정동코드
- 국토교통부 상업업무용 부동산 실거래가
- 건축HUB 건축물대장 표제부
- 한국부동산원 R-ONE 통계표 조회
- 한국은행 ECOS 통계 조회
- 현재·과거 상품을 대신하는 명시적 더미 데이터

API 응답은 인증키 문자열만 마스킹하고 원문과 안전한 요청 조건을 `test_scripts/output/` 아래에 저장한다. 인증키는 결과에 기록하지 않는다.
`[RECEIVED]`는 HTTP 응답을 받았다는 뜻이며, API가 정상 데이터를 반환했다는 판정은 아니다. 저장된 원문의 기관별 결과 코드와 필수 필드는 별도로 확인한다.

## 키와 조회 조건 준비

```bash
cp test_scripts/.env.example test_scripts/.env.local
cp test_scripts/config.example.json test_scripts/config.local.json
```

`.env.local`에 발급받은 키를 입력하고, `config.local.json`의 기간·지역코드·통계코드를 검증 대상에 맞게 바꾼다. 두 파일과 실행 결과는 Git에서 제외된다.

6개 API 키는 각각 `OPENDART_API_KEY`, `LEGAL_DONG_API_KEY`, `RTMS_API_KEY`, `BUILDING_HUB_API_KEY`, `RONE_API_KEY`, `ECOS_API_KEY`에 입력한다. 실제 키를 `.env.example`에 입력하지 않는다.

## 실행 방법

프로젝트 규칙에 따라 `skn25` 환경에서만 실행한다.

```bash
conda run -n skn25 python test_scripts/smoke_test.py --self-check
conda run -n skn25 python test_scripts/smoke_test.py --source dummy
conda run -n skn25 python test_scripts/smoke_test.py --source opendart
conda run -n skn25 python test_scripts/smoke_test.py --source legal_dong
conda run -n skn25 python test_scripts/smoke_test.py --source rtms
conda run -n skn25 python test_scripts/smoke_test.py --source building_hub
conda run -n skn25 python test_scripts/smoke_test.py --source rone
conda run -n skn25 python test_scripts/smoke_test.py --source ecos
conda run -n skn25 python test_scripts/smoke_test.py --source all
conda run -n skn25 python test_scripts/normalize_results.py --self-check
conda run -n skn25 python test_scripts/normalize_results.py
conda run -n skn25 python test_scripts/build_demo.py --self-check
conda run -n skn25 python test_scripts/build_demo.py
conda run -n skn25 python -m http.server 8000 --bind 127.0.0.1 --directory test_scripts/output/demo_site
```

`--source all`은 키가 하나라도 없으면 해당 소스를 실패로 기록하고 나머지는 계속 확인한다. 각 실행 결과는 `test_scripts/output/YYYYMMDD-HHMMSS/`에 생긴다.

정규화 스크립트는 소스별 최신 원문을 읽어 `output/normalized/latest.json`에 별도 저장한다. 원문은 수정하지 않고 각 소스 봉투에 `source`, 원문 경로와 SHA-256 해시를 남긴다. 내부 레코드의 공통 필드는 `record_type`, `subject_id`, `as_of`, `data`이며 소스별 의미가 다른 레코드를 한 테이블로 합치지 않는다.

더미 데모는 마지막 두 명령을 실행한 뒤 `http://127.0.0.1:8000/`에서 확인한다. API 키가 없어도 열리며 실제 API 응답이 없는 항목은 `연결 대기`로 표시한다. 서버는 생성된 공개 파일만 담은 `output/demo_site/`를 로컬 인터페이스에만 공개하므로 `.env.local`과 `config.local.json`은 제공하지 않는다.

## 더미 데이터 원칙

`fixtures/dummy_products.json`은 API 허가 전 입력·상태·결과 형식 검증용이다.

- 실제 플랫폼·상품·주소를 사용하지 않는다.
- 모든 상품에 `sample: true`, `source_status: dummy`를 둔다.
- 더미 수익과 일정은 분석 정확도나 서비스 효용의 근거로 사용하지 않는다.
- 실제 데이터 연결 후에도 더미 결과가 실데이터 화면에 섞이지 않게 한다.

## 운영 이전 조건

테스트 코드를 그대로 운영에서 import하지 않는다. 각 소스에서 다음을 확인한 뒤 필요한 최소 로직만 운영 영역에 다시 구현한다.

1. 공식 명세와 실제 응답 형식이 일치한다.
2. API 키가 출력·로그·오류 메시지에 노출되지 않는다.
3. 빈 결과와 오류 응답을 정상 데이터로 처리하지 않는다.
4. 기준일·수집시각·출처·한계가 보존된다.
5. 이용허락과 호출 제한을 확인한다.

## 공식 명세

- [OpenDART 공시검색](https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001)
- [행정안전부 행정표준코드 법정동코드](https://www.data.go.kr/data/15077871/openapi.do)
- [국토교통부 상업업무용 실거래가](https://www.data.go.kr/data/15126463/openapi.do)
- [건축HUB 건축물대장정보](https://www.data.go.kr/data/15134735/openapi.do)
- [한국부동산원 R-ONE 개발가이드](https://www.reb.or.kr/r-one/portal/openapi/openApiDevPage.do)
- [한국은행 ECOS Open API](https://ecos.bok.or.kr/api/)
