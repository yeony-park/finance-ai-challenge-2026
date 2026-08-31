const JSON_HEADERS = { Accept: "application/json" };
export const SYNTHETIC_FILE = "/data/synthetic/art-investment.json";
export const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Keep requests local and bounded. The static shell must not wait forever for
 * an unavailable local API. `fetcher` is injectable for deterministic tests.
 */
export async function fetchJson(path, fetcher = fetch, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const request = Promise.resolve().then(() => fetcher(path, {
    headers: JSON_HEADERS,
    credentials: "omit",
  })).then(async (response) => {
    if (!response?.ok) throw new Error(`request failed: ${response?.status ?? "unknown"}`);
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("invalid synthetic response");
    }
    return value;
  });

  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`synthetic request timeout: ${path}`)), timeout);
  });
  try {
    return await Promise.race([request, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

function isSyntheticEnvelope(value) {
  return value?.dataMode === "synthetic" || value?.synthetic === true;
}

export function isCatalogPayload(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value)
      && isSyntheticEnvelope(value)
      && Array.isArray(value.offerings)
      && Array.isArray(value.trackRecords),
  );
}

export function isHistoryPayload(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value)
      && isSyntheticEnvelope(value)
      && Array.isArray(value.history),
  );
}

function assertCatalog(value) {
  if (!isCatalogPayload(value)) throw new Error("invalid synthetic catalog schema");
  return value;
}

function historyFromCatalog(value) {
  assertCatalog(value);
  return value.trackRecords;
}

/** Load the allowlisted synthetic catalog API, with the checked-in fixture as fallback. */
export async function loadCatalog(fetcher = fetch, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let apiError;
  try {
    return assertCatalog(await fetchJson("/api/catalog", fetcher, timeoutMs));
  } catch (error) {
    apiError = error;
  }

  try {
    return assertCatalog(await fetchJson(SYNTHETIC_FILE, fetcher, timeoutMs));
  } catch {
    throw apiError;
  }
}

/** Load history from its API, falling back to the synthetic catalog fixture. */
export async function loadHistory(fetcher = fetch, timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    const payload = await fetchJson("/api/synthetic/history", fetcher, timeoutMs);
    if (!isHistoryPayload(payload)) throw new Error("invalid synthetic history schema");
    return payload.history;
  } catch {
    const catalog = await loadCatalog(fetcher, timeoutMs);
    return historyFromCatalog(catalog);
  }
}
