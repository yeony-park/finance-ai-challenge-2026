import { loadCatalog, loadHistory } from "./api.js";

export const PAGE_SIZE = 6;
export const HISTORY_PAGE_SIZE = 12;
export const STATUS_LABELS = Object.freeze({
  all: "전체 상태",
  upcoming: "모집 예정",
  operating: "운용 중",
  exit_in_progress: "회수 진행 중",
  sold: "매각 완료",
  liquidated: "정산 완료",
  delayed: "지연 후 정산",
  returned: "반환",
  loss_confirmed: "손실 확인",
});
export const SCOPE_LABELS = Object.freeze({
  all: "전체 자료",
  current: "현재 모집",
  historical: "과거 이력",
});

const VALID_SCOPES = new Set(Object.keys(SCOPE_LABELS));
const DEFAULT_PAGE = 1;
const EMPTY_STATE = Object.freeze({
  q: "",
  platform: "all",
  status: "all",
  scope: "all",
  catalogPage: DEFAULT_PAGE,
  historyPage: DEFAULT_PAGE,
});
const RETURN_KEYS = ["sourceReportedReturnPct", "finalReturn", "calculatedSettlementReturnPct"];
const one = (selector, root = typeof document === "undefined" ? null : document) => root?.querySelector(selector) ?? null;
const many = (selector, root = typeof document === "undefined" ? null : document) => root ? [...root.querySelectorAll(selector)] : [];

function arrays(value) {
  return Array.isArray(value) ? value : [];
}

function nonEmpty(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function lower(value) {
  return nonEmpty(value) ? String(value).trim().toLocaleLowerCase("ko-KR") : "";
}

function node(tag, text = "", className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== null && text !== undefined) element.textContent = String(text);
  return element;
}

function display(value, fallback = "확인 불가") {
  if (!nonEmpty(value)) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString("ko-KR");
  return String(value);
}

function dateText(value) {
  return nonEmpty(value) ? String(value) : "확인 불가";
}

function amountText(value) {
  return Number.isFinite(value) ? `${value.toLocaleString("ko-KR")}원` : "확인 불가";
}

function platformRows(catalog) {
  return arrays(catalog?.platforms);
}

function platformFor(item, catalog) {
  const id = item?.platformId;
  return platformRows(catalog).find((platform) => platform?.id === id) ?? null;
}

export function platformName(item, catalog) {
  const platform = platformFor(item, catalog);
  return String(platform?.name ?? item?.platformId ?? "합성 플랫폼 확인 불가");
}

function linkedSearchText(item, catalog) {
  const artwork = arrays(catalog?.artworks).find((entry) => entry?.id === item?.artworkId);
  const artist = arrays(catalog?.artists).find((entry) => entry?.id === item?.artistId);
  return [
    item?.id, item?.slug, item?.title, item?.productName, item?.artworkTitle,
    item?.artistName, item?.artistNameEn, item?.status, item?.lifecycle,
    statusText(item?.status ?? item?.lifecycle),
    item?.platformId, platformName(item, catalog), platformFor(item, catalog)?.operatorName,
    artwork?.title, artwork?.medium, artist?.nameKo, artist?.nameEn,
  ].filter(nonEmpty).join(" ");
}

function normalizePage(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : DEFAULT_PAGE;
  }
  const raw = nonEmpty(value) ? String(value).trim() : "";
  if (!/^\d+$/.test(raw)) return DEFAULT_PAGE;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : DEFAULT_PAGE;
}

export function normalizeUrlState(input = "") {
  const params = input instanceof URLSearchParams
    ? input
    : new URLSearchParams(typeof input === "string" ? input.replace(/^\?/, "") : input?.search ?? "");
  const scope = lower(params.get("scope"));
  return {
    q: params.get("q")?.trim() ?? "",
    platform: params.get("platform")?.trim() || "all",
    status: lower(params.get("status")) || "all",
    scope: VALID_SCOPES.has(scope) ? scope : "all",
    catalogPage: normalizePage(params.get("catalogPage")),
    historyPage: normalizePage(params.get("historyPage")),
  };
}

export const readUrlState = normalizeUrlState;

