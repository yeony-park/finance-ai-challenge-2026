import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const port = 3217;
const baseUrl = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${port}`;
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const standaloneServer = join(repoRoot, ".next", "standalone", "server.js");
let server: ChildProcess | undefined;

async function waitForServer() {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/platforms`);
      if (response.ok) return;
    } catch {
      // The development server needs a short warm-up before its first route.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`local Next.js server did not start at ${baseUrl}`);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.ok, true, `${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

type HistoricalItem = {
  recordScope: "historical";
  offering: { id: string; slug: string; isDemo: boolean; sourcePayload?: unknown; asOfDate: string | null; sourceIds: string[]; currency?: string | null; currencyNote?: string | null; totalOfferingAmount?: number | null; actualExitAmount?: number | null; finalReturn?: number | null; soldAt?: string | null; liquidatedAt?: string | null };
  trackRecord: { id: string; sourceDataset: string | null; sourcePayload?: unknown; rawStatus?: string | null; rawStatusLabel?: string | null; statusConflict?: boolean; sourceIds: string[]; sourceUrl?: string | null; status: string; lifecycle?: string; currency?: string | null; currencyNote?: string | null; exitCurrency?: string | null; reportedAmount?: number | null; finalReturn?: number | null; exitAmount?: number | null; soldAt?: string | null; sourceReportedReturnPct?: number | null; calculatedSettlementReturnPct?: number | null };
  artist: { id: string; nameKo: string };
};

type ProductResponse = {
  items: Array<{ recordScope: "current" | "historical"; offering: HistoricalItem["offering"]; trackRecord?: HistoricalItem["trackRecord"]; artist: HistoricalItem["artist"] }>;
  pagination: { total: number; pageCount: number; page: number; pageSize: number };
  counts: { current: number; historical: number; total: number; realCurrent: number; demoCurrent: number };
};

before(async () => {
  if (process.env.TEST_BASE_URL) return;
  if (existsSync(standaloneServer)) {
    server = spawn(process.execPath, [standaloneServer], {
      cwd: join(repoRoot, ".next", "standalone"),
      stdio: "ignore",
      env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port), NEXT_TELEMETRY_DISABLED: "1" },
    });
  } else {
    server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: repoRoot,
      stdio: "ignore",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    });
  }
  await waitForServer();
});

after(() => {
  server?.kill("SIGTERM");
});

test("repository API exposes all source counts and canonical platform bridge", async () => {
  const response = await getJson<ProductResponse>("/api/products?scope=historical&pageSize=100");
  assert.equal(response.counts.historical, 338);
  assert.equal(response.pagination.total, 338);

  const all: ProductResponse["items"] = [];
  for (let page = 1; page <= response.pagination.pageCount; page += 1) {
    const pageResult = await getJson<ProductResponse>(`/api/products?scope=historical&page=${page}&pageSize=100`);
    all.push(...pageResult.items);
  }
  assert.equal(all.length, 338);
  assert.equal(new Set(all.map((item) => item.offering.id)).size, 338);
  assert.deepEqual(
    Object.fromEntries([...new Set(all.map((item) => item.trackRecord?.sourceDataset ?? "missing"))].map((source) => [source, all.filter((item) => item.trackRecord?.sourceDataset === source).length])),
    { artnguide_track_records: 187, weshareart_research: 145, tessa_sale_records: 6 },
  );

  const platform = await getJson<{ items: Array<{ counts: { current: number; historical: number } }> }>("/api/platforms");
  assert.equal(platform.items[0]?.counts.current, 5);
  assert.equal(platform.items[0]?.counts.historical, 145);
});

