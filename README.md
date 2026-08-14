# JeomJeom · 미술품 조각투자 검토 서비스

미술품 조각투자 상품의 공모가격, 작가 시장, 회수 조건, 플랫폼 이력을 근거와 함께 검토하는 Next.js 서비스입니다. 현재 사용자 UI는 **미술품 전용**이며 부동산·항공기 엔진·가축·음악 데이터를 노출하지 않습니다.

## 실행

Node.js 22와 npm을 권장합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. OpenAI 키는 `.env`의 `OPENAI_API_KEY`로만 읽고 서버 API route 밖으로 전달하지 않습니다. 키가 없거나 호출에 실패하면 저장 분석으로 fallback합니다.

## 주요 화면

- `/` — 미술품 홈, 기존 DB 상품과 데모 상품
- `/products` 및 `/products/[id]` — 상품 목록과 7개 분석 탭
- `/artists` 및 `/artists/[id]` — 현재 상품에 안전하게 식별된 작가
- `/platforms` 및 `/platforms/[id]` — 플랫폼별 기존 DB 검색·페이지 이동
- `/compare` — 최대 3개 상품 비교
- `/methodology` — 계산식, 판단 규칙, 데이터 경계

## 데이터 연결

새 Repository는 원본 JSON을 변경하지 않고 `lib/art/legacy-adapter.ts`에서 정규화합니다.

| 데이터 | 연결 수 | 처리 원칙 |
|---|---:|---|
| `data/products.json` | 미술품 5개 | 부동산 3개 제외, `isDemo=false`, 현재 lifecycle 미확인은 그대로 표시 |
| `data/artnguide_track_records.json` | 187건 | 자체 게시 매각 상태, 원문 상태 및 187개 annotation 보존 |
| `data/artnguide_due_diligence.json` | 같은 187건 enrichment | 중복 실적으로 세지 않고 식별·발행사 검증 상태와 원본 payload 연결 |
| `data/weshareart_research.json` | 145건 | 아트투게더 별도 플랫폼으로 연결, 통화 미기재 금액은 KRW로 표시하지 않음 |
| `data/tessa_sale_records.json` | 6건 | 자체 정산 공시, KRW/HKD 구분과 손실 정산 상태 보존 |
| `data/demo/art-investment.json` | 상품 4개·이력 27건 | 모든 화면에서 `DEMO · 데모 데이터` badge 표시 |

기존 플랫폼 이력은 **338건(187+145+6)**입니다. due-diligence 187건은 ArtNGuide의 동일 레코드 enrichment이므로 더하지 않습니다. 실데이터에는 공개되지 않은 값, 통화, 발행사 관계, 작품 identity를 추정해 넣지 않습니다. 실데이터와 데모는 서로 다른 badge와 source metadata로 구분합니다.

## 검증

```bash
npm run lint
npm run typecheck
npm run test:art
npm run test:js
npm run build
```

정본 QA와 제외 범위는 [`docs/ART_INVESTMENT_QA.md`](docs/ART_INVESTMENT_QA.md), 데이터 모델은 [`docs/ART_INVESTMENT_DATA_MODEL.md`](docs/ART_INVESTMENT_DATA_MODEL.md)를 참고하세요.
