# Plan: 금융문서 위험조건 검증 MVP — Quick Go (워킹 스켈레톤 우선)

**Source PRD**: `.claude/prds/financial-terms-risk-verification.prd.md`
**Selected Milestone**: M1 데이터 기반 확보 + M2·M3의 스켈레톤 슬라이스 (quick-go 재구성)
**Complexity**: Medium

## Summary

5주 일정에서 가장 위험한 것은 "부품은 다 있는데 조립이 안 된 상태"로 8월 말을 맞는 것이다. 따라서 크롤러 자동화·AI Hub 분류기 학습·상품명 퍼지 매칭을 **의도적으로 뒤로 미루고**, 수동 확보한 약관 10~20건 + 별표15로 **입력(3탭 선택) → 조항 스캔 → 별표15 diff → 등급+근거 카드**가 한 번에 도는 엔드투엔드 스켈레톤을 먼저 세운다. 가드레일은 기존 신뢰 스파인을 확장해 처음부터 파이프라인 안에 내장한다(후행 부착 금지) — 특히 **표현 원칙(단정 금지)·근거 제시율 100%·법률 자문 아님 고지**는 분석 결과가 화면에 나가는 첫날부터 강제한다.

## Patterns to Mirror

| Category | Source | Pattern |
|---|---|---|
| 타입 | `src/lib/spine/types.ts:1-76` | 전 필드 `readonly` 불변 + 판별 유니언(`SpineAnswer.kind`로 UI 분기) — 분석 결과도 동일 계약 스타일 |
| 파이프라인 조립 | `src/lib/spine/pipeline.ts` | 단계별 순수 함수 → `pipeline.ts`에서 조립. 분석 파이프라인도 동일 구조로 별도 모듈 |
| 가드레일 | `src/lib/spine/guardrail/rules.ts`, `output-filter.ts` | 룰 카탈로그(id·category·weight) + 출력 필터 체인 — 단정 표현 차단 룰을 같은 카탈로그 형식으로 추가 |
| 출처 강제 | `src/lib/spine/rag/corpus.ts`, `citations.ts` | 화이트리스트 레지스트리 + 미등록 출처 인용 시 abstain 강등 — 별표15·심결례를 코퍼스로 등록 |
| LLM 경계 | `src/lib/spine/llm/client.ts` | fake-first 인터페이스(키 없이 결정적 동작) — 분석 LLM 호출도 동일 클라이언트 경유 |
| 테스트 | `src/lib/spine/__tests__/*.test.ts` | vitest, AAA 패턴, 파이프라인 단위 + 단계 단위 병행 |
| 레드팀 | `src/lib/spine/redteam/scenarios.ts` | 시나리오 카탈로그 + 러너 — 도메인 공격(단정 유도 등) 추가 지점 |

## Files to Change

