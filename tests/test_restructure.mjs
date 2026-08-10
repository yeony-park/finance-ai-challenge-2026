import assert from "node:assert/strict";
import fs from "node:fs";
import { filterProductsByIntent, lifecycleState, newnessDate, parseSearchIntent, searchCatalog, sortProductsByNewness } from "../js/calculations.js";

const root = new URL("../", import.meta.url);
const products = JSON.parse(fs.readFileSync(new URL("data/products.json", root))).products;
const issuers = JSON.parse(fs.readFileSync(new URL("data/issuers.json", root))).issuers;
const index = fs.readFileSync(new URL("index.html", root), "utf8");
const app = fs.readFileSync(new URL("js/app.js", root), "utf8");
const liveRoot = new URL("live/", root);
const ids = new Set(products.map((product) => product.id));
const sourceById = (product) => new Set((product.sources || []).map((source) => source.id));
const assertSourceRefs = (product, refs, label) => refs.forEach((id) => assert.ok(sourceById(product).has(id), `${product.id} ${label} source ${id}`));
const assertSafeSource = (product, source, label) => {
  assert.ok(source.id, `${product.id} ${label} source id`);
  assert.match(source.id, /^[A-Za-z0-9][A-Za-z0-9._-]*$/, `${product.id} ${label} source id safety`);
  const url = new URL(source.url);
  assert.ok(["http:", "https:"].includes(url.protocol), `${product.id} ${label} source URL protocol`);
};
const assertNullable = (value, predicate, label) => assert.ok(value === null || predicate(value), label);
const sourceMetadataFields = ["id", "label", "url", "as_of", "document_name", "publisher", "collected_at", "evidence_grade"];

