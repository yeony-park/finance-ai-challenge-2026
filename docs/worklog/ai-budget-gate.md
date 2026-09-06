# AI 호출 전역 예산·킬스위치 (worklog)

> 규약: `docs/worklog/README.md` 4섹션(결정과 근거/트레이드오프/검증 영향/알려진 한계).
> 배경: 배포 전 RAG·LLM 엔드포인트 연결 점검(2026-09-06). 명세 06 §1 출시 게이트 중 2(전역 요청·비용 한도)·3(배포 외부 킬스위치)가 코드에 없었다.

## 작업 1 — KV 전역 일일 예산 게이트 (2026-09-06)

**결정과 근거** — 검색 플래너(`/api/search`)·근거 질의(`/api/evidence/query`)·미술품 Copilot(`/api/ai/ask-product`) live 호출이 하나의 전역 카운터를 공유한다. 저장소는 이미 Vercel에 연결된 Upstash KV(`KV_REST_API_URL/TOKEN`)이고, 기존 durable 레이트리밋과 같은 `INCR`+`PEXPIRE NX` 원시 연산을 쓴다(`src/lib/spine/ops/ai-budget.ts`, 공용 REST 호출은 `kv-rest.ts`로 추출). 한도는 `AI_DAILY_REQUEST_BUDGET`(기본 100/일 — 오너 결정, 초안 1000에서 하향). 배치 위치는 기능 플래그·런타임 opt-in·클라이언트 burst 통과 **이후** — 꺼진 기능이나 단일 IP 폭주가 전역 카운터를 소모하지 않게 한다. Copilot은 demo 모드일 때 카운터를 건드리지 않는다.

분산 공격은 IP 한도로 막을 수 없다는 전제에서 출발했다. 목표는 차단이 아니라 피해 상한이다. 한도 도달 시 세 표면 모두 키워드 검색·근거-only·demo 답변으로 강등되며 응답 사유(`budget-exhausted`, Copilot은 `budget_exhausted`)를 그대로 표시한다.

**트레이드오프** — ① KV 실패 시 durable 레이트리밋은 인메모리로 열어 두지만, 예산 게이트는 `store-unavailable`로 **잠근다**. 무중단보다 비용 상한을 우선했다. 대가는 KV 장애가 AI 기능 장애로 직결되는 것이며, 정적 스캐폴드가 남아 있어 서비스 자체는 유지된다. ② 요청 수 기준이지 토큰·금액 기준이 아니다. 금액 상한은 OpenAI 프로젝트 예산과 AI Gateway 예산(대시보드)에 위임한다. ③ 일 창은 UTC 고정 인덱스라 KST 자정과 어긋난다. 심사 기간 운용에는 영향이 없어 수용했다.

**검증 영향** — `ai-budget.test.ts` 9건(env 파싱·memory 모드·KV 허용/소진/킬스위치/off 값/실패 시 잠금·pipeline 본문 형태). Copilot `http.test.ts` 2건(live 소진 시 demo 강등+사유, demo 모드는 미소비). `search-orchestration.test.ts` 1건(HTTP 인가가 gate 통과 후 예산을 확인하고, runtime-disabled면 예산을 소비하지 않음).

**알려진 한계** — 카운터는 호출 시도 수를 세므로 provider 실패·타임아웃도 1건으로 소비된다. `/api/verify/[id]` 라이브 재검증은 LLM이 아닌 원장 API라 대상에서 제외했다. AI 요약은 사전 생성 캐시라 대상 아님.

## 작업 2 — 킬스위치 (2026-09-06)

**결정과 근거** — 배포 아티팩트 밖에 두라는 게이트 3 요구대로 KV 키 `ai:kill-switch`를 예산 카운터와 같은 pipeline에서 `GET`한다. 값이 `1`·`true` 등이면 예산과 무관하게 `kill-switch`로 잠근다. Upstash 콘솔에서 키 하나로 켜고 끄며 재배포가 필요 없다. KV 없는 환경용 보조로 `AI_KILL_SWITCH` 환경변수도 둔다(이쪽은 재배포 필요).

**트레이드오프** — 킬스위치 조회를 별도 요청으로 빼지 않고 카운터 pipeline에 묶어 왕복 1회를 유지했다. 대신 킬스위치가 켜진 동안에도 카운터가 증가한다. 카운터는 창이 지나면 사라지므로 부작용은 없다.

**검증 영향** — 작업 1 테스트에 포함. 배포 후 강등 리허설 항목: 키 삽입 → 검색 응답 `retrieval.reason`이 `kill-switch`인지, Copilot `fallbackReason`이 `kill_switch`인지, 키 삭제 → 복귀.

**알려진 한계** — 킬스위치는 세 AI 표면만 잠근다. DB 조회·정적 화면·크론은 영향 없음(의도). 사이트 전체 차단은 Vercel Attack Challenge Mode가 담당한다.

## 작업 3 — IP 분당 한도 20→10 (2026-09-06)

**결정과 근거** — 오너 결정. `RATE_LIMIT_MAX_REQUESTS`를 10으로 낮췄다. 적용 표면은 Copilot durable 레이트리밋과 스파인 인메모리 레이트리밋. 검색·근거 질의의 클라이언트 burst는 별도 상수(`LIVE_VERIFY_BURST_MAX`=2/분)라 변동 없음.

**트레이드오프** — 한 화면에서 질문을 빠르게 반복하는 정상 사용자가 429를 볼 가능성이 커진다. 화면은 Retry-After를 받아 안내한다.

**검증 영향** — 기존 레이트리밋 테스트는 명시 한도를 주입해 상수 변경에 영향 없음.

**알려진 한계** — 해당 없음.