export function serializeUrlState(state = EMPTY_STATE) {
  const params = new URLSearchParams();
  if (nonEmpty(state.q)) params.set("q", String(state.q).trim());
  if (nonEmpty(state.platform) && state.platform !== "all") params.set("platform", String(state.platform));
  if (nonEmpty(state.status) && state.status !== "all") params.set("status", String(state.status));
  if (nonEmpty(state.scope) && state.scope !== "all") params.set("scope", String(state.scope));
  const catalogPage = normalizePage(state.catalogPage);
  const historyPage = normalizePage(state.historyPage);
  if (catalogPage > DEFAULT_PAGE) params.set("catalogPage", String(catalogPage));
  if (historyPage > DEFAULT_PAGE) params.set("historyPage", String(historyPage));
  return params.toString();
}

function statusMatches(item, status) {
  if (!status || status === "all") return true;
  const itemStatus = nonEmpty(item?.status) ? item.status : item?.lifecycle;
  return lower(itemStatus) === status;
}

function platformMatches(item, catalog, selected) {
  if (!selected || selected === "all") return true;
  const wanted = lower(selected);
  const platform = platformFor(item, catalog);
  return [item?.platformId, platform?.id, platform?.name, platform?.operatorName]
    .filter(nonEmpty).some((value) => lower(value) === wanted);
}

function queryMatches(item, catalog, query) {
  const terms = lower(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = lower(linkedSearchText(item, catalog));
  return terms.every((term) => text.includes(term));
}

function itemMatches(item, catalog, state = EMPTY_STATE) {
  const filters = state ?? EMPTY_STATE;
  return queryMatches(item, catalog, filters.q)
    && platformMatches(item, catalog, filters.platform)
    && statusMatches(item, filters.status);
}

export function filterOfferings(catalog, state = EMPTY_STATE) {
  const filters = state ?? EMPTY_STATE;
  if (filters.scope === "historical") return [];
  return arrays(catalog?.offerings).filter((item) => itemMatches(item, catalog, filters));
}

export function filterHistory(history, catalog, state = EMPTY_STATE) {
  const filters = state ?? EMPTY_STATE;
  if (filters.scope === "current") return [];
  return arrays(history).filter((item) => itemMatches(item, catalog, filters));
}

export function filterCatalog(catalog, history, state = EMPTY_STATE) {
  return {
    offerings: filterOfferings(catalog, state),
    history: filterHistory(history, catalog, state),
  };
}

export function paginate(items, page = 1, pageSize = PAGE_SIZE) {
  const records = arrays(items);
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(records.length / size));
  const currentPage = Math.min(Math.max(Number.isInteger(page) ? page : 1, 1), totalPages);
  const start = (currentPage - 1) * size;
  const pageItems = records.slice(start, start + size);
  return {
    items: pageItems,
    records: pageItems,
    total: records.length,
    totalRecords: records.length,
    totalPages,
    currentPage,
    page: currentPage,
    pageSize: size,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
  };
}

export const paginateItems = paginate;
export const paginateRecords = paginate;

export function historyDates(record = {}) {
  record = record ?? {};
  return {
    subscriptionStart: record.subscriptionStart ?? null,
    subscriptionEnd: record.subscriptionEnd ?? null,
    soldAt: record.soldAt ?? null,
    liquidatedAt: record.liquidatedAt ?? null,
  };
}

export function historyDateEntries(record = {}) {
  const dates = historyDates(record);
  return [
    ["모집 시작", dates.subscriptionStart],
    ["모집 종료", dates.subscriptionEnd],
    ["매각", dates.soldAt],
    ["청산", dates.liquidatedAt],
  ];
}

export function visibleReturn(record = {}) {
  for (const key of RETURN_KEYS) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

export function visibleReturnSource(record = {}) {
  for (const key of RETURN_KEYS) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return key;
  }
  return null;
}

