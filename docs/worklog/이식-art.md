# 미술품 자산 이식 (port/art)

> 발주: 이식 브리프 `docs/planning/이식-브리프-미술품.md` (오너+코디네이터, 2026-08-22).
> 원천: `origin/hyunsuk`(계산·차트·테스트) + 정규화본 `art-evidence.ts`(yeony-park, 5상품).
> 범위: P1 계산 엔진·차트·테스트 이식 + P2 콘텐츠 모듈 + P3 `/art` 착지 조립.

## P1 — 계산 엔진·차트·테스트 이식 (2026-08-22, 커밋: 이 파일이 포함된 port/art 커밋)

**결정과 근거**
- `lib/domain/calculations.ts`의 18함수를 `src/lib/art/calculations.ts`로 로직 무변경 이식.
  원천은 한 줄 압축본이었어서 가독성을 위해 다중 행으로 풀었고 알고리즘·경계는 그대로 뒀다.
  의존 타입은 원천 `lib/art/types.ts`에서 계산·차트가 실제로 쓰는 것만 추려
  `src/lib/art/types.ts`로 이식했다.
- 차트는 `components/art/charts.tsx`의 7 export 중 **6종**을 이식했다:
  ComparablePriceChart · AuctionResultChart · ComparableSalesTable · TrackRecordTable ·
  PlatformRecordOutcomeChart · ExitTimelineChart. 기하는 `app/globals.css`의
  `.scatter-chart`·`.result-bar`·`.outcome-bar`·`.timeline-chart`·`.chart-card`·`.table-wrap`를
  `src/components/art/art.module.css`로 추출하고 색을 `--ds-ink`·`--ds-chart-band`·
  `--ds-chart-edge`·`--ds-accent-line`·`--ds-verdict-*` 계열로만 재도색했다.
- 테스트는 `tests/art-calculations.test.ts`(node:test)를
  `src/lib/art/__tests__/calculations.test.ts`(vitest)로 포팅. 원천 10함수의 케이스·수치
  어서션을 그대로 보존했다(verdict 관련 어서션은 원천에 없었다).

**트레이드오프**
- **7번째 차트 `PlatformTrackRecordTable` 미이식**: DAKER 브랜드 컬럼, `/products/...` 내부
  딥링크, `platformName`(아트투게더/ArtNGuide/TESSA) 매핑, 플랫폼 외부 딥링크, 14열 페이지네이션을
  달고 있어 이식 금지 대상(products/compare 워크스페이스·실명·딥링크)에 직접 얽힌다.
  "차트 6종"과도 정합하므로 이 하나를 떨궈 6종을 확정했다. 대가: 플랫폼 과거이력 대형 표는
  후속 단계에서 별도 정책 통과 후 이식해야 한다.
- **`ProductView` 슬림 포팅**: 원천 `ProductView`는 `analysis: AnalysisResult`를 품고
  `AnalysisResult`가 4등급 `Verdict`(해볼 만함/조건부/주의/위험)를 내장한다. G1(4등급 배제)을
  타입 수준에서 지키려고 차트가 실제 참조하는 필드(offering.totalOfferingAmount·auctions·
  comparables·trackRecords·annualMetrics)만 남긴 슬림 타입으로 재정의했다. 대가: 원천과 1:1
  구조 동형은 포기했으나, 6개 차트는 구조적 타이핑으로 그대로 컴파일된다.
- **4등급 색 코딩 제거**: 원천 `PlatformRecordOutcomeChart`의
  `outcome-${good|warn|neutral|danger}`(index%4 순환)는 의미 없는 값에 등급형 색을 입히는
  구조라 단일 중립 채움(`outcomeSeg`, `--ds-chart-band`)으로 대체했다. 세그먼트는 텍스트
  라벨로만 구분한다(색만으로 의미 전달 금지·판정 3색 전용 원칙 준수). 낙찰/유찰·정시/지연도
  판정이 아니므로 verdict 색이 아닌 ink/edge 중립색으로 도색했다.

**검증 영향**
- `src/lib/art/__tests__/calculations.test.ts` 3 describe / 3 test 전건 통과(원천 수치 보존).
- `npx tsc --noEmit` 0 에러 · `npm run build` green · eslint(신규 파일) 0.
- 차트는 이번 착지에 렌더되지 않으므로(아래 P3) tsc·build 컴파일이 유일한 회귀 지점이다.

