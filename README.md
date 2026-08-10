# 조각투자 실사 대시보드

SOU 부동산 3건과 투게더아트 미술품 5건의 공식 원문, 기준일, 가격 연결 근거, 사업자 이행·재무 이력을 나눠 표시한다. 별도 연구 영역에는 아트앤가이드 187건, 아트투게더 145건, TESSA 매각대금 정산 공시 6건의 플랫폼 자체 게시 트랙레코드와 투자계약증권 적합성 테스트 10문항을 연결한다. 원문 근거에 따른 가격·위험 경고를 제공하지만 개인별 매수·매도 권유나 공식 감정평가는 제공하지 않는다.

## 실행

```bash
cd /Users/karlpark/projects/DAKER_1/finance-ai-challenge-2026
python3 server.py
```

`http://127.0.0.1:8000`에서 연다. `/api/catalog`는 SOU와 아래 공식 API를 서버에서만 조회한다. 브라우저·응답 JSON·출처 URL에는 인증키를 넣지 않는다. 각 출처는 5초 제한, HTTPS·고정 host/path, redirect 거부, 응답 크기 제한, schema 검증, 24시간 cache를 적용한다. `data/sou_property_configs.json`이 상품별 PNU·법정동·API 범위를 고정하며 한 상품 또는 출처가 실패해도 다른 상품의 상태를 바꾸지 않는다.

아트앤가이드 트랙레코드는 기존 8개 상품과 합치지 않은 별도 검증 저장본이다. `data/artnguide_track_records.json`에 2026-08-10 21:10~21:15 KST 수집·21:22 KST 검증된 187건과 19개 원필드, 화면 표시값, 상단 집계 원값과 재합계 차이를 보존한다. `python3 scripts/build_artnguide_track_records.py`로 지정 근거 문서에서 다시 생성하고 `--check`로 checked-in JSON과 일치하는지 확인한다. Python 서버는 `/api/track-records/artnguide`, 정적 경로는 `/data/artnguide_track_records.json`으로 제공한다.

아트앤가이드 local due-diligence artifact는 `data/artnguide_due_diligence.json`, source registry는 `data/artnguide_evidence_sources.json`, 사람용 evidence report는 `deliverables/artnguide_due_diligence_evidence_2026-08-10.md`다. 모두 2026-08-10 21:22 KST snapshot을 입력으로 한 로컬 검증 산출물이며 frontend, `/api`, `/live`에 연결하지 않는다. `python3 scripts/build_artnguide_due_diligence.py --check`와 `python3 -m unittest tests/test_artnguide_due_diligence.py`는 artifact·registry·report의 일치와 45개 whitespace-normalized 작가 aggregate를 확인한다.

아트투게더 연구 저장본은 `data/weshareart_research.json`에 2026-08-10 21:42~21:46 KST 검증된 지난 공동구매 145건과 적합성 테스트 10문항을 보존한다. 공동구매 목록 18개 필드와 개인정보 제거 공개 상세를 수록하되 회원·계정·세션·개인 답안·개인 만기일, 작가의 상세 인물 프로필, 장문 HTML·이미지 파일은 포함하지 않는다. `python3 scripts/build_weshareart_research.py`와 `--check`로 Markdown 근거 문서에서 결정적으로 재생성한다. Python 서버는 `/api/research/weshareart`, 정적 경로는 `/data/weshareart_research.json`으로 제공한다.

TESSA 저장본은 `data/tessa_sale_records.json`에 2026-08-10 21:53 KST 검증된 매각대금 검색 결과 6건과 첨부 PDF 12개의 정규화 값·파일 검증 metadata를 보존한다. 원문 정리는 `deliverables/tessa_artwork_sale_disclosures_2026-08-10.md`다. Python 서버는 `/api/track-records/tessa`, 정적 경로는 `/data/tessa_sale_records.json`으로 제공한다. 공시 기재 수익률과 DAKER 계산 수익률을 분리하고 연환산하지 않는다. 세 플랫폼 트랙레코드는 메인 상품 8건이나 법적 발행사의 독립 이행실적에 합산하지 않고 별도 검색·상세 화면에서만 표시한다.

### 환경 변수

로컬 `.env`가 없을 때만 example을 복사하고 필요한 API key를 입력한다. 빈 key의 출처는 실시간 연결 없이 검증된 저장본을 사용한다.

```bash
cp -n .env.example .env
```

### 보안 주의

권장·안전 실행 방식은 `python3 server.py`로 `127.0.0.1:8000`을 사용하는 것이다. 이 서버는 정적 파일 허용목록(static allowlist)을 적용해 `.env` 요청을 차단한다.

