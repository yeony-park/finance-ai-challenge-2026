# 개발 환경과 검증

## 기술 기준

- Next.js 16 App Router, React 19, TypeScript strict mode
- Node.js 22
- 정적 연구 화면과 Python 서버는 검증 저장본만 제공한다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 연다. 기존 연구 저장본 확인은 `python3 server.py`로 `127.0.0.1:8000`에서만 실행한다.

## 주요 라우트

- `/` — 미술품 홈
- `/products`, `/products/[id]` — 현재 상품과 과거 플랫폼 기록
- `/artists`, `/artists/[id]` — 작가 기준 탐색
- `/platforms`, `/platforms/[id]` — 플랫폼 기록
- `/compare` — 최대 3개 상품 비교
- `/methodology` — 분석 기준과 한계

## 검증

```bash
npm run lint
npm run typecheck
npm run test:art
npm run test:js
npm run build
python3 tests/validate_data.py
python3 -m unittest tests/test_server.py tests/test_live_static.py
npm run check:live
```

실제 데이터가 아닌 값은 `샘플`, `미확인`, `연결 대기`로 표시한다. API 키는 서버 환경에만 두고 브라우저, 응답 JSON, 로그에 노출하지 않는다.