// 기존 8개 상품과 공통 모델 계약
assert.equal(products.length, 8);
assert.deepEqual(products.map((product) => product.id), [
  "sou-product-13", "sou-product-6", "sou-product-7",
  "at-kim-whanki-009-01", "at-chonghyun-009-02", "at-youngkuk-008",
  "at-kusama-001", "at-condo-002",
]);
const commonFields = ["identification", "legal_issuer", "service", "schedule", "investment_terms", "lifecycle", "status", "recovery", "review", "review_status", "evidence", "comments", "validation", "change_history"];
for (const product of products) {
  assert.ok(product.common_model, `${product.id} common_model`);
  for (const field of commonFields) assert.ok(Object.hasOwn(product.common_model, field), `${product.id} common_model.${field}`);
  assert.equal(product.common_model.review_status.value, "-");
  assert.ok(Array.isArray(product.common_model.evidence.source_ids));
  assert.equal(typeof product.common_model.evidence.version, "string");
  assertSourceRefs(product, product.common_model.evidence.source_ids, "model evidence");
  assert.ok(Array.isArray(product.common_model.comments.card.source_ids));
  assert.equal(product.common_model.comments.card.evidence_version, product.common_model.evidence.version);
  assertSourceRefs(product, product.common_model.comments.card.source_ids, "card evidence");
  for (const comment of product.common_model.comments.detail) {
    assert.equal(typeof comment.text, "string");
    assert.ok(Array.isArray(comment.source_ids));
    assert.equal(comment.evidence_version, product.common_model.evidence.version);
    assertSourceRefs(product, comment.source_ids, "detail evidence");
  }
  assert.ok(Array.isArray(product.sources) && product.sources.length > 0, `${product.id} sources`);
  for (const source of product.sources) {
    assertSafeSource(product, source, "source");
    for (const field of sourceMetadataFields) assert.ok(Object.hasOwn(source, field), `${product.id} source ${field}`);
    for (const field of ["document_name", "publisher", "collected_at", "evidence_grade"]) assert.equal(source[field], null, `${product.id} source unknown ${field}`);
  }
  const { identification, schedule, investment_terms: terms, status, recovery, review } = product.common_model;
  assert.deepEqual(identification.product_name, product.name);
  assert.deepEqual(identification.asset_category, product.category);
  for (const field of ["legal_issuer_id", "legal_issuer_name", "service_brand", "service_operator", "subscription_platform"]) assertNullable(identification[field], (value) => typeof value === "string", `${product.id} ${field}`);
  for (const field of ["platform_registered_at", "offering_announcement_date", "subscription_start_date", "subscription_end_date"]) assertNullable(schedule[field], (value) => typeof value === "string", `${product.id} ${field}`);
  for (const field of ["target_operating_period_months", "actual_operating_period_months"]) assertNullable(schedule[field], Number.isFinite, `${product.id} ${field}`);
  assertNullable(terms.dividend_confirmed, (value) => typeof value === "boolean", `${product.id} dividend confirmed`);
  for (const dividendField of ["expected_dividend", "actual_dividend"]) {
    const value = terms[dividendField];
    assert.ok(value === null || (Object.hasOwn(value, "amount_krw") && Object.hasOwn(value, "rate_pct") && Object.hasOwn(value, "as_of")), `${product.id} ${dividendField} shape`);
    if (value) {
      assertNullable(value.amount_krw, Number.isFinite, `${product.id} ${dividendField} amount`);
      assertNullable(value.rate_pct, Number.isFinite, `${product.id} ${dividendField} rate`);
      assertNullable(value.as_of, (date) => typeof date === "string", `${product.id} ${dividendField} date`);
    }
  }
  assert.equal(status.status_text, product.status);
  assert.equal(status.status_detail, product.status_detail);
  assert.equal(status.lifecycle_state, product.common_model.lifecycle.state);
  assert.deepEqual(Object.keys(recovery).sort(), ["actual_sale_price_krw", "expected_method", "total_return_krw", "total_return_pct"]);
  assert.deepEqual(review.item_evidence_source_ids, product.common_model.evidence.source_ids);
  assert.deepEqual(review.ai_comments, product.common_model.comments.detail);
  assertSourceRefs(product, review.item_evidence_source_ids, "review evidence");
}
for (const issuer of issuers) for (const source of issuer.sources) {
  for (const field of sourceMetadataFields) assert.ok(Object.hasOwn(source, field), `${issuer.id} source ${field}`);
  for (const field of ["document_name", "publisher", "collected_at", "evidence_grade"]) assert.equal(source[field], null, `${issuer.id} source unknown ${field}`);
}
const sou = products.filter((product) => product.common_model.service.brand === "SOU");
const together = products.filter((product) => product.common_model.service.brand === "투게더아트");
assert.equal(sou.length, 3);
assert.equal(together.length, 5);
for (const product of sou) {
  assert.equal(product.common_model.legal_issuer.verification_status, "pending");
  assert.equal(product.common_model.legal_issuer.id, null);
  assert.equal(product.common_model.legal_issuer.name, null);
  assert.equal(product.common_model.legal_issuer.display_name, "-");
}
for (const product of together) {
  assert.equal(product.common_model.legal_issuer.verification_status, "verified");
  assert.equal(product.common_model.legal_issuer.display_name, "주식회사 투게더아트");
}
assert.ok(sou.every((product) => product.common_model.schedule.subscription_start_date === null || typeof product.common_model.schedule.subscription_start_date === "string"));
assert.ok(sou.some((product) => product.common_model.investment_terms.minimum_investment_amount_krw === null));

// 생애주기와 상태 보존: 불확인·거래중단을 운용중으로 승격하지 않음
assert.equal(lifecycleState({ status_code: "TRADING_STOPPED", status: "운용 중" }), "TRADING_STOPPED");
assert.equal(lifecycleState({ common_model: { lifecycle: { state: "UNVERIFIED" } }, status: "운용 중" }), "UNVERIFIED");
assert.ok(sou.every((product) => lifecycleState(product) === "TRADING_STOPPED"));
assert.ok(together.every((product) => lifecycleState(product) === "UNVERIFIED"));
assert.deepEqual(["UPCOMING", "SUBSCRIPTION", "OPERATING", "COMPLETED", "TRADING_STOPPED", "UNVERIFIED"].map((state) => lifecycleState({ common_model: { lifecycle: { state } }, status: state })), ["UPCOMING", "SUBSCRIPTION", "OPERATING", "COMPLETED", "TRADING_STOPPED", "UNVERIFIED"]);

