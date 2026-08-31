import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const fixture = JSON.parse(readFileSync(join(repoRoot, "data/synthetic/art-investment.json"), "utf8")) as {
  offerings: Array<{ id: string; artistId: string; platformId: string; issuerId: string; title: string }>;
  artworks: Array<{ id: string; artistId: string; imageUrl: string | null }>;
  artists: Array<{ id: string; nameKo: string; imageUrl: string | null }>;
  platforms: Array<{ id: string; name: string }>;
  issuers: Array<{ id: string; platformIds: string[] }>;
  trackRecords: Array<{ id: string; platformId: string; status: string; lifecycle: string; sourceReportedReturnPct?: number | null; finalReturn?: number | null; calculatedSettlementReturnPct?: number | null }>;
};
const currentCount = fixture.offerings.length;
const historicalCount = fixture.trackRecords.length;
const forbiddenKeys = new Set(["sourcePayload", "dueDiligencePayload", "sourceSnapshot", "legacySourceRef"]);
const openDartHosts = new Set(["dart.fss.or.kr", "englishdart.fss.or.kr", "opendart.fss.or.kr", "api.odcloud.kr"]);
const port = 3217;
const baseUrl = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${port}`;
const standaloneServer = join(repoRoot, ".next", "standalone", "server.js");
let server: ChildProcess | undefined;

function walk(value: unknown, visit: (value: unknown) => void) {
  visit(value);
  if (Array.isArray(value)) for (const child of value) walk(child, visit);
  else if (value && typeof value === "object") for (const child of Object.values(value)) walk(child, visit);
}
function assertSyntheticDto(value: unknown) {
  walk(value, (item) => {
    if (!item || typeof item !== "object") return;
    for (const key of Object.keys(item)) assert.equal(forbiddenKeys.has(key), false, `forbidden DTO key: ${key}`);
    if (typeof item === "object" && !Array.isArray(item)) {
      for (const child of Object.values(item)) {
        if (typeof child !== "string" || !/^https?:\/\//i.test(child)) continue;
        const host = new URL(child).hostname.toLowerCase();
        assert.equal(openDartHosts.has(host) || host.endsWith(".dart.fss.or.kr"), true, `non-OpenDART URL: ${child}`);
      }
    }
  });
  assert.equal(JSON.stringify(value).includes("sourcePayload"), false);
  assert.equal(JSON.stringify(value).includes("dueDiligencePayload"), false);
  assert.equal(JSON.stringify(value).includes("sourceSnapshot"), false);
  assert.equal(JSON.stringify(value).includes("legacySourceRef"), false);
}
async function waitForServer() {
  for (let attempt = 0; attempt < 160; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/platforms`);
      if (response.ok) return;
    } catch {
      // Allow a local Next.js process time to warm up.
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

// Unlike fetch(new URL(...)), node:http sends this path string as-is. This is
// required to exercise malformed percent escapes before URL/client normalization.
async function rawGet(path: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  const target = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const request = httpRequest({ hostname: target.hostname, port: target.port, method: "GET", path }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.on("error", reject);
    request.end();
  });
}
async function allPages(path: string, pageSize = 100): Promise<{ first: ProductResponse; items: ProductResponse["items"] }> {
  const first = await getJson<ProductResponse>(`${path}${path.includes("?") ? "&" : "?"}page=1&pageSize=${pageSize}`);
  const items = [...first.items];
  for (let page = 2; page <= first.pagination.pageCount; page += 1) {
    const next = await getJson<ProductResponse>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&pageSize=${pageSize}`);
    assert.equal(next.pagination.page, page);
    assert.equal(next.pagination.total, first.pagination.total);
    items.push(...next.items);
  }
  return { first, items };
}

type ProductResponse = {
  dataMode: string;
  items: Array<{ recordScope: string; dataMode: string; offering: { id: string; isDemo: boolean }; artist: { nameKo: string }; trackRecord?: unknown }>;
  pagination: { total: number; pageCount: number; page: number; pageSize: number };
  counts: { current: number; historical: number; total: number; realCurrent: number; demoCurrent: number };
};

before(async () => {
  if (process.env.TEST_BASE_URL) return;
  if (existsSync(standaloneServer)) {
    server = spawn(process.execPath, [standaloneServer], { cwd: join(repoRoot, ".next", "standalone"), stdio: "ignore", env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port), NEXT_TELEMETRY_DISABLED: "1" } });
  } else {
    server = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)], { cwd: repoRoot, stdio: "ignore", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  }
  await waitForServer();
});
after(() => server?.kill("SIGTERM"));

test("catalog API exposes fixture-derived synthetic counts and pagination", async () => {
  const { first, items } = await allPages("/api/products?scope=all");
  assert.equal(first.dataMode, "synthetic");
  assert.deepEqual(first.counts, { current: currentCount, historical: historicalCount, total: currentCount + historicalCount, realCurrent: 0, demoCurrent: currentCount });
  assert.equal(first.pagination.total, currentCount + historicalCount);
  assert.equal(items.length, currentCount + historicalCount);
  assert.equal(new Set(items.map((item) => item.offering.id)).size, items.length);
  assert.equal(items.filter((item) => item.recordScope === "current").length, currentCount);
  assert.equal(items.filter((item) => item.recordScope === "historical").length, historicalCount);
  assert.ok(items.every((item) => item.dataMode === "synthetic" && item.offering.isDemo));
  assertSyntheticDto(items);

  const current = await getJson<ProductResponse>("/api/products?scope=current&pageSize=100");
  const history = await getJson<ProductResponse>("/api/products?scope=historical&pageSize=100");
  assert.equal(current.pagination.total, currentCount);
  assert.equal(history.pagination.total, historicalCount);
});

test("historical filters use the single synthetic source and preserve statuses", async () => {
  const source = await getJson<ProductResponse>("/api/products?scope=historical&source=synthetic&pageSize=100");
  assert.equal(source.pagination.total, historicalCount);
  const status = fixture.trackRecords[0]?.status;
  assert.ok(status);
  const filtered = await getJson<ProductResponse>(`/api/products?scope=historical&status=${encodeURIComponent(status)}&pageSize=100`);
  assert.equal(filtered.pagination.total, fixture.trackRecords.filter((record) => record.status === status).length);
  assert.ok(filtered.items.every((item) => item.recordScope === "historical"));
  const unknownSource = await getJson<ProductResponse>("/api/products?scope=historical&source=not-a-source&pageSize=100");
  assert.equal(unknownSource.pagination.total, 0);
  assertSyntheticDto(source);
  assertSyntheticDto(filtered);
});

test("platform and artist APIs expose fixture relationships in synthetic mode", async () => {
  const platforms = await getJson<{ dataMode: string; items: Array<{ platform: { id: string; name: string }; dataMode: string; isDemo: boolean; counts: { current: number; historical: number; platformReportedReturn: number; availableSyntheticReturn: number } }>; total: number; realTotal: number; demoTotal: number }>("/api/platforms");
  assert.equal(platforms.dataMode, "synthetic");
  assert.equal(platforms.total, fixture.platforms.length);
  assert.equal(platforms.realTotal, 0);
  assert.equal(platforms.demoTotal, fixture.platforms.length);
  for (const item of platforms.items) {
    assert.equal(item.dataMode, "synthetic");
    assert.equal(item.isDemo, true);
    assert.equal(item.counts.current, fixture.offerings.filter((row) => row.platformId === item.platform.id).length);
    const platformHistory = fixture.trackRecords.filter((row) => row.platformId === item.platform.id);
    assert.equal(item.counts.historical, platformHistory.length);
    assert.equal(item.counts.platformReportedReturn, platformHistory.filter((row) => row.sourceReportedReturnPct != null).length);
    assert.equal(item.counts.availableSyntheticReturn, platformHistory.filter((row) => (row.sourceReportedReturnPct ?? row.finalReturn ?? row.calculatedSettlementReturnPct) != null).length);
    const detail = await getJson<{ dataMode: string; currentProducts: unknown[]; items: unknown[]; total: number; pageCount: number; counts: { platformReportedReturn: number; availableSyntheticReturn: number } }>(`/api/platforms/${encodeURIComponent(item.platform.id)}`);
    assert.equal(detail.counts.platformReportedReturn, platformHistory.filter((row) => row.sourceReportedReturnPct != null).length);
    assert.equal(detail.counts.availableSyntheticReturn, platformHistory.filter((row) => (row.sourceReportedReturnPct ?? row.finalReturn ?? row.calculatedSettlementReturnPct) != null).length);
    assert.equal(detail.dataMode, "synthetic");
    assert.equal(detail.currentProducts.length, item.counts.current);
    assert.equal(detail.total, item.counts.historical);
    assertSyntheticDto(detail);
  }
  assert.equal(platforms.items.reduce((total, item) => total + item.counts.platformReportedReturn, 0), 0);
  assert.equal(platforms.items.reduce((total, item) => total + item.counts.availableSyntheticReturn, 0), 203);
  const artist = fixture.artists[0];
  assert.ok(artist);
  const artists = await getJson<{ dataMode: string; items: Array<{ artist: { id: string; nameKo: string }; dataMode: string }> }>(`/api/artists?q=${encodeURIComponent(artist.nameKo)}`);
  assert.equal(artists.dataMode, "synthetic");
  assert.equal(artists.items.length, 1);
  assert.equal(artists.items[0]?.artist.nameKo, artist.nameKo);
  assert.equal(artists.items[0]?.dataMode, "synthetic");
  assertSyntheticDto(platforms);
  assertSyntheticDto(artists);
});

test("natural status phrases route to the intended historical cohorts", async () => {
  const cases = [
    ["매각 진행 작품", "exit_in_progress", 15],
    ["매각 완료 작품", "sold", 27],
    ["반환 작품", "returned", 11],
    ["손실 확인 작품", "loss_confirmed", 1],
  ] as const;
  for (const [sentence, lifecycle, expected] of cases) {
    const response = await getJson<ProductResponse & { filters: { scope: string; q?: string; lifecycle?: string[]; status?: string[] } }>(`/api/products?q=${encodeURIComponent(sentence)}&pageSize=100`);
    assert.equal(response.pagination.total, expected, sentence);
    assert.equal(response.filters.scope, "historical");
    assert.equal(response.filters.q, sentence);
    assert.deepEqual(response.filters.lifecycle, [lifecycle]);
    assert.ok(response.items.every((item) => item.recordScope === "historical"));
  }

  const lumera = await getJson<ProductResponse & { filters: { scope: string; q?: string; currentStatus?: string[]; keyword?: string } }>(`/api/products?q=${encodeURIComponent("루메라의 청약 예정 작품")}&pageSize=100`);
  assert.equal(lumera.pagination.total, 1);
  assert.equal(lumera.filters.scope, "current");
  assert.equal(lumera.filters.q, "루메라의 청약 예정 작품");
  assert.deepEqual(lumera.filters.currentStatus, ["upcoming"]);
  assert.equal(lumera.filters.keyword, "루메라");
  assert.match(lumera.items[0]?.artist.nameKo ?? "", /루메라/);
});

test("product detail DTOs omit raw payload fields and external URLs", async () => {
  const currentId = fixture.offerings[0]?.id;
  assert.ok(currentId);
  const current = await getJson<{ dataMode: string; product: unknown; dartVerification: { status: string; receipts: unknown[] } }>(`/api/products/${encodeURIComponent(currentId)}`);
  assert.equal(current.dataMode, "synthetic");
  assert.equal(current.dartVerification.status, "not_applicable");
  assert.deepEqual(current.dartVerification.receipts, []);
  assertSyntheticDto(current);

  const history = await getJson<ProductResponse>("/api/products?scope=historical&pageSize=1");
  const historicalId = history.items[0]?.offering.id;
  assert.ok(historicalId);
  const historical = await getJson<{ dataMode: string; product: unknown; dartVerification: { status: string } }>(`/api/products/${encodeURIComponent(historicalId)}`);
  assert.equal(historical.dataMode, "synthetic");
  assert.equal(historical.dartVerification.status, "not_applicable");
  assertSyntheticDto(historical);

  const missing = await fetch(`${baseUrl}/api/products/no-such-synthetic-id`);
  assert.equal(missing.status, 404);
});

test("rendered catalog pages are reachable without legacy external content", async () => {
  for (const path of ["/", "/products?scope=current", "/products?scope=historical", "/platforms", "/art", "/artists", "/compare"]) {
    const response = await fetch(`${baseUrl}${path}`);
    const html = await response.text();
    assert.equal(response.ok, true, path);
    assert.match(html, /id="main-content"/);
    assert.doesNotMatch(html, /sourcePayload|dueDiligencePayload|sourceSnapshot|legacySourceRef/);
  }
});


test("artist links and return provenance survive the production standalone build", async () => {
  const listing = await fetch(`${baseUrl}/artists`);
  const listingHtml = await listing.text();
  assert.equal(listing.status, 200);
  const links = [...listingHtml.matchAll(/href="(\/artists\/[^"#?]+)"/g)].map((match) => match[1]);
  const uniqueLinks = [...new Set(links)];
  assert.equal(uniqueLinks.length, 41, "the artist listing must emit all generated artist links");

  const platformCells = [] as string[];
  const calculatedCells = [] as string[];
  const stripHtml = (value: string) => value.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
  for (const path of uniqueLinks) {
    const response = await fetch(new URL(path, baseUrl));
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.match(html, /id="main-content"/, path);
    assert.match(html, /<h1[^>]*>[^<]+<\/h1>/, path);
    assert.doesNotMatch(html, /NEXT_HTTP_ERROR_FALLBACK|;404/, path);

    for (const tableMatch of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)) {
      const table = tableMatch[1];
      const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
      const headers = rows[0] ? [...rows[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((match) => stripHtml(match[1])) : [];
      const platformIndex = headers.indexOf("플랫폼 기재 수익률");
      const calculatedIndex = headers.indexOf("DAKER 계산 수익률");
      if (platformIndex < 0 && calculatedIndex < 0) continue;
      for (const row of rows.slice(1)) {
        const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1]);
        if (platformIndex >= 0) platformCells.push(stripHtml(cells[platformIndex] ?? ""));
        if (calculatedIndex >= 0) calculatedCells.push(stripHtml(cells[calculatedIndex] ?? ""));
      }
    }
  }
  assert.equal(platformCells.length, historicalCount);
  assert.ok(platformCells.every((value) => value === "미기재"), "missing platform return values must stay missing");
  assert.equal(calculatedCells.filter((value) => value !== "미기재").length, fixture.trackRecords.filter((record) => record.calculatedSettlementReturnPct != null).length);

  const artists = await getJson<{ items: Array<{ artist: { id: string }; counts: { historical: number; reportedReturn: number; calculatedSettlementReturn: number } }> }>("/api/artists");
  assert.equal(artists.items.length, 41);
  assert.equal(artists.items.reduce((sum, item) => sum + item.counts.historical, 0), historicalCount);
  assert.equal(artists.items.reduce((sum, item) => sum + item.counts.reportedReturn, 0), 0);
  assert.equal(artists.items.reduce((sum, item) => sum + item.counts.calculatedSettlementReturn, 0), fixture.trackRecords.filter((record) => record.calculatedSettlementReturnPct != null).length);
  const historicalArtist = artists.items.find((item) => item.counts.historical > 0);
  assert.ok(historicalArtist);
  const detail = await getJson<{ counts: { reportedReturn: number; calculatedSettlementReturn: number }; groups: { operating: Array<{ trackRecord: { sourceReportedReturnPct: number | null } }>; historical: Array<{ trackRecord: { sourceReportedReturnPct: number | null } }> } }>(`/api/artists/${encodeURIComponent(historicalArtist.artist.id)}`);
  assert.equal(detail.counts.reportedReturn, 0);
  assert.ok([...detail.groups.operating, ...detail.groups.historical].every((item) => item.trackRecord.sourceReportedReturnPct == null));
});


test("raw malformed artist paths return safe 400 responses before dynamic params decode", async () => {
  const malformed = [
    { path: "/artists/%E0%A4%A", api: false },
    { path: "/artists/%", api: false },
    { path: "/api/artists/%E0%A4%A", api: true },
    { path: "/artists/%E0%A4%A?source=raw", api: false },
    { path: "/api/artists/%?source=raw", api: true },
  ];
  for (const { path, api } of malformed) {
    const response = await rawGet(path);
    assert.equal(response.status, 400, path);
    assert.doesNotMatch(response.body, /Internal Server Error/, path);
    if (api) {
      assert.equal(response.headers["content-type"]?.toString().split(";", 1)[0], "application/json", path);
      assert.deepEqual(JSON.parse(response.body), { error: "bad request" }, path);
    } else {
      assert.equal(response.headers["content-type"]?.toString().split(";", 1)[0], "text/plain", path);
      assert.equal(response.body, "Bad Request", path);
    }
  }

  // Complete escapes remain ordinary unknown IDs (404). Browser-style Unicode
  // requests are checked through fetch because node:http rejects raw non-ASCII
  // request targets before they reach the server.
  const unknownArtist = "가상-작가-없는";
  for (const prefix of ["/artists", "/api/artists"]) {
    const encodedPath = `${prefix}/${encodeURIComponent(unknownArtist)}`;
    const rawResponse = await rawGet(encodedPath);
    assert.equal(rawResponse.status, 404, encodedPath);
    assert.doesNotMatch(rawResponse.body, /Internal Server Error/, encodedPath);

    const browserResponse = await fetch(`${baseUrl}${prefix}/${unknownArtist}`);
    assert.equal(browserResponse.status, 404, `${prefix}/<unicode>`);
    assert.doesNotMatch(await browserResponse.text(), /Internal Server Error/, `${prefix}/<unicode>`);
  }

  const artists = await getJson<{ items: Array<{ artist: { id: string; nameKo: string } }> }>("/api/artists");
  const knownArtist = artists.items[0]?.artist;
  assert.ok(knownArtist);
  const knownPath = `/artists/${encodeURIComponent(knownArtist.id)}?source=raw`;
  const known = await rawGet(knownPath);
  assert.equal(known.status, 200);
  assert.match(known.body, new RegExp(knownArtist.nameKo));
});


test("structured catalog queries, identity filters, and return fallback use synthetic values", async () => {
  const sentence = "청약 예정 상품";
  const structured = await getJson<ProductResponse & { filters: { keyword?: string; currentStatus?: string[] } }>(`/api/products?scope=current&currentStatus=upcoming&q=${encodeURIComponent(sentence)}&pageSize=100`);
  assert.equal(structured.pagination.total, currentCount, "the full natural-language q must not become a literal filter");
  assert.equal(structured.filters.keyword, undefined);
  assert.deepEqual(structured.filters.currentStatus, ["upcoming"]);

  const unverified = await getJson<ProductResponse>("/api/products?scope=historical&identity=unverified&pageSize=100");
  assert.equal(unverified.pagination.total, historicalCount);
  assert.ok(unverified.items.every((item) => item.recordScope === "historical"));

  const platformList = await getJson<{ items: Array<{ counts: { availableSyntheticReturn: number } }> }>("/api/platforms");
  assert.equal(platformList.items.reduce((total, item) => total + item.counts.availableSyntheticReturn, 0), 203);
  let availableReturns = 0;
  for (const platform of fixture.platforms) {
    const detail = await getJson<{ counts: { availableSyntheticReturn: number } }>(`/api/platforms/${encodeURIComponent(platform.id)}`);
    availableReturns += detail.counts.availableSyntheticReturn;
  }
  assert.equal(availableReturns, 203);
});


test("filtered catalog pages render requested natural and explicit page two on both routes", async () => {
  const natural = `q=${encodeURIComponent("매각 완료 작품")}&page=2&pageSize=24`;
  const naturalPage = await getJson<ProductResponse>(`/api/products?${natural}`);
  assert.equal(naturalPage.pagination.total, 27);
  assert.equal(naturalPage.pagination.pageCount, 2);
  assert.equal(naturalPage.pagination.page, 2);
  assert.equal(naturalPage.items.length, 3);

  for (const route of ["/art", "/products"]) {
    const response = await fetch(`${baseUrl}${route}?${natural}`);
    const html = await response.text();
    assert.equal(response.ok, true, route);
    assert.match(html, /페이지(?:\s*<!-- -->)*2(?:\s*<!-- -->)*\s*\/(?:\s*<!-- -->)*2/);
    for (const item of naturalPage.items) assert.match(html, new RegExp(item.offering.id));
  }

  const explicit = await getJson<ProductResponse>("/api/products?scope=historical&lifecycle=sold&page=2&pageSize=24");
  assert.equal(explicit.pagination.total, 27);
  assert.equal(explicit.pagination.page, 2);
  assert.equal(explicit.items.length, 3);
  const explicitPage = await fetch(`${baseUrl}/products?scope=historical&lifecycle=sold&page=2`);
  const explicitHtml = await explicitPage.text();
  assert.equal(explicitPage.ok, true);
  assert.match(explicitHtml, /페이지(?:\s*<!-- -->)*2(?:\s*<!-- -->)*\s*\/(?:\s*<!-- -->)*2/);
  for (const item of explicit.items) assert.match(explicitHtml, new RegExp(item.offering.id));
});

test("current filter pagination honors a controlled page size and clamps invalid pages", async () => {
  const current = await getJson<ProductResponse>("/api/products?scope=current&currentStatus=upcoming&page=2&pageSize=3");
  assert.equal(current.pagination.total, currentCount);
  assert.equal(current.pagination.pageCount, 3);
  assert.equal(current.pagination.page, 2);
  assert.equal(current.items.length, 3);

  const invalid = await getJson<ProductResponse>("/api/products?scope=historical&lifecycle=sold&page=0&pageSize=24");
  assert.equal(invalid.pagination.page, 1);
  const outOfRange = await getJson<ProductResponse>("/api/products?q=%EB%A7%A4%EA%B0%81%20%EC%99%84%EB%A3%8C%20%EC%9E%91%ED%92%88&page=999&pageSize=24");
  assert.equal(outOfRange.pagination.page, 2);
  assert.equal(outOfRange.items.length, 3);
});