export function returnText(record = {}) {
  const value = visibleReturn(record);
  return value === null ? "수익률 확인 불가" : `수익률 ${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

export function historyDetailFields(record = {}) {
  record = record ?? {};
  const dates = historyDates(record);
  return [
    ["작가", record.artistName],
    ["작품", record.artworkTitle],
    ["재료", record.artworkMedium],
    ["공모 금액", amountText(record.offeringAmount)],
    ["총 분배 금액", amountText(record.totalDistribution)],
    ["회수 금액", amountText(record.exitAmount)],
    ["모집 시작", dates.subscriptionStart],
    ["모집 종료", dates.subscriptionEnd],
    ["매각일", dates.soldAt],
    ["청산일", dates.liquidatedAt],
    ["상태", statusText(record.status ?? record.lifecycle)],
    ["보유기간", nonEmpty(record.actualHoldingMonths)
      ? `${display(record.actualHoldingMonths)}개월 (실제)`
      : nonEmpty(record.targetHoldingMonths)
        ? `${display(record.targetHoldingMonths)}개월 (목표)` : null],
    ["수익률", returnText(record)],
  ];
}

export function statusText(value) {
  const key = lower(value);
  return STATUS_LABELS[key] ?? (nonEmpty(value) ? String(value) : "상태 확인 불가");
}

export function safeSyntheticImage(value) {
  const path = String(value ?? "");
  return path.startsWith("/synthetic-art/") && !path.includes("//") && !path.includes("..")
    ? path : "";
}

function statusClass(value) {
  return ["delayed", "loss_confirmed", "returned"].includes(lower(value)) ? "status status-warning" : "status";
}

function facts(rows) {
  const list = node("dl", "", "facts");
  for (const [label, value] of rows) {
    const row = node("div");
    row.append(node("dt", label), node("dd", display(value)));
    list.append(row);
  }
  return list;
}

function stateForPage() {
  const search = typeof window !== "undefined" && window.location
    ? window.location.search
    : typeof location !== "undefined" ? location.search : "";
  return normalizeUrlState(search);
}

const initialUrl = stateForPage();
const state = {
  page: typeof document === "undefined" ? "" : document.body?.dataset.page ?? "",
  catalog: null,
  history: [],
  url: initialUrl,
  catalogPage: initialUrl.catalogPage,
  historyPage: initialUrl.historyPage,
  selectedHistory: null,
  detailTrigger: null,
  interactionsInstalled: false,
};

function currentUrlState() {
  return {
    ...state.url,
    catalogPage: state.catalogPage,
    historyPage: state.historyPage,
  };
}

function setUrlState({ replace = true } = {}) {
  if (typeof window === "undefined" || !window.history) return;
  const query = serializeUrlState(currentUrlState());
  const pathname = window.location?.pathname ?? "";
  const hash = window.location?.hash ?? "";
  const target = `${pathname}${query ? `?${query}` : ""}${hash}`;
  const method = replace ? "replaceState" : "pushState";
  if (typeof window.history[method] === "function") {
    window.history[method](null, "", target);
  } else if (typeof window.history.replaceState === "function") {
    window.history.replaceState(null, "", target);
  }
}

function updateLoadState(message, failed = false) {
  const status = one("#load-state");
  if (status) status.textContent = message;
  const error = one("#load-error");
  if (error) error.hidden = !failed;
}

function configureFilters() {
  const platformSelect = one("#platform-filter");
  const statusSelect = one("#status-filter");
  const scopeSelect = one("#scope-filter");
  if (platformSelect) {
    platformSelect.replaceChildren();
    platformSelect.append(node("option", "전체 플랫폼"));
    platformSelect.options[0].value = "all";
    for (const platform of platformRows(state.catalog)) {
      if (!platform?.id) continue;
      const option = node("option", platform.name ?? platform.id);
      option.value = platform.id;
      platformSelect.append(option);
    }
    const selectedPlatform = platformRows(state.catalog).find((item) => [item?.id, item?.name, item?.operatorName]
      .filter(nonEmpty).some((value) => lower(value) === lower(state.url.platform)));
    state.url.platform = selectedPlatform?.id ?? "all";
    platformSelect.value = state.url.platform;
  }
  if (statusSelect) {
    statusSelect.replaceChildren();
    for (const [value, label] of Object.entries(STATUS_LABELS)) {
      const option = node("option", label);
      option.value = value;
      statusSelect.append(option);
    }
    statusSelect.value = STATUS_LABELS[state.url.status] ? state.url.status : "all";
    state.url.status = statusSelect.value;
  }
  if (scopeSelect) {
    scopeSelect.replaceChildren();
    for (const [value, label] of Object.entries(SCOPE_LABELS)) {
      const option = node("option", label);
      option.value = value;
      scopeSelect.append(option);
    }
    scopeSelect.value = state.url.scope;
  }
  const input = one("#search-input");
  if (input) input.value = state.url.q;
}

function offeringCard(item) {
  const artwork = arrays(state.catalog?.artworks).find((entry) => entry?.id === item.artworkId);
  const artist = arrays(state.catalog?.artists).find((entry) => entry?.id === item.artistId);
  const card = node("article", "", "card");
  card.dataset.itemId = item.id ?? "";
  const header = node("div", "", "card-top");
  header.append(node("h3", item.title ?? item.id ?? "합성 상품"));
  header.append(node("span", statusText(item.status ?? item.lifecycle), statusClass(item.status ?? item.lifecycle)));
  const imagePath = safeSyntheticImage(artwork?.imageUrl);
  if (imagePath) {
    const image = node("img", "", "card-image");
    image.src = imagePath;
    image.alt = `합성 작품 이미지 · ${artwork?.title ?? item.title ?? "합성 작품"}`;
    image.loading = "lazy";
    card.append(image);
  }
  card.append(
    header,
    node("p", `${artist?.nameKo ?? "합성 작가 확인 불가"} · ${platformName(item, state.catalog)}`, "card-meta"),
    facts([
      ["모집 기간", `${dateText(item.subscriptionStart)} ~ ${dateText(item.subscriptionEnd)}`],
      ["구좌당 금액", amountText(item.unitPrice)],
      ["최소 투자금액", amountText(item.minimumInvestment)],
      ["목표 보유기간", nonEmpty(item.targetHoldingMonths) ? `${display(item.targetHoldingMonths)}개월` : null],
    ]),
    node("p", "합성 데이터 전용 · 실제 상품이나 투자 권유가 아닙니다.", "muted"),
  );
  return card;
}

function historyCard(record) {
  const card = node("article", "", "history-card");
  const trigger = node("button", "", "history-card-trigger");
  trigger.type = "button";
  trigger.dataset.historyId = record.id ?? "";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-controls", "history-detail");
  trigger.setAttribute("aria-current", String(state.selectedHistory === record.id));
  const imagePath = safeSyntheticImage(record.artworkImageUrl);
  if (imagePath) {
    const image = node("img", "", "history-image");
    image.src = imagePath;
    image.alt = `합성 작품 이미지 · ${record.artworkTitle ?? "합성 작품"}`;
    image.loading = "lazy";
    trigger.append(image);
  }
  const title = node("strong", record.artworkTitle ?? record.productName ?? record.id ?? "합성 이력");
  const meta = node("span", `${record.artistName ?? "합성 작가 확인 불가"} · ${platformName(record, state.catalog)}`, "history-meta");
  const dates = historyDates(record);
  const dateLine = node("span", `${dateText(dates.subscriptionStart)} ~ ${dateText(dates.subscriptionEnd)}`, "history-meta");
  const status = node("span", statusText(record.status ?? record.lifecycle), statusClass(record.status ?? record.lifecycle));
  const summary = node("span", `${returnText(record)} · ${nonEmpty(record.actualHoldingMonths) ? `${display(record.actualHoldingMonths)}개월 보유` : "보유기간 확인 불가"}`, "history-meta");
  trigger.append(title, meta, dateLine, status, summary);
  trigger.addEventListener("click", () => openHistoryDetail(record, trigger));
  card.append(trigger);
  return card;
}

function renderCatalog() {
  const section = one("#catalog-section");
  const root = one("#result-list");
  if (!root) return;
  const filtered = filterOfferings(state.catalog, state.url);
  const page = paginate(filtered, state.catalogPage, PAGE_SIZE);
  state.catalogPage = page.currentPage;
  if (section) section.hidden = state.url.scope === "historical";
  root.replaceChildren(...page.items.map(offeringCard));
  const empty = one("#result-empty");
  if (empty) {
    empty.hidden = state.url.scope === "historical" || page.total > 0;
    empty.textContent = state.url.q || state.url.platform !== "all" || state.url.status !== "all"
      ? "현재 모집 자료가 없습니다." : "현재 모집 자료가 없습니다.";
  }
  const summary = one("#result-summary");
  if (summary) summary.textContent = `${page.total}개 항목 · 합성 현재 자료`;
  renderPager("catalog", page);
}

function renderHistory() {
  const section = one("#history-section");
  const root = one("#history-list");
  if (!root) return;
  const filtered = filterHistory(state.history, state.catalog, state.url);
  const page = paginate(filtered, state.historyPage, HISTORY_PAGE_SIZE);
  state.historyPage = page.currentPage;
  if (section) section.hidden = state.url.scope === "current";
  root.replaceChildren(...page.items.map(historyCard));
  const empty = one("#history-empty");
  if (empty) {
    empty.hidden = state.url.scope === "current" || page.total > 0;
    empty.textContent = "검색 조건에 맞는 합성 과거 이력이 없습니다.";
  }
  const summary = one("#history-summary");
  if (summary) summary.textContent = `${page.total}건 · 합성 과거 이력`;
  renderPager("history", page);
}

function renderPager(kind, page) {
  const prefix = kind === "catalog" ? "catalog" : "history";
  const pager = one(`#${prefix}-pagination`);
  if (!pager) return;
  pager.hidden = page.total <= page.pageSize;
  const previous = one(`#${prefix}-prev`);
  const next = one(`#${prefix}-next`);
  const stateNode = one(`#${prefix}-page-state`);
  if (previous) previous.disabled = !page.hasPrevious;
  if (next) next.disabled = !page.hasNext;
  if (stateNode) stateNode.textContent = `${page.currentPage} / ${page.totalPages}페이지`;
}