// 자연어 조건, unknown fallback, 결과 필터
const stopped = parseSearchIntent("수원 부동산 거래 중단", products);
assert.deepEqual(stopped.filters, { category: "부동산", region: "수원", lifecycle: "TRADING_STOPPED" });
assert.equal(parseSearchIntent("최소 투자금액 100만원 이하", products).filters.minimum_investment_amount_krw.value, 1000000);
assert.equal(parseSearchIntent("목표 운용기간 3년 이하", products).filters.target_operating_period_months.value, 36);
assert.equal(parseSearchIntent("배당이 있는 미술품", products).filters.dividend_confirmed, true);
assert.equal(parseSearchIntent("검토 상태 양호", products).filters.review_status, "양호");
assert.equal(parseSearchIntent("2020년 작품", products).filters.asset_year, 2020);
assert.equal(filterProductsByIntent(products, parseSearchIntent("투게더아트", products)).length, 5);
assert.equal(searchCatalog(products, "수원 부동산 거래 중단").products[0].id, "sou-product-7");
const unknown = parseSearchIntent("알 수 없는 키워드", products);
assert.deepEqual(unknown.filters, {});
assert.equal(unknown.remaining_keywords, "알 수 없는 키워드");
assert.equal(searchCatalog(products, "검토 상태 양호").products.length, 0);

// 문서·랜딩에 제시한 검색 예시는 현재 데이터와 parser의 실제 결과를 사용한다.
const examples = [
  ["대전 부동산 거래 중단", ["sou-product-13"]],
  ["김환기 미술품", ["at-kim-whanki-009-01"]],
  ["항공기 엔진", []],
];
for (const [query, expectedIds] of examples) {
  assert.ok(index.includes(query), `search example ${query}`);
  const result = searchCatalog(products, query);
  assert.deepEqual(result.products.map((product) => product.id), expectedIds, `search example result ${query}`);
  assert.equal(result.intent.query, query);
}

// 최신순: 날짜 없는 항목은 마지막, 동일 날짜는 입력 순서 유지
const dated = [
  { id: "null-a", common_model: { schedule: {} } },
  { id: "same-a", common_model: { schedule: { offering_announcement_date: "2026-01-01" } } },
  { id: "same-b", common_model: { schedule: { subscription_start_date: "2026-01-01" } } },
  { id: "new", common_model: { schedule: { platform_registered_at: "2026-02-01" } } },
  { id: "null-b", common_model: { schedule: {} } },
];
assert.equal(newnessDate(dated[0]), null);
assert.deepEqual(sortProductsByNewness(dated).map((product) => product.id), ["new", "same-a", "same-b", "null-a", "null-b"]);