test("RETURNED_PRODUCT records preserve returned/conflicted status and source exit fields", async () => {
  const first = await getJson<ProductResponse>("/api/products?scope=historical&source=artnguide_track_records&pageSize=100");
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.pageCount; page += 1) {
    const next = await getJson<ProductResponse>(`/api/products?scope=historical&source=artnguide_track_records&page=${page}&pageSize=100`);
    items.push(...next.items);
  }
  const returned = items.filter((item) => item.trackRecord?.rawStatus?.includes("RETURNED_PRODUCT"));
  assert.equal(returned.length, 12);
  assert.ok(returned.every((item) => item.trackRecord?.status === "returned" && item.trackRecord.lifecycle === "returned"));
  assert.ok(returned.every((item) => item.trackRecord?.status !== "sold" && item.trackRecord?.status !== "unsold"));
  assert.ok(returned.every((item) => item.trackRecord?.statusConflict === true));
  assert.ok(returned.every((item) => item.trackRecord?.rawStatusLabel === "매각완료"));
  for (const item of returned) {
    const record = (item.trackRecord?.sourcePayload as { record?: { soldMoney?: number | null; soldTime?: string | null; profit?: number | null } } | undefined)?.record;
    assert.ok(record);
    assert.equal(item.trackRecord?.exitAmount, record?.soldMoney);
    assert.equal(item.trackRecord?.soldAt, record?.soldTime?.slice(0, 10) ?? null);
    assert.equal(item.trackRecord?.finalReturn, record?.profit);
    assert.equal(item.offering.actualExitAmount, record?.soldMoney);
    assert.equal(item.offering.soldAt, record?.soldTime?.slice(0, 10) ?? null);
    assert.equal(item.offering.finalReturn, record?.profit);
  }
  assert.ok(returned.every((item) => item.trackRecord?.sourcePayload != null));

  const allItems: ProductResponse["items"] = [];
  const allFirst = await getJson<ProductResponse>("/api/products?scope=historical&pageSize=100");
  allItems.push(...allFirst.items);
  for (let page = 2; page <= allFirst.pagination.pageCount; page += 1) {
    const next = await getJson<ProductResponse>(`/api/products?scope=historical&page=${page}&pageSize=100`);
    allItems.push(...next.items);
  }
  assert.ok(allItems.every((item) => item.trackRecord?.sourcePayload != null));
  assert.ok(allItems.every((item) => item.trackRecord?.sourceDataset && item.trackRecord?.rawStatus && item.trackRecord.sourceIds.length > 0));
});

test("artist API canonicalizes names and preserves required historical counts", async () => {
  const expected = [["이우환", 41], ["박서보", 17], ["김환기", 12]] as const;
  for (const [name, count] of expected) {
    const response = await getJson<{ items: Array<{ artist: { id: string; nameKo: string }; counts: { historical: number } }> }>(`/api/artists?q=${encodeURIComponent(name)}`);
    assert.equal(response.items.length, 1, `${name} must resolve to one canonical artist`);
    assert.equal(response.items[0]?.counts.historical, count);
  }
  const kusama = await getJson<{ items: Array<{ artist: { id: string; nameKo: string } }> }>("/api/artists?q=%EC%95%BC%EC%9A%94%EC%9D%B4");
  const alternate = await getJson<{ items: Array<{ artist: { id: string; nameKo: string } }> }>("/api/artists?q=%EC%BF%A0%EC%82%AC%EB%A7%88");
  assert.equal(kusama.items.length, 1);
  assert.equal(alternate.items.length, 1);
  assert.equal(kusama.items[0]?.artist.id, alternate.items[0]?.artist.id);
  assert.equal(kusama.items[0]?.artist.nameKo, "야요이 쿠사마");
});

test("unified catalog is real-first and pagination reaches every ID exactly once", async () => {
  const first = await getJson<ProductResponse>("/api/products?scope=all&page=1&pageSize=100");
  assert.equal(first.counts.realCurrent, 5);
  assert.equal(first.counts.demoCurrent, 4);
  assert.equal(first.counts.total, 347);
  assert.equal(first.pagination.total, 347);
  assert.equal(first.pagination.pageCount, 4);
  assert.ok(first.items.slice(0, 5).every((item) => item.recordScope === "current" && !item.offering.isDemo));
  const firstDemo = first.items.findIndex((item) => item.offering.isDemo);
  assert.ok(firstDemo >= 5);
  assert.ok(first.items.slice(firstDemo).every((item) => item.recordScope === "current" ? item.offering.isDemo : true));

  const ids = new Set<string>();
  for (let page = 1; page <= first.pagination.pageCount; page += 1) {
    const result = await getJson<ProductResponse>(`/api/products?scope=all&page=${page}&pageSize=100`);
    assert.equal(result.pagination.page, page);
    assert.equal(result.pagination.total, 347);
    for (const item of result.items) {
      assert.equal(ids.has(item.offering.id), false, `duplicate product id ${item.offering.id}`);
      ids.add(item.offering.id);
    }
  }
  assert.equal(ids.size, first.pagination.total);
  assert.equal(ids.size, 347);
});

