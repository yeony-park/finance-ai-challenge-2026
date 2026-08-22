import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { clearDartVerificationCacheForTests, getDartDocumentArtifacts, getDartVerification } from "../lib/art/opendart-verification.ts";

const dartUrl = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000002";
const otherDartUrl = "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260513000003";
const fixedNow = () => new Date("2026-08-12T03:04:05.000Z");

function le16(value: number) { return Uint8Array.of(value & 255, (value >>> 8) & 255); }
function le32(value: number) { return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255); }
function join(...parts: Uint8Array[]) { const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0)); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length; } return out; }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }

/** A small, standards-shaped stored ZIP used to test central-directory validation, not a PK magic prefix. */
function realZip(name = "report.xml", payload = new TextEncoder().encode("<?xml version=\"1.0\"?><report/>"), declaredSize = payload.length) {
  const filename = new TextEncoder().encode(name);
  const crc = crc32(payload);
  const local = join(le32(0x04034b50), le16(20), le16(0), le16(0), le16(0), le16(0), le32(crc), le32(payload.length), le32(declaredSize), le16(filename.length), le16(0), filename, payload);
  const central = join(le32(0x02014b50), le16(20), le16(20), le16(0), le16(0), le16(0), le16(0), le32(crc), le32(payload.length), le32(declaredSize), le16(filename.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(0), filename);
  return join(local, central, le32(0x06054b50), le16(0), le16(0), le16(1), le16(1), le32(central.length), le32(local.length), le16(0));
}

/** A valid streaming ZIP member, followed by a checked data descriptor. */
function descriptorZip(name = "report.xml", payload = new TextEncoder().encode("<?xml version=\"1.0\"?><report/>")) {
  const filename = new TextEncoder().encode(name);
  const crc = crc32(payload);
  const flags = 0x0008;
  const local = join(le32(0x04034b50), le16(20), le16(flags), le16(0), le16(0), le16(0), le32(0), le32(0), le32(0), le16(filename.length), le16(0), filename, payload, le32(0x08074b50), le32(crc), le32(payload.length), le32(payload.length));
  const central = join(le32(0x02014b50), le16(20), le16(20), le16(flags), le16(0), le16(0), le16(0), le32(crc), le32(payload.length), le32(payload.length), le16(filename.length), le16(0), le16(0), le16(0), le16(0), le32(0), le32(0), filename);
  return join(local, central, le32(0x06054b50), le16(0), le16(0), le16(1), le16(1), le32(central.length), le32(local.length), le16(0));
}

function zipResponse(body = realZip(), headers: Record<string, string> = { "content-type": "application/zip", "content-length": String(body.length) }) {
  return new Response(body, { headers });
}

const input = { isDemo: false, sourceUrls: [dartUrl] };

test("OpenDART reads and validates a complete real ZIP with no Content-Length, then caches only its receipt", async () => {
  clearDartVerificationCacheForTests();
  let calls = 0;
  const fetcher: typeof fetch = async (request, init) => {
    calls += 1;
    const url = new URL(String(request));
    assert.equal(url.origin, "https://opendart.fss.or.kr");
    assert.equal(url.pathname, "/api/document.xml");
    assert.equal(url.searchParams.get("rcept_no"), "20260513000002");
    assert.equal(init?.redirect, "error");
    return zipResponse(realZip(), { "content-type": "application/x-msdownload;charset=UTF-8" });
  };
  const first = await getDartVerification(input, { apiKey: "test-key", fetcher, now: fixedNow });
  const second = await getDartVerification(input, { apiKey: "test-key", fetcher, now: fixedNow });
  assert.equal(calls, 1);
  assert.equal(first.status, "verified");
  assert.deepEqual(first.receipts, [{ receiptNo: "20260513000002", sourceUrl: dartUrl, status: "available", fetchedAt: "2026-08-12T03:04:05.000Z" }]);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(first).includes("test-key"), false);
});