| File | Action | Why |
|---|---|---|
| `src/lib/analysis/types.ts` | CREATE | 도메인 계약: `ClauseSpan`·`ExtractedField`·`DeviationHit`·`RiskGrade("참고"\|"주의"\|"경고")`·`EvidenceCard`·`AnalysisResult` (spine 타입 스타일) |
| `src/lib/analysis/clause-splitter.ts` | CREATE | 약관 텍스트 → 조(條) 단위 트리 분할 (정규식 `제N조` 기반, PDF 텍스트 입력) |
| `src/lib/analysis/field-extractor.ts` | CREATE | LLM 필드 추출(7필드 스키마) — spine `LlmClient` 경유, fake 응답 포함 |
| `src/lib/analysis/deviation.ts` | CREATE | 별표15 diff: 조 제목 매칭 → 텍스트 비교 → 소비자 불리 방향 판정 |
| `src/lib/analysis/grading.ts` | CREATE | 등급 규칙(근거 개수·편차 정도 → 참고/주의/경고). **근거 0건이면 경고·주의 불가** — 규칙으로 강제 |
| `src/lib/analysis/pipeline.ts` | CREATE | 조립: 분할→추출→편차→분류(few-shot)→등급→근거 카드. 모든 출력은 spine 출력 필터 통과 |
| `src/lib/spine/guardrail/rules.ts` | UPDATE | 단정 표현 차단 룰 추가("독소조항이다"·"무효다"·"소송하면 이긴다" 류 → 차단/순화) — 기존 카탈로그 형식 |
| `src/lib/spine/guardrail/output-filter.ts` | UPDATE | 분석 결과 텍스트에도 필터 체인 적용 + 법률 자문 아님 고지 문구 자동 부착 |
| `src/lib/spine/rag/corpus.ts` | UPDATE | 샘플 코퍼스 → 실제 도메인 코퍼스(별표15 4종·약관규제법 조문·심결례 시드)로 교체 (README "주제 확정 후 할 일" 1번) |
| `src/lib/spine/llm/client.ts` | UPDATE | fake 응답을 도메인 시나리오(약관 분석 데모)로 갱신 (동 2번) |
| `src/lib/spine/redteam/scenarios.ts` | UPDATE | 도메인 공격 추가: 단정 판정 유도·근거 없는 경고 유도·타 약관 오귀속 유도 (동 3번) |
| `scripts/ingest.ts` | CREATE | 수동 다운로드 원본(`data/raw/`) → 파싱·조항 분할 → `data/corpus/*.json` 색인. 산출물에 출처 메타(보험사·상품명·시행일·수집 URL) 필수 |
| `data/raw/` `data/corpus/` | CREATE | 약관 10~20건(삼성화재·DB손보 공시실 수동 다운로드) + 별표15 PDF 저장본. **수집 메타 기록**(stream8 수칙 — 수동이므로 robots 쟁점 없음) |
| `src/app/api/analyze/route.ts` | CREATE | 분석 API — 레이트리밋→입력 스크리닝→분석 파이프라인→출력 필터 (기존 `/api/chat/route.ts` 구조 미러) |
| `src/app/page.tsx` | UPDATE | 데모 UI 교체: 3탭 선택(보험사→상품군→상품) → 결과(조항 하이라이트·등급 배지·근거 카드·원문 연결·고지 문구) |
| `src/lib/analysis/__tests__/*.test.ts` | CREATE | 단계별 + 파이프라인 테스트 (spine 테스트 스타일) |

## Tasks

### Task 1: 도메인 계약 정의
- **Action**: `analysis/types.ts` — 판별 유니언·readonly 계약. `EvidenceCard`는 `Citation`(spine)을 재사용해 출처 강제와 연결
- **Mirror**: `spine/types.ts`의 유니언·불변 스타일
- **Validate**: `npx tsc --noEmit`

### Task 2: 코퍼스 시드 확보 (병행 가능, 코드와 독립)
- **Action**: 삼성화재·DB손보 공시실에서 암·실손·종신 약관 10~20건 **수동 다운로드** + law.go.kr 별표15 PDF 저장(생명·질병상해·화재·실손 4종) → `data/raw/`. `scripts/ingest.ts`로 텍스트 추출·조항 분할·출처 메타 색인
- **Mirror**: 출처 메타는 `CorpusDoc`(id·title·url·issuer) 형식
- **Validate**: `npx tsx scripts/ingest.ts && ls data/corpus/*.json` — 색인 건수·조항 파싱 성공률 출력

### Task 3: 조항 분할·필드 추출
- **Action**: `clause-splitter.ts`(정규식 우선, 실패 조항은 "미분할" 플래그로 정직 표기) → `field-extractor.ts`(LLM few-shot, 7필드, 조항 좌표 필수 반환. 좌표 없는 추출값은 폐기)
- **Mirror**: LLM 호출은 `spine/llm/client.ts` 인터페이스, fake 모드 결정적 응답
- **Validate**: `npm test -- analysis` — 골드 샘플 3건 스냅숏

### Task 4: 별표15 편차 탐지 + 등급 규칙
- **Action**: `deviation.ts`(조 제목 매칭→문장 diff→불리 방향 휴리스틱), `grading.ts`(규칙 명문화: 경고=편차+법유형 매칭, 주의=단일 근거, 참고=정보성. **근거 0건→등급 부여 불가**)
- **Mirror**: 순수 함수 + 룰 카탈로그 형식
- **Validate**: 가상 변형 약관 테스트(표준 조항을 의도적으로 불리하게 변형한 픽스처)에서 탐지 P/R 측정 테스트 통과