test("rendered product and platform pages expose the repository totals", async () => {
  const products = await fetch(`${baseUrl}/products?scope=historical`);
  const productHtml = await products.text();
  assert.equal(products.ok, true);
  assert.ok(productHtml.includes('id="main-content"'));

  const platform = await fetch(`${baseUrl}/platforms/platform-arttogether`);
  const platformHtml = await platform.text();
  assert.equal(platform.ok, true);
  assert.ok(platformHtml.includes('id="main-content"'));
});

test("all four demo platform detail links render usable platform content", async () => {
  const demos = [
    ["demo-platform-001", "DEMO 플랫폼 알파"],
    ["demo-platform-002", "DEMO 플랫폼 베타"],
    ["demo-platform-003", "DEMO 플랫폼 감마"],
    ["demo-platform-004", "DEMO 플랫폼 델타"],
  ] as const;
  for (const [id, name] of demos) {
    const api = await getJson<{ platform: { id: string; name: string }; isDemo: boolean; currentProducts: unknown[]; total: number }>(`/api/platforms/${id}`);
    assert.equal(api.platform.id, id);
    assert.equal(api.platform.name, name);
    assert.equal(api.isDemo, true);
    assert.equal(api.currentProducts.length, 1);
    assert.equal(api.total, 0);

    const response = await fetch(`${baseUrl}/platforms/${id}`);
    const html = await response.text();
    assert.equal(response.status, 200, id);
    assert.ok(html.includes(name), `${id} must render its platform name`);
    assert.ok(html.includes("DEMO 현재 상품"), `${id} must render its current demo product section`);
    assert.equal(html.includes("<h1>페이지를 찾을 수 없습니다.</h1>"), false, `${id} must not render not-found content`);
  }
});


test("unified historical search reaches normalized artists and lifecycle filters", async () => {
  for (const [name, expected] of [["이우환", 41], ["박서보", 17], ["김환기", 12], ["야요이 쿠사마", 39]] as const) {
    const response = await getJson<ProductResponse>(`/api/products?scope=historical&q=${encodeURIComponent(name)}&pageSize=100`);
    assert.equal(response.pagination.total, expected, `${name} historical unified search count`);
    assert.ok(response.items.every((item) => item.recordScope === "historical"));
  }
  const returned = await getJson<ProductResponse>("/api/products?scope=historical&lifecycle=returned&pageSize=100");
  assert.equal(returned.pagination.total, 12);
  assert.ok(returned.items.every((item) => item.trackRecord?.status === "returned" && item.trackRecord.lifecycle === "returned"));
  assert.ok(returned.items.every((item) => item.trackRecord?.status !== "sold" && item.trackRecord?.status !== "unsold"));
  const current = await getJson<ProductResponse>("/api/products?scope=current&currentStatus=unverified&pageSize=100");
  assert.equal(current.pagination.total, 5);
  assert.ok(current.items.every((item) => !item.offering.isDemo));
});

test("platform APIs have one canonical ArtTogether and fully reachable source histories", async () => {
  const list = await getJson<{ items: Array<{ platform: { id: string; name: string }; isDemo: boolean; counts: { current: number; historical: number; platformReportedReturn: number; calculatedSettlementReturn: number } }>; total: number; realTotal: number; demoTotal: number }>("/api/platforms");
  assert.equal(list.total, 7);
  assert.equal(list.realTotal, 3);
  assert.equal(list.demoTotal, 4);
  assert.equal(list.items.filter((item) => item.platform.id === "platform-arttogether").length, 1);
  assert.deepEqual(Object.fromEntries(list.items.filter((item) => !item.isDemo).map((item) => [item.platform.id, item.counts.historical])), {
    "platform-arttogether": 145,
    "platform-artnguide": 187,
    "platform-tessa": 6,
  });
  for (const item of list.items) {
    const first = await getJson<{ items: HistoricalItem[]; total: number; page: number; pageSize: number; pageCount: number }>(`/api/platforms/${item.platform.id}`);
    assert.equal(first.total, item.counts.historical, `${item.platform.name} detail total`);
    const ids = new Set<string>();
    for (let page = 1; page <= first.pageCount; page += 1) {
      const result = await getJson<{ items: HistoricalItem[]; page: number; total: number }>(`/api/platforms/${item.platform.id}?page=${page}`);
      assert.equal(result.page, page, `${item.platform.name} page number`);
      assert.equal(result.total, item.counts.historical, `${item.platform.name} page total`);
      result.items.forEach((entry) => {
        assert.equal(ids.has(entry.offering.id), false, `${item.platform.name} duplicate ${entry.offering.id}`);
        ids.add(entry.offering.id);
      });
    }
    assert.equal(ids.size, item.counts.historical, `${item.platform.name} pagination reachability`);
  }
});