test("OpenDART does not parse status-like elements inside an accepted ZIP as API errors", async () => {
  const body = realZip("report.xml", new TextEncoder().encode('<?xml version="1.0"?><report><status>013</status></report>'));
  const fetcher: typeof fetch = async () => zipResponse(body);
  clearDartVerificationCacheForTests();
  const artifacts = await getDartDocumentArtifacts(input, { apiKey: "test-key", fetcher });
  assert.equal(artifacts.length, 1);
  assert.match(artifacts[0]?.chunks[0]?.text ?? "", /<status>013<\/status>/);
  clearDartVerificationCacheForTests();
  const verification = await getDartVerification(input, { apiKey: "test-key", fetcher, now: fixedNow });
  assert.equal(verification.status, "verified");
  assert.equal(verification.receipts[0]?.status, "available");
});

test("OpenDART rejects truncated, XML-less, unsafe, and expanded-oversize archives", async () => {
  const cases = [
    realZip().slice(0, -3),
    realZip("readme.txt"),
    realZip("../report.xml"),
    realZip("report.xml", new Uint8Array([60]), 11 * 1024 * 1024),
  ];
  for (const body of cases) {
    clearDartVerificationCacheForTests();
    const result = await getDartVerification(input, { apiKey: "test-key", fetcher: async () => zipResponse(body), now: fixedNow });
    assert.equal(result.status, "unavailable");
    assert.equal(result.receipts[0]?.status, "invalid_response");
  }
});

test("OpenDART gives documented 013/014 a not_found result and keeps auth and transient errors distinct and uncached", async () => {
  clearDartVerificationCacheForTests();
  const notFound = async () => new Response("<result><status>013</status></result>", { headers: { "content-type": "application/xml" } });
  const missing = await getDartVerification(input, { apiKey: "test-key", fetcher: notFound, now: fixedNow });
  assert.equal(missing.status, "unavailable");
  assert.equal(missing.receipts[0]?.status, "not_found");

  let authCalls = 0;
  const auth: typeof fetch = async () => { authCalls += 1; return new Response("no", { status: 401 }); };
  const authOne = await getDartVerification(input, { apiKey: "auth-key", fetcher: auth, now: fixedNow });
  const authTwo = await getDartVerification(input, { apiKey: "auth-key", fetcher: auth, now: fixedNow });
  assert.equal(authOne.receipts[0]?.status, "auth_error");
  assert.equal(authTwo.receipts[0]?.status, "auth_error");
  assert.equal(authCalls, 2);

  let transientCalls = 0;
  const transient: typeof fetch = async () => { transientCalls += 1; return new Response("down", { status: 503 }); };
  const first = await getDartVerification(input, { apiKey: "transient-key", fetcher: transient, now: fixedNow });
  const second = await getDartVerification(input, { apiKey: "transient-key", fetcher: transient, now: fixedNow });
  assert.equal(first.receipts[0]?.status, "transient_error");
  assert.equal(second.receipts[0]?.status, "transient_error");
  assert.equal(transientCalls, 2);
  assert.equal(JSON.stringify({ missing, authOne, first }).includes("auth-key"), false);
});

