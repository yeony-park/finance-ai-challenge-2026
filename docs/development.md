# 개발 환경과 검증

## 기술 기준

- Next.js 16 App Router, React 19, TypeScript strict mode
- Node.js 22
- 합성 fixture 기반 읽기 전용 Repository
- OpenDART 서버 전용 경계

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 합성 static shell은 `python3 server.py`로 `127.0.0.1:8000`에서만 실행합니다.

## 주요 라우트

- `/` — 합성 데이터 검토 흐름
- `/products`, `/products/[id]` — 합성 현재 상품과 과거 기록
- `/artists`, `/artists/[id]` — 가상 작가
- `/platforms`, `/platforms/[id]` — 가상 플랫폼
- `/compare` — 합성 상품 비교
- `/methodology` — 분석 기준과 한계

## 검증

```bash
npm run lint
npm run typecheck
npm run test:art
npm run test:js
python3 tests/validate_data.py
python3 -m unittest tests/test_synthetic_data.py tests/test_server.py tests/test_live_static.py
npm run build:live
npm run check:live
npm run check:synthetic-source
npm run build
npm run check:synthetic-artifact
```

실제 데이터가 아닌 값은 항상 `합성`, `샘플`, `미확인`으로 표시합니다. API 키는 서버 환경에만 두고 응답·로그·브라우저에 노출하지 않습니다.