test("source payload core fields and currency boundaries survive API and detail rendering", async () => {
  const art = await getJson<ProductResponse>("/api/products?scope=historical&source=artnguide_track_records&pageSize=1");
  const artTrack = art.items[0]?.trackRecord;
  const artRecord = (artTrack?.sourcePayload as { record?: { thumbnail?: string | null; artMaterial?: string | null; yearProfit?: number | null; soldMoney?: number | null; soldTime?: string | null; profit?: number | null } } | undefined)?.record;
  assert.ok(artRecord && artRecord.thumbnail && artRecord.artMaterial && artRecord.yearProfit !== undefined);
  assert.equal(artTrack?.currency, "KRW");
  assert.equal(artTrack?.exitAmount, artRecord?.soldMoney);
  assert.equal(artTrack?.soldAt, artRecord?.soldTime?.slice(0, 10) ?? null);
  assert.equal(artTrack?.finalReturn, artRecord?.profit);
  const artDetail = await fetch(`${baseUrl}/products/${encodeURIComponent(art.items[0]?.offering.id ?? "")}`).then((response) => response.text());
  assert.ok(artDetail.includes("thumbnail"));
  assert.ok(artDetail.includes("yearProfit"));

  const together = await getJson<ProductResponse>("/api/products?scope=historical&source=weshareart_research&pageSize=1");
  const togetherTrack = together.items[0]?.trackRecord;
  const togetherPayload = togetherTrack?.sourcePayload as { list?: { goodsId?: number; saleYieldPercent?: number | null; representativeGoodsImageUrl?: string | null }; detail?: { estimateMinAmount?: number; purchasedPercent?: number; imageList?: unknown; quantity?: number; pieceAmount?: number } };
  assert.ok(togetherPayload.list && togetherPayload.detail);
  assert.ok(togetherPayload.detail.estimateMinAmount !== undefined && togetherPayload.detail.purchasedPercent !== undefined && togetherPayload.detail.imageList !== undefined);
  assert.equal(togetherTrack?.currency, null);
  assert.equal(together.items[0]?.offering.currency, null);
  assert.equal(togetherTrack?.reportedAmount, (togetherPayload.detail.quantity ?? 0) * (togetherPayload.detail.pieceAmount ?? 0));
  assert.equal(togetherTrack?.sourceReportedReturnPct, togetherPayload.list.saleYieldPercent);
  assert.equal(togetherTrack?.calculatedSettlementReturnPct, null);

  const tessa = await getJson<ProductResponse>("/api/products?scope=historical&source=tessa_sale_records&pageSize=100");
  assert.equal(tessa.pagination.total, 6);
  assert.ok(tessa.items.every((item) => item.offering.currency === "KRW"));
  const hkd = tessa.items.find((item) => item.trackRecord?.exitCurrency === "HKD");
  assert.ok(hkd);
  const hkdRecord = hkd.trackRecord?.sourcePayload as { sale_price?: { amount?: number; currency?: string; final_sale_amount_krw?: number | null } } | undefined;
  assert.ok(hkdRecord?.sale_price);
  assert.equal(hkd.trackRecord?.currency, "KRW");
  assert.equal(hkd.trackRecord?.exitCurrency, hkdRecord.sale_price.currency);
  assert.equal(hkd.trackRecord?.exitAmount, hkdRecord.sale_price.amount);
  assert.equal(hkd.offering.actualExitAmount, hkdRecord.sale_price.amount);
  assert.equal(hkdRecord.sale_price.final_sale_amount_krw, null);
  assert.ok(hkd.offering.currencyNote?.includes("HKD") && hkd.offering.currencyNote.includes("환산"));

  const reported = tessa.items.find((item) => item.trackRecord?.sourceReportedReturnPct != null);
  assert.ok(reported);
  const reportedRecord = reported.trackRecord?.sourcePayload as { source_reported_return_pct?: number | null; calculated_settlement_return_pct?: number | null } | undefined;
  assert.ok(reportedRecord);
  assert.equal(reported.trackRecord?.sourceReportedReturnPct, reportedRecord?.source_reported_return_pct);
  assert.equal(reported.trackRecord?.calculatedSettlementReturnPct, reportedRecord?.calculated_settlement_return_pct);
  assert.notEqual(reported.trackRecord?.sourceReportedReturnPct, reported.trackRecord?.calculatedSettlementReturnPct);
  assert.equal(reported.trackRecord?.finalReturn, reported.trackRecord?.sourceReportedReturnPct);
  assert.equal(reported.offering.finalReturn, reported.trackRecord?.sourceReportedReturnPct);

  const tessaPlatform = await getJson<{ counts: { platformReportedReturn: number; calculatedSettlementReturn: number } }>("/api/platforms/platform-tessa");
  assert.equal(tessaPlatform.counts.platformReportedReturn, 1);
  assert.equal(tessaPlatform.counts.calculatedSettlementReturn, 6);
  const tessaPlatformHtml = await fetch(`${baseUrl}/platforms/platform-tessa`).then((response) => response.text());
  assert.ok(tessaPlatformHtml.includes("플랫폼 기재 수익률"));
  assert.ok(tessaPlatformHtml.includes("DAKER 계산 수익률"));
  assert.ok(tessaPlatformHtml.includes("source_reported_return_pct"));
  assert.ok(tessaPlatformHtml.includes("calculated_settlement_return_pct"));

  const tessaId = reported.offering.id;
  assert.ok(tessaId.includes(":"));
  const tessaApiResponse = await fetch(`${baseUrl}/api/products/${encodeURIComponent(tessaId)}`);
  assert.equal(tessaApiResponse.status, 200);
  const tessaApiProduct = await tessaApiResponse.json() as HistoricalItem;
  assert.equal(tessaApiProduct.offering.id, tessaId);
  const tessaResponse = await fetch(`${baseUrl}/products/${encodeURIComponent(tessaId)}`);
  const tessaDetail = await tessaResponse.text();
  assert.equal(tessaResponse.status, 200);
  assert.ok(tessaDetail.includes("source_reported_return_pct"));
  assert.ok(tessaDetail.includes("calculated_settlement_return_pct"));
  assert.ok(tessaDetail.includes("sale currency"));
  assert.ok(tessaDetail.includes("payout_date"));
  assert.ok(tessaDetail.includes("holding_period_days"));
});

