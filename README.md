# JeomJeom · 미술품 조각투자 검토 서비스

미술품 조각투자의 공모가격, 작가 시장, 회수 조건과 플랫폼 이력을 학습·검증하는 Next.js 서비스입니다. 운영 카탈로그와 이미지는 모두 **합성 데이터**이며 실제 상품이나 투자 권유가 아닙니다.

## 실행

Node.js 22와 npm을 권장합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. OpenAI와 OpenDART 키는 서버 환경에서만 읽습니다.

## 데이터 경계

- `data/synthetic/art-investment.json`: 현재 상품 9건, 과거 이력 318건의 독립 합성 fixture
- `public/synthetic-art/`: 합성 ID로 생성한 로컬 추상 SVG 9개
- `data/art/dart-filing-manifest.json`: OpenDART 서버 기능의 허용된 제어 정보
- 운영 Repository는 합성 fixture만 import합니다.
- 합성 상품은 실제 DART 접수번호와 연결하지 않으며 OpenDART 검증 결과가 `not_applicable`입니다.
- 외부 플랫폼 원본과 생성 도구는 서비스 저장소 밖의 비공개 보관소에서만 관리합니다.

합성 데이터는 공모금액·보유기간·상태 관계의 현실성을 유지하도록 구간 단위로 보정했지만, 실제 행과 1:1로 대응하지 않습니다. 실제 인물·작품·플랫폼·원본 ID·URL·payload는 포함하지 않습니다.

## 주요 화면

- `/` — 합성 데이터 검토 흐름
- `/products`, `/products/[id]` — 합성 현재 상품과 과거 이력
- `/artists`, `/artists/[id]` — 가상 작가 탐색
- `/platforms`, `/platforms/[id]` — 가상 플랫폼 이력
- `/compare` — 최대 3개 상품 비교
- `/methodology` — 계산식과 데이터 한계

## 검증

```bash
npm run lint
npm run typecheck
npm run test:art
npm run test:js
npm run build:live
npm run check:live
npm run check:synthetic-source
npm run check:synthetic-artifact
npm run build
```

Git 과거 이력과 기존 배포 cache의 정리는 별도 운영 절차입니다. 현재 트리에서 파일을 제거한 것만으로 과거 공개본 회수를 보장하지 않습니다.