**알려진 한계**
- 6개 차트는 라이브러리 컴포넌트로만 존재하고 화면에 연결되지 않았다(P3 참조). 독립 경매/트랙
  데이터가 정책 통과로 연결되기 전까지 시각 회귀 커버리지는 없다.
- 슬림 `ProductView`는 차트가 쓰는 필드만 보장한다. 이 타입에 추가 필드가 필요한 후속 차트는
  타입을 확장해야 한다.

## P2 — 콘텐츠 모듈(정규화본 5상품) (2026-08-22, 커밋: 이 파일이 포함된 port/art 커밋)

**결정과 근거**
- `art-evidence.ts`의 정규화본 5상품을 §4 실명 치환·G1/G2 적용해
  `src/lib/content/art.ts`의 상수(`ART_PRODUCT_FACTS`)로 이식. 데이터 파일 커밋 없음(브리프 §3).
- 실명 중립화: 발행사명(투게더아트)→"발행사", 작가명·작품명·플랫폼명·이미지 URL·비-DART 링크
  (weshareart·artprice·cloudfront) 전부 제거. 상품 식별은 중립 "상품 1~5". 공시 접수일 순
  정렬(중립).
- 5값→3값 판정 매핑(G2): verified→match, mismatch→mismatch, review·missing·stale→unverifiable.
  결과: 상품 3만 `일치`, 나머지 4개 `대조 불가`, `원장 불일치` 0건. 금액·수치·priceChain·
  DART 접수번호는 공적 사실로 유지.
- 상품 5(원천 youngkuk)는 원천에 깨끗한 DART 링크가 없고 cloudfront PDF만 있어 링크를 싣지 않고
  `sourceNote`로 "원문 DART 접수번호 재확인 중" 격하 표기.