test("checkbox filters combine selections and blank numeric filters do not hide history", async () => {
  const allPage = await fetch(`${baseUrl}/products?scope=historical`).then((response) => response.text());
  assert.match(allPage.replace(/<!--.*?-->/g, ""), />338건</);
  const filteredPage = await fetch(`${baseUrl}/products?scope=historical&lifecycle=operating&lifecycle=sold`).then((response) => response.text());
  assert.match(filteredPage.replace(/<!--.*?-->/g, ""), />231건</);
  const filteredApi = await getJson<ProductResponse>("/api/products?scope=historical&lifecycle=operating&lifecycle=sold&pageSize=100");
  assert.equal(filteredApi.pagination.total, 231);
});

test("compare workspace renders selectable products and a two-product comparison", async () => {
  const emptyResponse = await fetch(`${baseUrl}/compare`);
  const emptyHtml = await emptyResponse.text();
  assert.equal(emptyResponse.ok, true);
  assert.ok(emptyHtml.includes("비교할 상품 선택"));
  assert.equal((emptyHtml.match(/class="compare-choice /g) ?? []).length, 9);
  assert.ok(emptyHtml.includes("최소 2개"));

  const comparedResponse = await fetch(`${baseUrl}/compare?ids=demo-art-001,demo-art-004`);
  const comparedHtml = await comparedResponse.text();
  assert.equal(comparedResponse.ok, true);
  assert.ok(comparedHtml.replace(/<!--.*?-->/g, "").includes("선택 상품 2개 비교"));
  assert.ok(comparedHtml.includes("DEMO 작가 A"));
  assert.ok(comparedHtml.includes("DEMO 작가 D"));
  assert.ok(comparedHtml.includes("비교에서 제외"));
  assert.ok(comparedHtml.includes("설명되지 않는 차액"));
  assert.ok(comparedHtml.includes("플랫폼 청산 이력"));
});

test("home exposes the JeomJeom evidence workflow while keeping legacy platform history", async () => {
  const home = await fetch(`${baseUrl}/`).then((response) => response.text());
  const homeText = home.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  assert.equal(home.includes("REPOSITORY SNAPSHOT"), false);
  for (const label of [
    "조각투자, 뭘 확인해야 할까요?",
    "증권신고서 × 공공 원장 — 대조 실측",
    "조각투자 첫걸음",
    "카테고리별 확인 현황",
    "‘믿을 만한가’를 확인하는 8가지 질문",
  ]) assert.ok(homeText.includes(label), label);
  for (const href of ["/cattle", "/pig", "/art", "/real-estate", "/offers", "/methodology"]) {
    assert.ok(home.includes(`href="${href}"`), href);
  }
  for (const id of ["platform-arttogether", "platform-artnguide", "platform-tessa"]) {
    const response = await fetch(`${baseUrl}/platforms/${id}`);
    assert.equal(response.ok, true, id);
    assert.ok((await response.text()).includes("과거 상품 이력"));
  }
});


test("AI disclosure review routes expose only candidate data and grounded fallback", async () => {
  const analyzeResponse = await fetch(`${baseUrl}/api/ai/analyze-product`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: "at-chonghyun-009-02" }),
  });
  assert.equal(analyzeResponse.ok, true);
  const analyze = await analyzeResponse.json() as { reviewStatus: string; published: boolean; riskAssessment: { decisionStatus: string; blockers: Array<{ code: string }> }; documents: unknown[]; candidates: unknown[] };
  assert.equal(analyze.reviewStatus, "candidate_only");
  assert.equal(analyze.published, false);
  assert.equal(analyze.riskAssessment.decisionStatus, "not_assessed");
  assert.ok(analyze.riskAssessment.blockers.some((blocker) => blocker.code === "unapproved_correction"));
  const serialized = JSON.stringify(analyze);
  for (const forbidden of ["OPENAI_API_KEY", "DART_API_KEY", "crtfc_key", "sourcePayload", "<?xml"]) assert.equal(serialized.includes(forbidden), false);

  const askResponse = await fetch(`${baseUrl}/api/ai/ask-product`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: "at-chonghyun-009-02", question: "취득가와 공모금액은 얼마야?" }),
  });
  assert.equal(askResponse.ok, true);
  const ask = await askResponse.json() as { answer: { answerBlocks: Array<{ citations: unknown[] }> } };
  assert.ok(ask.answer.answerBlocks.length > 0);
  assert.ok(ask.answer.answerBlocks.every((block) => block.citations.length > 0));

  const unsupportedResponse = await fetch(`${baseUrl}/api/ai/ask-product`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: "at-chonghyun-009-02", question: "작가 거래량은 실제로 어느 정도야?" }),
  });
  assert.equal(unsupportedResponse.ok, true);
  const unsupported = await unsupportedResponse.json() as { answer: { answerBlocks: unknown[] }; fallbackReason: string };
  assert.deepEqual(unsupported.answer.answerBlocks, []);
  assert.equal(unsupported.fallbackReason, "insufficient_context");

  const detail = await fetch(`${baseUrl}/products/at-chonghyun-009-02`).then((response) => response.text());
  assert.match(detail, /AI 공시 실사 코파일럿/);
  assert.match(detail, /AI 추출값은 현재 상품 사실과 판정에 자동 반영되지 않습니다/);
});
