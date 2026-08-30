import assert from "node:assert/strict";
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
  trackRecords: Array<{ id: string; platformId: string; status: string; lifecycle: string }>;
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
  const platforms = await getJson<{ dataMode: string; items: Array<{ platform: { id: string; name: string }; dataMode: string; isDemo: boolean; counts: { current: number; historical: number } }>; total: number; realTotal: number; demoTotal: number }>("/api/platforms");
  assert.equal(platforms.dataMode, "synthetic");
  assert.equal(platforms.total, fixture.platforms.length);
  assert.equal(platforms.realTotal, 0);
  assert.equal(platforms.demoTotal, fixture.platforms.length);
  for (const item of platforms.items) {
    assert.equal(item.dataMode, "synthetic");
    assert.equal(item.isDemo, true);
    assert.equal(item.counts.current, fixture.offerings.filter((row) => row.platformId === item.platform.id).length);
    assert.equal(item.counts.historical, fixture.trackRecords.filter((row) => row.platformId === item.platform.id).length);
    const detail = await getJson<{ dataMode: string; currentProducts: unknown[]; items: unknown[]; total: number; pageCount: number }>(`/api/platforms/${encodeURIComponent(item.platform.id)}`);
    assert.equal(detail.dataMode, "synthetic");
    assert.equal(detail.currentProducts.length, item.counts.current);
    assert.equal(detail.total, item.counts.historical);
    assertSyntheticDto(detail);
  }
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