test("OpenDART aggregates mixed receipts as partial, preserves first-seen order, and isolates API-key and fetcher caches", async () => {
  clearDartVerificationCacheForTests();
  let keyACalls = 0;
  const fetcherA: typeof fetch = async (request) => {
    keyACalls += 1;
    return new URL(String(request)).searchParams.get("rcept_no") === "20260513000003"
      ? new Response("<result><status>014</status></result>", { headers: { "content-type": "application/xml" } })
      : zipResponse();
  };
  const mixed = await getDartVerification({ isDemo: false, sourceUrls: [otherDartUrl, dartUrl, otherDartUrl] }, { apiKey: "key-A", fetcher: fetcherA, now: fixedNow });
  assert.equal(mixed.status, "partial");
  assert.deepEqual(mixed.receipts.map((receipt) => [receipt.receiptNo, receipt.status]), [["20260513000003", "not_found"], ["20260513000002", "available"]]);
  await getDartVerification(input, { apiKey: "key-A", fetcher: fetcherA, now: fixedNow });
  assert.equal(keyACalls, 2, "available receipt is reused despite a separately cached not_found receipt");

  let keyBCalls = 0;
  const fetcherB: typeof fetch = async () => { keyBCalls += 1; return zipResponse(); };
  await getDartVerification(input, { apiKey: "key-B", fetcher: fetcherB, now: fixedNow });
  await getDartVerification(input, { apiKey: "key-B", fetcher: fetcherB, now: fixedNow });
  assert.equal(keyBCalls, 1, "same generation and fetcher may reuse cache");
  let sameKeyDifferentFetcherCalls = 0;
  const fetcherC: typeof fetch = async () => { sameKeyDifferentFetcherCalls += 1; return zipResponse(); };
  await getDartVerification(input, { apiKey: "key-B", fetcher: fetcherC, now: fixedNow });
  assert.equal(sameKeyDifferentFetcherCalls, 1, "injected fetchers do not share cache entries");
});

test("different non-available receipt outcomes remain unavailable rather than partial", async () => {
  clearDartVerificationCacheForTests();
  const fetcher: typeof fetch = async (request) => new URL(String(request)).searchParams.get("rcept_no") === "20260513000003"
    ? new Response("<result><status>013</status></result>", { headers: { "content-type": "application/xml" } })
    : new Response("down", { status: 503 });
  const result = await getDartVerification({ isDemo: false, sourceUrls: [otherDartUrl, dartUrl] }, { apiKey: "test-key", fetcher, now: fixedNow });
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.receipts.map((receipt) => receipt.status), ["not_found", "transient_error"]);
});

test("real products without a valid receipt are missing_receipt, while demos remain not_applicable", async () => {
  clearDartVerificationCacheForTests();
  const fetcher: typeof fetch = async () => { throw new Error("must not fetch"); };
  const real = await getDartVerification({ isDemo: false, sourceUrls: ["https://example.test/no-receipt"] }, { apiKey: "test-key", fetcher, now: fixedNow });
  const demo = await getDartVerification({ isDemo: true, sourceUrls: [dartUrl] }, { apiKey: "test-key", fetcher, now: fixedNow });
  assert.equal(real.status, "missing_receipt");
  assert.equal(real.receipts.length, 0);
  assert.equal(demo.status, "not_applicable");
  assert.equal(demo.receipts.length, 0);
});

test("a missing API key is an auth_error outcome without requests or secret output", async () => {
  clearDartVerificationCacheForTests();
  let calls = 0;
  const result = await getDartVerification(input, { apiKey: "", fetcher: async () => { calls += 1; return zipResponse(); }, now: fixedNow });
  assert.equal(result.status, "unavailable");
  assert.equal(result.fetchedAt, null);
  assert.equal(result.receipts[0]?.status, "auth_error");
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(result).includes("DART_API_KEY"), false);
});