function renderSuitability() {
  const summary = one("#synthetic-summary");
  if (!summary) return;
  summary.replaceChildren(
    node("p", `현재 모집 ${arrays(state.catalog?.offerings).length}개 · 작품 ${arrays(state.catalog?.artworks).length}개 · 작가 ${arrays(state.catalog?.artists).length}명`, "summary-number"),
    node("p", `과거 합성 이력 ${arrays(state.history).length}건`, "summary-number"),
    node("p", "이 화면은 합성 저장본만 읽습니다. 외부 근거, 계정 정보, 주문 기능은 제공하지 않습니다.", "muted"),
  );
}

function setDetailContent(record) {
  const content = one("#history-detail-content");
  if (!content) return;
  record = record ?? {};
  const imagePath = safeSyntheticImage(record.artworkImageUrl);
  content.replaceChildren();
  const heading = node("div", "", "detail-heading");
  const title = node("h2", record.artworkTitle ?? record.productName ?? "합성 과거 이력");
  title.id = "history-detail-title";
  heading.append(node("p", "SYNTHETIC HISTORY", "eyebrow"), title);
  content.append(heading);
  if (imagePath) {
    const image = node("img", "", "detail-image");
    image.src = imagePath;
    image.alt = `합성 작품 이미지 · ${record.artworkTitle ?? "합성 작품"}`;
    content.append(image);
  }
  content.append(
    facts(historyDetailFields(record)),
    node("p", "합성 데이터 전용 · 외부 근거와 실제 거래를 나타내지 않습니다.", "notice"),
  );
}

