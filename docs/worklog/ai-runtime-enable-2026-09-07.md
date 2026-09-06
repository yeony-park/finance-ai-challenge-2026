# 프로덕션 AI 런타임 개통 전 보강 — 전송 고지·내구 한도·오귀속 방지 (worklog)

> 규약: `docs/worklog/README.md` 4섹션(결정과 근거/트레이드오프/검증 영향/알려진 한계).
> 배경: 2026-09-07 03:00 KST, 오너가 Vercel Production에 OPENAI 키와 기능 플래그를 등록하기로 결정. 명세 R-API-17의 운영 opt-in 전제 중 미충족분과 실모델 검증에서 드러난 결함을 개통 전에 막는다.

## 작업 1 — 외부 전송 고지 (2026-09-07)

**결정과 근거** — 검색창·상품 Copilot·미술품 Copilot 어디에도 질문이 외부 AI로 전송된다는 안내가 없었다(문안 grep 0건). `src/lib/content/home.ts`에 `AI_TRANSMISSION_NOTICE` 한 문장을 두고 `HomeSearchScaffold`·`EvidenceQuery`·`ArtEvidenceCopilot`의 입력 폼 아래에 표시한다. 개인정보 입력 금지 문구를 함께 넣어 서버측 PII 스크리닝과 짝을 맞췄다.

**트레이드오프** — 입력 폼마다 한 줄이 늘어 화면이 조금 무거워진다. 새 CSS 클래스는 만들지 않고 기존 보조 문안 클래스(`aiAnswerNote`·`resultNote`·`lead`)를 재사용했다.

**검증 영향** — `home-copy.test.ts` ALL_COPY에 추가해 출력 필터 통과를 강제한다.

**알려진 한계** — 고지는 안내이지 동의 수집이 아니다. 동의 체크박스는 심사 후 과제.

## 작업 2 — 검색·근거 질의 IP 한도의 내구 카운터 (2026-09-07)

**결정과 근거** — `authorizeKnowledgeAiHttpRequest`의 IP당 분당 2회 한도는 인스턴스별 메모리(`createLiveVerifyGate`)라 스케일아웃 시 배수로 열렸다. Copilot이 이미 쓰는 `resolveRateLimiter`(Upstash `INCR`+`PEXPIRE NX`, 미설정 시 메모리 폴백)를 `knowledge-ai` 접두사로 추가해 메모리 게이트 통과 후·예산 확인 전에 검사한다. 거부 사유는 기존과 같은 `rate-limited`.

**트레이드오프** — 요청마다 KV 왕복 1회가 는다(예산 게이트와 합쳐 2회). KV 장애 시 이 한도는 메모리로 폴백해 열리고, 예산 게이트는 잠기는 기존 비대칭을 유지한다.

**검증 영향** — `search-orchestration.test.ts`에 내구 한도 거부 시 예산 미소비, 허용 시 예산 1회 소비 테스트 추가.

**알려진 한계** — `/api/verify`의 인메모리 리미터는 그대로다(LLM 미사용, 원장 API 쿼터 보호가 목적이라 별도 과제).

## 작업 3 — 현재 상품 언급 질문의 외부 관측값 오귀속 방지 (2026-09-07)

**결정과 근거** — 로컬 프로덕션 빌드에 실키를 넣고 "최근 한우 경락가격 추세는? 이 상품 사육 두수도 알려줘"를 물으니 `hybrid_llm` 답변이 경락가 통계의 표본 두수(암 9,516두 등)를 "이 상품 사육 두수"로 서술했다. 공시 코퍼스가 외부 AI 미승인(승인 파일 부재)이라 상품 근거가 모델에 전달되지 않았는데도, `requiresProduct`가 "승인 상품 근거가 있을 때만" 상품 인용을 요구해 통과된 것이다. 조건을 `referencesCurrentProduct(question)`만으로 바꿔, 현재 상품을 언급한 질문은 상품 근거를 인용하지 못하면 `evidence_only`로 강등한다.

**트레이드오프** — 공시 코퍼스 승인 전에는 "이 상품"이 섞인 가격·질병 질문이 전부 근거만 반환한다. 순수 가격·질병 질문의 생성 답변은 유지된다. 틀린 수치를 단정하는 것보다 근거만 주는 편이 R-INV-07의 취지에 맞다.

**검증 영향** — 로컬 실모델 스모크로 같은 질문이 `evidence_only`로 바뀌는지 확인한다. 라우트 단위 테스트는 답변기 주입 구조가 없어 후속 과제.

**알려진 한계** — 상품을 "9호"처럼 번호로만 부르는 질문은 `CURRENT_PRODUCT_REFERENCE` 패턴에 따라 판별이 달라질 수 있다.

## 작업 4 — 플래그 안내 정정 (2026-09-07)

**결정과 근거** — 실모델 스모크에서 `LIVE_EVIDENCE_ENABLED`만으로는 홈 검색 플래너가 `disabled`로 남았다. `orchestrateGlobalSearch`가 `KNOWLEDGE_SEMANTIC_ENABLED`를 플래너 전제로 요구하고, DB 모드에서는 RDS pgvector를 읽는다(`local-rag/semantic.ts` → `semantic-search-db`). `.env.example` 설명을 이 사실에 맞게 고쳤다.

**트레이드오프** — 없음. 문서 정정.

**검증 영향** — 프로덕션 검색 응답의 `retrieval.planner.used`가 true, `strategy`가 `semantic`이면 경로가 열린 것이다.

**알려진 한계** — 명세 R-API-17 문구("로컬 SQLite overlay가 있을 때만")는 DB 경로 추가 이전 서술이라 후속 정정 대상이다.