test("OpenDART document artifacts expose immutable, bounded, decoded XML members without a credential", async () => {
  const text = `<?xml version="1.0" encoding="UTF-8"?><report>${"a".repeat(16_378)}😀\r\n끝</report>`;
  const payload = new TextEncoder().encode(text);
  const body = realZip("nested/report.xml", payload);
  let calls = 0;
  const artifacts = await getDartDocumentArtifacts(input, {
    apiKey: "artifact-test-key",
    fetcher: async (request) => {
      calls += 1;
      assert.equal(new URL(String(request)).searchParams.get("crtfc_key"), "artifact-test-key");
      return zipResponse(body);
    },
    now: fixedNow,
  });
  assert.equal(calls, 1);
  assert.equal(artifacts.length, 1);
  const artifact = artifacts[0]!;
  assert.equal(artifact.receiptNo, "20260513000002");
  assert.equal(artifact.sourceUrl, dartUrl);
  assert.equal(artifact.fetchedAt, "2026-08-12T03:04:05.000Z");
  assert.equal(artifact.memberPath, "nested/report.xml");
  assert.equal(artifact.encoding, "utf-8");
  assert.equal(artifact.text, text);
  assert.equal(artifact.documentSha256, createHash("sha256").update(body).digest("hex"));
  assert.equal(artifact.memberSha256, createHash("sha256").update(payload).digest("hex"));
  assert.equal(Object.isFrozen(artifacts), true);
  assert.equal(Object.isFrozen(artifact), true);
  assert.equal(Object.isFrozen(artifact.chunks), true);
  assert.equal(artifact.chunks.map((chunk) => chunk.text).join(""), text);
  for (const [index, chunk] of artifact.chunks.entries()) {
    assert.equal(Object.isFrozen(chunk), true);
    assert.equal(chunk.index, index);
    assert.equal(chunk.text, text.slice(chunk.start, chunk.end));
    assert.ok(chunk.end - chunk.start <= 16_384);
    assert.equal(/[\ud800-\udbff]$/.test(chunk.text), false, "a chunk must not end with a high surrogate");
  }
  assert.equal(JSON.stringify(artifacts).includes("artifact-test-key"), false);
});

test("OpenDART document artifacts reject bad CRCs, malformed or over-complex XML, and invalid XML bytes", async () => {
  const crcCorrupt = realZip();
  crcCorrupt[30 + "report.xml".length] ^= 1;
  const invalidUtf8 = realZip("report.xml", Uint8Array.from([...new TextEncoder().encode("<?xml version=\"1.0\"?><report>"), 0xff, ...new TextEncoder().encode("</report>")]));
  const tooDeep = `<?xml version="1.0"?>${"<n>".repeat(129)}${"</n>".repeat(129)}`;
  const tooManyAttributes = `<?xml version="1.0"?><report ${Array.from({ length: 129 }, (_, index) => `a${index}="x"`).join(" ")}/>`;
  const tooManyNodes = `<?xml version="1.0"?><report>${"<n/>".repeat(50_001)}</report>`;
  const cases = [
    crcCorrupt,
    realZip("report.xml", new TextEncoder().encode("<?xml version=\"1.0\"?><report>")),
    invalidUtf8,
    realZip("report.xml", new TextEncoder().encode(tooDeep)),
    realZip("report.xml", new TextEncoder().encode(tooManyAttributes)),
    realZip("report.xml", new TextEncoder().encode(tooManyNodes)),
  ];
  for (const body of cases) {
    const artifacts = await getDartDocumentArtifacts(input, { apiKey: "test-key", fetcher: async () => zipResponse(body), now: fixedNow });
    assert.deepEqual(artifacts, []);
    clearDartVerificationCacheForTests();
    const verification = await getDartVerification(input, { apiKey: "test-key", fetcher: async () => zipResponse(body), now: fixedNow });
    assert.equal(verification.receipts[0]?.status, "invalid_response");
  }
});

test("OpenDART document artifact retrieval does not request or expose a missing API key", async () => {
  let calls = 0;
  const artifacts = await getDartDocumentArtifacts(input, {
    apiKey: "",
    fetcher: async () => { calls += 1; return zipResponse(); },
    now: fixedNow,
  });
  assert.deepEqual(artifacts, []);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(artifacts).includes("DART_API_KEY"), false);
});

test("OpenDART document artifacts validate streaming ZIP data descriptors", async () => {
  const body = descriptorZip();
  const artifacts = await getDartDocumentArtifacts(input, { apiKey: "test-key", fetcher: async () => zipResponse(body), now: fixedNow });
  assert.equal(artifacts.length, 1);
  const corrupt = body.slice();
  const descriptorCrcOffset = 30 + "report.xml".length + new TextEncoder().encode("<?xml version=\"1.0\"?><report/>").length + 4;
  corrupt[descriptorCrcOffset] ^= 1;
  const rejected = await getDartDocumentArtifacts(input, { apiKey: "test-key", fetcher: async () => zipResponse(corrupt), now: fixedNow });
  assert.deepEqual(rejected, []);
});