// index 구조와 접근성 계약
assert.match(index, /<form id="search-form"[^>]*role="search"/);
assert.match(index, /<input id="search-input"[^>]*type="search"/);
assert.match(index, /<section class="results"/);
assert.match(index, /id="product-cards"/);
assert.match(index, /id="detail"[^>]*data-testid="product-detail"/);
assert.match(index, /aria-live="polite"/);
assert.match(index, /<label for="search-input">/);
assert.match(app, /setAttribute\("aria-pressed",String\(/);
assert.match(app, /setAttribute\("aria-label",/);
assert.equal((app.match(/const assetTiles=/g) || []).length, 1);
const assetBlock = app.match(/const assetTiles=.*?function renderAssetTiles/s)?.[0] || "";
const lifecycleBlock = app.match(/const lifecycleTabs=.*?const assetTiles/s)?.[0] || "";
assert.deepEqual([...assetBlock.matchAll(/\["(ALL|부동산|미술품|항공기 엔진)",/g)].map((match) => match[1]), ["ALL", "부동산", "미술품", "항공기 엔진"]);
assert.deepEqual([...lifecycleBlock.matchAll(/\["(ALL|UPCOMING|SUBSCRIPTION|OPERATING|COMPLETED|TRADING_STOPPED|UNVERIFIED)",/g)].map((match) => match[1]), ["ALL", "UPCOMING", "SUBSCRIPTION", "OPERATING", "COMPLETED", "TRADING_STOPPED", "UNVERIFIED"]);

// 현 단계에서 비교·연환산 값·직접 청약 UI는 만들지 않음
assert.doesNotMatch(`${index}\n${app}`, /annualized/i);
assert.match(app, /연환산 수익률이 아닙니다/);
assert.doesNotMatch(app, /compareProducts|comparisonMode|비교하기|상품 비교/);
assert.doesNotMatch(index, /href=["'][^"']*(subscribe|subscription|청약)[^"']*["']/i);
assert.doesNotMatch(app, /\.href\s*=\s*[^;]*subscription|청약하기/);
assert.match(app, /근거와 변경 이력/);
assert.match(app, /투자 권유·감정평가가 아니며/);
assert.match(app, /공개 자료에서 확인되지 않음/);
assert.match(app, /value==null\|\|value===""\?"공개 자료에서 확인되지 않음"/);

// URL 원문은 보존하되, 직접 청약 pathname만 비활성 근거 표기로 렌더링한다.
const validHttpSource = app.match(/^function validHttp.*$/m)?.[0];
const directSubscriptionPageSource = app.match(/^function directSubscriptionPage.*$/m)?.[0];
const linkSource = app.match(/^function link.*$/m)?.[0];
assert.ok(validHttpSource && directSubscriptionPageSource && linkSource, "URL guard functions");
const validHttp = Function(`${validHttpSource}; return validHttp;`)();
const directSubscriptionPage = Function(`${directSubscriptionPageSource}; return directSubscriptionPage;`)();
assert.equal(directSubscriptionPage("https://www.weshareart.com/goods/subscription/detail/178"), true, "direct subscription page is blocked");
assert.equal(directSubscriptionPage("https://weshareart.com/api/public/goods/subscription-by-goods-id?goodsId=169"), false, "subscription API is not a direct page");
assert.equal(directSubscriptionPage("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002"), false, "DART evidence remains allowed");
assert.equal(directSubscriptionPage("https://api.sou.place/api/v1/public/products/product/13"), false, "SOU evidence remains allowed");
assert.ok(linkSource.indexOf("!validHttp(url)") < linkSource.indexOf("directSubscriptionPage(url)"), "invalid URL guard precedes direct subscription guard");
const guardEl = (tag, klass, value) => ({ tag, klass, value });
const guardedLink = Function("el", "validHttp", "directSubscriptionPage", "kst", `${linkSource}; return link;`)(guardEl, validHttp, directSubscriptionPage, (value) => value);
const blockedSubscription = guardedLink("투게더아트 청약 원문", "https://www.weshareart.com/goods/subscription/detail/178", "2026-08-08");
assert.deepEqual(blockedSubscription, { tag: "span", klass: "muted", value: "투게더아트 청약 원문 · 2026-08-08 : 직접 청약 페이지 링크는 제공하지 않습니다" });
const allowedApi = guardedLink("투게더아트 API", "https://weshareart.com/api/public/goods/subscription-by-goods-id?goodsId=169");
assert.equal(allowedApi.tag, "a");
assert.equal(allowedApi.href, "https://weshareart.com/api/public/goods/subscription-by-goods-id?goodsId=169");
assert.equal(allowedApi.rel, "noopener noreferrer");
assert.equal(guardedLink("DART 원문", "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002").tag, "a", "DART evidence link remains allowed");
assert.equal(guardedLink("SOU 원문", "https://api.sou.place/api/v1/public/products/product/13").tag, "a", "SOU evidence link remains allowed");
assert.deepEqual(guardedLink("잘못된 원문", "javascript:alert(1)"), { tag: "span", klass: "muted", value: "잘못된 원문 : 공개 자료에서 확인되지 않음" });

// 배당은 금액과 비율을 함께 표시하고, 실제값이 있어도 예상값을 유지한다.
const dividendValueSource = app.match(/^function dividendValue.*$/m)?.[0];
const dividendSource = app.match(/^function dividend\(p\).*$/m)?.[0];
assert.ok(dividendValueSource && dividendSource, "dividend formatter functions");
const dividendValue = Function("won", `${dividendValueSource}; return dividendValue;`)((amount) => `${amount.toLocaleString("ko-KR")}원`);
const cardDividend = Function("terms", "dividendValue", "kst", `${dividendSource}; return dividend;`)((product) => product.common_model.investment_terms, dividendValue, (value) => value);
assert.equal(dividendValue({ rate_pct: 4.5 }), "4.5%", "synthetic rate-only dividend");
assert.equal(cardDividend({ common_model: { investment_terms: { actual_dividend: { amount_krw: 1200, as_of: "2026-08-08" }, expected_dividend: { rate_pct: 4.5 } } } }), "실제 1,200원 · 2026-08-08 / 예상 4.5%", "actual as-of keeps expected rate");
assert.equal(cardDividend({ common_model: { investment_terms: { dividend_confirmed: true, actual_dividend: { amount_krw: null, rate_pct: null }, expected_dividend: { amount_krw: null, rate_pct: null } } } }), "배당 공시 확인 · 금액·비율 확인 불가", "confirmed dividend without figures is bounded");
assert.equal(cardDividend({ common_model: { investment_terms: { dividend_confirmed: false, actual_dividend: null, expected_dividend: null } } }), "-", "unconfirmed dividend remains unknown");
assert.match(app, /\["예상 배당",missing\(expected\)\]/);
assert.match(app, /\["실제 배당",missing\(actualDisplay\)\]/);
assert.match(app, /actualAsOf=actual&&t\.actual_dividend\?\.as_of/);
const expectedActualSource = app.match(/^function expectedActual.*$/m)?.[0];
assert.ok(expectedActualSource, "expected and actual dividend formatter");
const expectedActual = Function("terms", "schedule", "dividendValue", "kst", "missing", "section", "facts", `${expectedActualSource}; return expectedActual;`)(
  (product) => product.common_model.investment_terms,
  (product) => product.common_model.schedule || {},
  dividendValue,
  (value) => value,
  (value) => value ?? "공개 자료에서 확인되지 않음",
  (_title, rows) => rows,
  (rows) => rows,
);
const confirmedMissingDividendRows = expectedActual({ common_model: { investment_terms: { dividend_confirmed: true, actual_dividend: { amount_krw: null, rate_pct: null }, expected_dividend: { amount_krw: null, rate_pct: null } }, schedule: {} } });
assert.equal(confirmedMissingDividendRows.find(([label]) => label === "실제 배당")[1], "배당 공시 확인 · 금액·비율 확인 불가", "detail actual dividend remains bounded when figures are absent");
assert.match(app, /art\.hammer_date\?` · \$\{kst\(art\.hammer_date\)\}`:""/, "hammer price includes its data date");
assert.doesNotMatch(app, /annualized_dividend_yield_pct/);
assert.match(app, /\["UNVERIFIED","상태 확인 불가"\]/);
assert.doesNotMatch(app, /\["UNVERIFIED","검증 대기"\]/);
assert.match(app, /m\.validation\?\.reason/);

// 브라우저 smoke는 현재 공개 계산 API만 사용하고, 기준일을 고정한다.
const browserSmoke = fs.readFileSync(new URL("tests/test.html", root), "utf8");
assert.match(browserSmoke, /import \{ lifecycleLabel, sourceExpired \} from "\.\.\/js\/calculations\.js"/);
assert.doesNotMatch(browserSmoke, /classifyGap/);
assert.match(browserSmoke, /sourceExpired\("2026-02-08",reference\)===true/);
assert.match(browserSmoke, /sourceExpired\("2026-02-09",reference\)===false/);
assert.match(browserSmoke, /lifecycleLabel\("TRADING_STOPPED"\)==="거래 중단 · 신규 매수 불가"/);

// 출처 만료는 상품 기준일이 아니라 현재 조회 시점을 기준으로 계산하고, 원문 기준일은 계속 표시한다.
const sourceBadgesSource = app.match(/^function sourceBadges\(p\).*$/m)?.[0];
assert.ok(sourceBadgesSource, "source badge formatter");
assert.match(sourceBadgesSource, /sourceExpired\(source\.as_of,new Date\(\)\)/);
assert.match(sourceBadgesSource, /\$\{source\.label\} · \$\{kst\(source\.as_of\)\}/);

// 금지어 검사는 .env 및 .git 내부를 읽기 전에 제외하고, .env는 구조만 확인한다.
const validation = fs.readFileSync(new URL("tests/validate_data.py", root), "utf8");
assert.match(validation, /env_path=R\/['"]\.env['"];ok\(not env_path\.exists\(\) or env_path\.is_file\(\)/);
assert.match(validation, /f\.is_file\(\) and f\.name!='\.env' and '\.git' not in f\.parts/);

// null/null은 법적 발행사 매칭을 만들지 않고, SOU 이력은 서비스·운영 참고 표로만 보인다.
const legalIssuerMatchSource = app.match(/^function legalIssuerMatch.*$/m)?.[0];
assert.ok(legalIssuerMatchSource, "legal issuer matcher");
const nonemptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const legalIssuerMatch = Function("nonemptyString", `${legalIssuerMatchSource}; return legalIssuerMatch;`)(nonemptyString);
assert.equal(legalIssuerMatch({ id: null, name: null, verification_status: "pending" }, { legal_issuer: { id: null, name: null, verification_status: "pending" } }), false, "null/null never matches");
assert.equal(legalIssuerMatch({ id: "togetherart-co-ltd", name: null, verification_status: "verified" }, issuers.find((issuer) => issuer.id === "togetherart")), true, "verified legal id matches");
assert.match(app, /서비스·운영 참고 원문 이력/);
assert.match(app, /법적 발행사 이력으로 합산하지 않습니다/);
assert.match(app, /상태 확인 맥락/);

// 카드·상세 코멘트는 확인된 사실을 장점으로 승격하지 않고, 안전한 원문 링크와 버전을 함께 렌더링한다.
const summaryBlock = app.match(/function reviewSummary\(p\)\{.*?\nfunction coreTerms/s)?.[0] || "";
assert.match(summaryBlock, /\[\["장점",el\("p",null,"공개 자료에서 확인되지 않음"\)\]/);
assert.match(app, /function commentEvidence\(p,comment,tag="li"\)/);
assert.match(app, /new URL\(url\)\.href/);
assert.match(app, /a\.rel="noopener noreferrer"/);
assert.match(app, /근거 버전 : \$\{missing\(comment\?\.evidence_version\)\}/);
assert.ok(products.every((product) => {
  const comments = [product.common_model.comments.card, ...product.common_model.comments.detail];
  return comments.every((comment) => !String(comment.text).startsWith("[확인된 사실]") || !summaryBlock.includes(`\"${comment.text}\"`));
}), "confirmed facts are not hard-coded as advantages");

// 자산·생애주기 필터는 재렌더링 뒤 선택한 버튼으로 focus를 복원한다.
assert.match(app, /function focusChoice\(rootId,value\).*?\.focus\(\)/);
assert.match(app, /render\(\);focusChoice\("asset-filter",value\)/);
assert.match(app, /render\(\);focusChoice\("lifecycle-tabs",value\)/);

// /live는 builder 계약의 정적 파일 allowlist를 그대로 유지한다.
const liveFiles = [];
for (const directory of ["", "js", "data"]) {
  for (const entry of fs.readdirSync(new URL(directory, liveRoot))) {
    const relative = directory ? `${directory}/${entry}` : entry;
    const stat = fs.statSync(new URL(relative, liveRoot));
    if (stat.isFile()) liveFiles.push(relative);
  }
}
assert.deepEqual(liveFiles.sort(), [
  "data/artnguide_track_records.json", "data/issuers.json", "data/products.json", "data/tessa_sale_records.json", "data/weshareart_research.json", "index.html", "js/api.js", "js/app.js", "js/calculations.js", "js/track-records.js", "styles.css",
]);

console.log("PASS: restructure contract");