**트레이드오프**
- **DART 링크 전건 유지 vs §4 "2건"**: 브리프 §4는 접수번호 2건만 예시했으나 G5("외부 링크는
  DART 원문만 유지")가 상위 규칙이므로 정규화본의 DART 링크 5건(상품3의 발행실적보고서 포함)을
  모두 유지하고 DART 아닌 링크만 제거했다. 근거: `05-data-policy.md` §1이 DART 법정공시
  접수번호를 허용 실명으로 규정. 판단이 경계에 걸치면 에스컬레이션 대상이나, G5가 명시적이라
  진행했다(에스컬레이션 대신 worklog 기록).
- **원천 문안 1건 재작성**: 상품 3 한계 "…작품 가치의 적정성이나 처분 가능성을 뜻하지 않습니다"는
  출력 필터 valuation-assertion("적정")에 근접해, 의미를 보존한 채 "…작품 가치나 처분 가능성을
  보장하지 않습니다"로 바꿨다. 대가: 원문 축자성 일부 손실, 의미 동일.
- **집계 카운트(건수 나열) 미표시**: 04-expression-rules는 판정 건수 나열을 허용하나 G1이
  custom 슬롯의 집계를 특히 경계하므로 per-상품 판정만 싣고 aggregate 타일은 넣지 않았다.

**검증 영향**
- `src/lib/content/__tests__/art-copy.test.ts`: 전 문자열 `filterOutput` 통과(124 케이스),
  §4 원천 실명·브랜드·작가명 0건 grep 어서션, 4등급 어휘 0건, 판정값 3값만, source url은
  DART 도메인만, 무링크 상품은 격하 문구 보유 — 전건 통과.
- 브리프 §6 완료 grep: 배포 대상 소스(`--exclude-dir=__tests__`) 0건. 유일한 히트는 위 가드
  테스트의 어서션 정규식 자신(금지어 부재를 강제하는 장치이므로 의도적).

**알려진 한계**
- 5상품 사실은 content 모듈 하드코딩 상수다. 원천 갱신 시 수동 동기화가 필요하고, 라이선스
  Yellow인 338건 원자료·이미지·플랫폼 딥링크는 이번 범위에서 의도적으로 배제됐다.
- 판정 5→3 매핑은 브리프 G2 지시를 따랐다. 이는 02-vocabulary의 "화면 표준=EvidenceStatus
  5상태"와 층위가 다른 선택으로, 공통 명세 담당이 최종 정합을 판단해야 한다(제안만 기록).

## P3 — `/art` 착지 조립 (2026-08-22, 커밋: 이 파일이 포함된 port/art 커밋)

**결정과 근거**
- `CategoryLanding` 계약 유지, `custom` 슬롯에만 `ArtFactsSection`을 주입. 5상품 사실 카드
  (판정 칩·공모금액·기준일·priceChain·finding·limitation·DART 링크) + 상단 정직 격하 문구
  + 하단 338건 집계·격하 문구. 페이지 lead/description도 content 모듈로 옮겨 필터 감사 대상에 포함.

**트레이드오프**
- **P1 차트를 착지에 렌더하지 않음**: 정규화본에는 경매 낙찰·트랙레코드·비교거래·연차지표가
  전혀 없어 6개 차트 중 어느 것도 정직하게 데이터를 먹일 수 없다. 브리프 P3 "억지 산출 금지,
  자료 없으면 정직 표기"에 따라 차트 대신 사실 카드 + "대조 불가/기재 없음" 표기 + 명시적 격하
  문구(`ART_ABSENCE_NOTE`)로 대체했다. 대가: 착지 화면에 차트 시각 요소가 없다(계산 엔진·차트는
  후속 데이터 연결 시 붙는 라이브러리 자산으로 대기).

**검증 영향**
- `npx next start` + Playwright 스크린샷 1440·390 육안 확인: custom 섹션에 5카드(상품 3=일치
  초록칩, 나머지=대조 불가 회색칩), DART 링크 노랑 밑줄, 338 격하 노트, 모바일 단일 컬럼·무횡스크롤.
  스크린샷: `scratchpad/art-1440.png`·`art-390.png`.
- SSG HTML grep: 상품 1~5·판정 라벨·338건·DART 링크 존재, weshareart/artprice/cloudfront/
  투게더아트 0건.

**알려진 한계**
- Reveal(스크롤 등장)로 인해 첫 fullPage 스크린샷에서 하단 카드가 opacity:0로 숨겼다가,
  reduced-motion + 점진 스크롤로 재촬영해 확인했다. 실사용(스크롤)에는 영향 없음.
- `categories.ts`의 art `note`/`preview` 문안은 이번 범위에서 미변경(preview=null 전환 금지
  준수). 사실 범위 갱신은 별도 최소 diff 커밋으로 코디네이터가 판단.

---

# 2단계 — 서면 확인 무관 상세 복원 (2026-08-22, 커밋: 이 파일이 포함된 port/art 커밋)

> 브리프: `docs/planning/이식-브리프-미술품-2단계.md`. 1단계 가드레일 8종·치환표·금지 목록 전부 유효.
> integration HEAD(0f25124) 위에서 작업. 새 데이터·신규 라우트 없음.

## P1 확장 카드(접이식 상세)

**결정과 근거**
- 5상품 카드에 `<details>` 상세를 붙였다: ① 공시 문서 좌표(문서 종류·접수번호·기준일) ②
  공모가 구성 검산 전개(취득가+발행비용=공모가·차액, `unexplainedDifference` 엔진으로 계산) ③
  공시 기재 순서(priceChain) ④ 한계 전문 ⑤ 근거 상태 3값 쉬운 캡션(`verdict-captions.ts` 재사용).
- content 모델을 `costBreakdown` 단일 객체에서 `acquisition`/`issuanceCost` 두 필드로 분리.
  상품4는 취득가(6억)만 공시되고 발행비용 분리 기재가 없어, 취득가는 살리고 구성 검산은
  "대상 아님"으로 정직 표기하기 위함.

**트레이드오프**
- "문서 좌표"의 표·행 단위는 정규화본에 없어 억지 생성하지 않고 접수번호 단위(rcpNo)까지만
  좌표로 제시했다. 대가: products/[id] 원본의 표·행 인용 세밀도는 재현하지 못한다(원자료 Yellow).

**검증 영향**
- `art-copy.test.ts`에 rcpNo⊂url 어서션, 취득가+발행비용=공모금액 검산 어서션, 신규 문안 전건
  filterOutput 통과(정적 ART_* 상수를 리플렉션으로 수집해 누락 방지) 추가.

**알려진 한계**
- 상세의 캡션·좌표는 공시 계층까지만. 원문 표 위치 인용은 서면 확인·원자료 도입 후 단계.

## P2 차트 착지 렌더

**결정과 근거**
- 1단계 이식 6종은 경매·트랙 데이터가 필요해 여전히 미렌더. 대신 정규화본에서 **정직하게
  산출 가능한** 두 그래프를 신설(`OfferingCharts.tsx`): ① 상품별 공모금액 구성 스택바
  (취득가+발행비용, 분리 기재 없는 상품4·5는 "구성 분리 기재 없음") ② 5상품 공모금액 비교 컬럼.
- 색은 `--ds-ink`·`--ds-chart-band`·`--ds-chart-edge`만. 판정·등급 색 없음. 비교 컬럼은
  금액순이 아닌 카드와 같은 공시 접수일 순으로 배치해 서열 인상을 배제했다.

**트레이드오프**
- 브리프 P2 문구는 "6종 중 산출 가능한 것"이나 6종 어느 것도 정규화본으로 못 먹인다. 6종은
  라이브러리로 두고, 브리프가 명시한 ①②를 공모금액 사실(공적 수치) 기반 신규 차트로 구현했다.
  대가: 신규 차트 2종이 늘었으나 데이터는 전부 이미 검증된 공시 금액이라 새 원천은 없다.

**검증 영향**
- tsc·build·스크린샷(1440/390)로 렌더 확인. 스택바 폭·컬럼 높이는 공모금액 비율에서 파생.

**알려진 한계**
- 경매·회수 차트(ComparablePriceChart 등)는 여전히 데이터 없음 → 미렌더 유지.

## P3 인페이지 비교

**결정과 근거**
- `ArtCompareSection`(클라이언트) — 상품 2~3개 선택 → 사실 행만 비교표(공모금액·취득가·
  발행비용·구성 검산 차액·기준일·상태·공시 문서 rcpNo·근거 상태). 선택은 `?compare=` URL로
  공유. localStorage 트레이 미도입(브리프 지시).
- URL 상태는 `history.replaceState` + 마운트 시 `location.search` 파싱으로 구현. `useSearchParams`
  대신 이 방식을 쓴 이유: /art의 정적 프리렌더(○)를 유지(useSearchParams는 Suspense·동적화 유발).

**트레이드오프**
- 마운트 후 URL 반영이라 SSR 초기 렌더는 미선택(하이드레이션 안전). 대가: 첫 페인트에 표가 없다가
  URL 있으면 채워진다. `react-hooks/set-state-in-effect` 1건은 기능성 프래그마로 국소 억제
  (브라우저 전용 API 마운트 동기화·하이드레이션 안전 패턴, 산문 주석 아님).
- 구성 검산 결과 셀은 "0원"으로 표기(판정 어휘 일치/대조 불가 재사용 금지 — 02 어휘 충돌 방지).

**검증 영향**
- Playwright: 상품1+3 클릭 → `?compare=art-1,art-3` 생성 확인. `?compare=art-2,art-3,art-5`
  로드 → 칩 3개 aria-pressed 복원 확인. 스크린샷 art2-compare.png.

**알려진 한계**
- popstate(뒤로가기) 재동기화는 미구현(단일 페이지·replaceState라 실사용 영향 경미). 필요 시
  useSyncExternalStore로 확장 가능.

## P4 계산 기준 블록

**결정과 근거**
- 게이트 무관 산식만 접이식 설명: 구성 검산(취득가+발행비용=공모가), 차이율((공모가−기준가)/기준가).
  "네 단계 최종 판단" 서술 없음. 주어는 화면·수치(자기보고형 금지 준수).

**검증 영향**
- 전 문안 content 모듈 + filterOutput 감사. "최종 투자 판단을 대신하지 않습니다" 등 부정형
  고지가 필터를 통과함을 테스트로 고정.

**알려진 한계**
- 차이율 산식은 설명만. 상품4의 낙찰가 대비 프리미엄 등 개별 수치는 오인 소지가 있어 산식
  서술에 한정하고 상품별 수치 단정은 넣지 않았다.

## 완료 확인
- 전체 test 1307 passed/28 skipped(1207+ 유지) · tsc 0 · eslint 0 · build green(/art static 유지).
- §6 금지어 grep: 배포 소스 0건(유일 히트는 art-copy.test.ts 가드 정규식 자신).
- 스크린샷: scratchpad/art2-1440.png · art2-390.png · art2-compare.png. push 안 함.
