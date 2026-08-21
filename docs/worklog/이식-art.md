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