function restoreDetailFocus() {
  const trigger = state.detailTrigger;
  state.detailTrigger = null;
  if (trigger && typeof trigger.focus === "function" && trigger.isConnected !== false) trigger.focus();
}

function closeHistoryDetail(restore = true) {
  const dialog = one("#history-detail");
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  dialog.hidden = true;
  dialog.removeAttribute("open");
  if (restore) restoreDetailFocus();
}

export function openHistoryDetail(record, trigger = null) {
  state.selectedHistory = record?.id ?? null;
  state.detailTrigger = trigger;
  many(".history-card-trigger").forEach((button) => {
    button.setAttribute("aria-current", String(button.dataset.historyId === state.selectedHistory));
  });
  setDetailContent(record);
  const dialog = one("#history-detail");
  if (!dialog) return;
  dialog.hidden = false;
  if (typeof dialog.showModal === "function") {
    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      dialog.setAttribute("open", "");
    }
  } else {
    dialog.setAttribute("open", "");
  }
  const content = one("#history-detail-content");
  if (content && typeof content.focus === "function") content.focus({ preventScroll: true });
  else dialog.focus?.();
}

function applyUrlState(next = stateForPage()) {
  state.url = next;
  state.catalogPage = next.catalogPage;
  state.historyPage = next.historyPage;
}