프로젝트 루트에는 API 인증키가 들어 있는 `.env`가 있으므로 프로젝트 루트를 loopback 외부에 절대 노출하지 않는다. 저장소의 `.vscode/settings.json`은 Live Server document root를 비밀정보가 없는 생성물 `/live`로 제한하고 host `127.0.0.1`, `useLocalIp: false`, port `5500`을 고정한다. 설정 변경 뒤에는 `Go Live`를 중지하고 다시 시작해야 적용된다. `useLocalIp`·LAN 공유, `0.0.0.0` bind, 터널(tunnel), 포트 포워딩(port forwarding), public preview를 사용하지 않는다. Live Server fallback은 저장된 상품 조회·검색 전용이며 공식 API는 연결되지 않는다.

로컬 파일 권한을 추가로 제한하려면 아래 명령을 직접 확인한 뒤 선택적으로 실행한다. 이 프로젝트 설정 과정에서는 자동 실행하지 않는다.

```bash
chmod 600 .env
```

공개 HTML·JavaScript·저장 데이터가 바뀌면 `npm run build:live`를 실행한다. 빌더는 고정 allowlist의 11개 파일만 `/live`에 복사하고 source/target symlink나 허용되지 않은 파일이 있으면 중단하며 `.env`를 읽거나 복사하지 않는다. `npm run check:live`로 생성 파일 hash와 정확한 파일 목록을 확인한다.

VS Code Live Server는 생성된 `/live`의 상품·사업자·아트앤가이드·아트투게더·TESSA 연구 저장본을 읽어 상품 검색과 트랙레코드 검색·필터·상세를 제공한다. 이 경우 화면에 `Live Server 저장본 · 공식 API 미연결`로 표시되며 건축HUB·VWorld·RTMS·OpenDART 실시간 확인은 실행하지 않는다. 공식 API 결과까지 보려면 권장 실행 방식인 `python3 server.py`를 사용하고 `http://127.0.0.1:8000`을 연다. 브라우저에서 다른 출처의 8000번 서버로 우회 요청하지 않는다.

- `COMMERCIAL_API_KEY` : 국토교통부 상업·업무용 실거래가 OpenAPI. 실패 시 기존 RTMS CSV만 보조 경로로 사용한다.
- `LAND_API_KEY` : 국토교통부 토지 실거래가 OpenAPI. 법정동 단위 자료이며 대상 필지와의 일치는 별도 확인한다.
- `BUILDING_API_KEY` : 건축HUB 표제부. 정확한 지번, 면적, 사용승인일을 독립 확인하지만 소유권·담보권은 확인하지 않는다.
- `VWORLD_API_KEY` : VWorld NED 개별공시지가·토지특성·토지이용. 개별공시지가는 토지 공시가격이므로 건물 포함 공모가와 직접 비교하지 않는다. 기본 등록 domain은 `http://localhost:8000`이며 다르면 `VWORLD_DOMAIN` 환경변수로만 바꾼다.
- `DART_API_KEY` : OpenDART 공시 원문 ZIP 수신과 투게더아트 최근 공시 존재를 확인한다. 자동 XML 표 파싱 전 금액은 `저장 수치`로 남긴다.

## 검증

```bash
python3 tests/validate_data.py
python3 scripts/build_artnguide_track_records.py --check
python3 -m unittest tests/test_artnguide_data.py
python3 scripts/build_artnguide_due_diligence.py --check
python3 -m unittest tests/test_artnguide_due_diligence.py
python3 scripts/build_weshareart_research.py --check
python3 -m unittest tests/test_weshareart_data.py
python3 -m unittest tests/test_tessa_data.py
npm run test:js
python3 -m unittest tests/test_server.py
python3 tests/smoke_live.py
```

네트워크 확인은 결정적 테스트와 분리한다.

```bash
python3 tests/smoke_live.py
```

## 원문 기준일

- SOU 상품·공지 : [상품 13](https://api.sou.place/api/v1/public/products/product/13), [상품 6](https://api.sou.place/api/v1/public/products/product/6), [상품 7](https://api.sou.place/api/v1/public/products/product/7), [공지 146](https://api.sou.place/api/v1/public/notices/146), 2026-08-08 KST.
- 김환기 9-1 : [DART 최종 투자설명서](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002), [KYS 2025 자료](https://artprice.kr/data_archive/20260312_132032_cf7c4a16.pdf).
- 하종현 9-2 : [정정 신고서](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260512000391), [정정 발행실적](https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260529000528), 2026-08-08 KST.
- 유영국 8 : 보유 확인일 2025-12-31이므로 현재성 만료로 표시한다.
- 야요이 쿠사마 1호·조지 콘도 2호 : 2026-08-08 플랫폼 상태 API의 `STORED`와 2025-12-31 정기공시를 표시한다. 이 자료만으로 현재 소유권·미처분을 증명하지 않으며 독립 비교자료 부족으로 가격 판정을 보류한다.

RTMS 비교는 같은 법정동·용도지역·용도, 일반건축물 전부 거래, 토지·연면적 각각 0.5~2배, 취소·지분 제외를 모두 충족한 표본만 사용한다. 엄격 표본 5건 미만이면 `자료 부족·가격 적정성 판정 보류`다. 전주 시화연풍은 공모 원문상 2필지 중 VWorld가 1필지만 반환하므로 엄격 비교를 차단한다.