### Task 5: 가드레일 확장 (스켈레톤과 동시, 후행 금지)
- **Action**: ① 출력 필터에 단정 표현 차단 룰 ② 법률 자문 아님 고지 자동 부착 ③ 심결례·별표15 코퍼스 등록(미등록 출처 인용→abstain 기존 로직 활용) ④ 레드팀 시나리오 3종 추가(단정 유도·근거 없는 경고 유도·오귀속 유도)
- **Mirror**: `guardrail/rules.ts` 카탈로그, `redteam/scenarios.ts` 형식
- **Validate**: `npm test && npm run redteam` — 신규 시나리오 전부 방어 확인

### Task 6: API + 데모 UI
- **Action**: `/api/analyze`(스파인 순서: 레이트리밋→스크리닝→분석→출력 필터), `page.tsx` 3탭 선택→결과 화면(하이라이트·등급 배지·근거 카드·"출처: ○○ 상품공시실" 표기·고지 문구). 인용은 조항 스니펫만(전문 뷰어 금지 — stream8)
- **Mirror**: 기존 `/api/chat/route.ts`·데모 UI 구조
- **Validate**: `npm run dev` 후 시나리오 완주 — 키 없이 fake 모드로 3탭→결과까지 동작

### Task 7: 통합 검증·베이스라인 측정
- **Action**: 골드 샘플로 필드 EM/F1·편차 P/R 첫 측정(PRD TBD 지표의 베이스라인), README·페이즈-계획에 결과 기록
- **Validate**: `npm test`(전체 green) + 측정 스크립트 출력

## Validation

```bash
npx tsc --noEmit          # 타입
npm test                  # 유닛+파이프라인 (기존 26개 + 신규)
npm run redteam           # 레드팀 — 신규 도메인 시나리오 포함 전부 방어
npx tsx scripts/ingest.ts # 코퍼스 색인 재현성
npm run dev               # fake 모드 데모: 3탭 → 등급+근거 카드 완주
```

## Deferred (quick-go에서 의도적으로 제외 — 스켈레톤 완성 후 착수)

| 항목 | 재개 시점 |
|---|---|
| 크롤러 어댑터(삼성화재·DB손보 자동 수집 + stream8 수칙 내장) | 스켈레톤 검증 후 (Phase 1 후반) |
| AI Hub 580 학습 분류기 (현재는 LLM few-shot 대체) | AI Hub 승인 후 |
| 상품명 퍼지 매칭 (2층 입력) | Phase 3 |
| 2개 상품 비교표·쉬운 말 변환·시니어 모드 | Phase 3 |
| 심결례 RAG 본격 색인 (현재는 시드 수준) | Phase 2 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| PDF 텍스트 추출 품질(표·2단 조판) | 중 | 텍스트 PDF 우선 선별(검토서 방침), 실패 조항은 "미분할" 정직 표기 — 스켈레톤은 잘 파싱되는 약관으로 시작 |
| 정규식 조항 분할의 예외 형식 | 중 | 파싱 성공률을 ingest 출력으로 계측, 낮으면 LLM 보조 분할로 교체(인터페이스 유지) |
| few-shot 분류 품질이 낮아 등급 신뢰 저하 | 중 | 등급 규칙이 근거(편차·법유형) 없이는 경고를 못 내게 설계 — 분류기는 후보 제시 역할로 제한 |
| 별표15 조 번호와 개별 약관 조 번호 불일치 | 높 | 제목 텍스트 유사도 매칭 병행, 미매칭 조항은 diff 대상 제외(누락을 숨기지 않고 "기준선 없음" 표기) |
| 가드레일 후행 부착 유혹 | 중 | Task 5를 Task 6(UI) 선행 조건으로 고정 — 필터 미통과 결과는 화면에 못 나감 |

## Acceptance

- [ ] 키 없이(fake 모드) 3탭 → 조항 스캔 → 등급+근거 카드까지 완주
- [ ] 경고·주의 판정 100%에 근거 ≥1건 + 원문 조항 연결 (자동 테스트로 강제)
- [ ] 단정 표현이 출력 필터에서 차단됨 (레드팀 시나리오 green)
- [ ] 법률 자문 아님 고지가 모든 결과 화면에 표시
- [ ] `npm test`·`npm run redteam` 전부 green, 골드 샘플 베이스라인 수치 기록
- [ ] 패턴 미러링: spine 타입·파이프라인·룰 카탈로그 형식 유지 (재발명 없음)