function restoreFromUrl() {
  applyUrlState();
  if (!state.catalog) return;
  configureFilters();
  renderCatalog();
  renderHistory();
  setUrlState();
}

function changePage(key, delta, render) {
  const previous = state[key];
  state[key] = Math.max(DEFAULT_PAGE, normalizePage(previous) + delta);
  render();
  // paginate() clamps an out-of-range URL or click to the final page. Only
  // create a history entry when the displayed page actually changed.
  if (state[key] !== previous) setUrlState({ replace: false });
}

function installInteractions() {
  if (state.interactionsInstalled) return;
  state.interactionsInstalled = true;
  const form = one("#search-form");
  if (form) form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = one("#search-input");
    state.url.q = input?.value.trim() ?? "";
    state.catalogPage = DEFAULT_PAGE;
    state.historyPage = DEFAULT_PAGE;
    setUrlState();
    renderCatalog();
    renderHistory();
  });
  const input = one("#search-input");
  if (input) input.addEventListener("input", () => {
    state.url.q = input.value.trim();
    state.catalogPage = DEFAULT_PAGE;
    state.historyPage = DEFAULT_PAGE;
    setUrlState();
    renderCatalog();
    renderHistory();
  });
  for (const [id, key] of [["platform-filter", "platform"], ["status-filter", "status"], ["scope-filter", "scope"]]) {
    const control = one(`#${id}`);
    if (!control) continue;
    control.addEventListener("change", () => {
      state.url[key] = control.value;
      state.catalogPage = DEFAULT_PAGE;
      state.historyPage = DEFAULT_PAGE;
      setUrlState();
      renderCatalog();
      renderHistory();
    });
  }
  const catalogPrevious = one("#catalog-prev");
  const catalogNext = one("#catalog-next");
  const historyPrevious = one("#history-prev");
  const historyNext = one("#history-next");
  catalogPrevious?.addEventListener("click", () => changePage("catalogPage", -1, renderCatalog));
  catalogNext?.addEventListener("click", () => changePage("catalogPage", 1, renderCatalog));
  historyPrevious?.addEventListener("click", () => changePage("historyPage", -1, renderHistory));
  historyNext?.addEventListener("click", () => changePage("historyPage", 1, renderHistory));
  const close = one("#history-detail-close");
  close?.addEventListener("click", () => closeHistoryDetail());
  const dialog = one("#history-detail");
  dialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeHistoryDetail(); });
  dialog?.addEventListener("close", () => restoreDetailFocus());
  window.addEventListener?.("popstate", restoreFromUrl);
}
export async function start() {
  try {
    state.catalog = await loadCatalog();
    state.history = await loadHistory();
    configureFilters();
    updateLoadState(`합성 저장본 ${arrays(state.catalog.offerings).length}개와 과거 이력 ${state.history.length}건을 불러왔습니다.`);
    renderCatalog();
    renderHistory();
    // Canonicalize malformed or out-of-range page values after data is known.
    setUrlState();
    renderSuitability();
  } catch {
    updateLoadState("합성 저장본을 불러오지 못했습니다.", true);
    const result = one("#result-list");
    result?.replaceChildren();
    one("#history-list")?.replaceChildren();
  }
}

export function bootstrap() {
  if (typeof document === "undefined") return;
  state.page = document.body?.dataset.page ?? "";
  applyUrlState();
  if (!["home", "search", "suitability"].includes(state.page)) return;
  if (state.page === "search") installInteractions();
  if (state.page === "search" || state.page === "suitability") start();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  else bootstrap();
}
