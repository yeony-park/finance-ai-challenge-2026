const JSON_HEADERS = { Accept: "application/json" };
const SYNTHETIC_FILE = "/data/synthetic/art-investment.json";

async function fetchJson(path, fetcher = fetch) {
  const response = await fetcher(path, { headers: JSON_HEADERS, credentials: "omit" });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  const value = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid synthetic response");
  return value;
}

export async function loadCatalog(fetcher = fetch) {
  try {
    return await fetchJson("/api/catalog", fetcher);
  } catch (apiError) {
    try {
      return await fetchJson(SYNTHETIC_FILE, fetcher);
    } catch {
      throw apiError;
    }
  }
}

export async function loadHistory(fetcher = fetch) {
  try {
    const payload = await fetchJson("/api/synthetic/history", fetcher);
    return payload.history ?? [];
  } catch {
    const catalog = await loadCatalog(fetcher);
    return catalog.history ?? catalog.trackRecords ?? catalog.events ?? [];
  }
}
