import { loadCatalog, loadHistory } from "./api.js";

const state = { catalog: null, history: [], query: "" };
const page = document.body?.dataset.page || "home";

const one = (selector) => document.querySelector(selector);
function node(tag, text = "", className = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}
function list(value) {
  return Array.isArray(value) ? value : [];
}
function label(item) {
  return String(item?.title ?? item?.name ?? item?.productName ?? item?.artworkTitle ?? item?.id ?? "합성 데이터 항목");
}
function value(item, keys, fallback = "확인 불가") {
  for (const key of keys) {
    if (item && item[key] !== null && item[key] !== undefined && item[key] !== "") return item[key];
  }
  return fallback;
}
function display(valueToFormat) {
  if (typeof valueToFormat === "number") return valueToFormat.toLocaleString("ko-KR");
  if (typeof valueToFormat === "boolean") return valueToFormat ? "예" : "아니오";
  return String(valueToFormat);
}
function collections(catalog) {
  return {
    offerings: list(catalog?.offerings ?? catalog?.items),
    artworks: list(catalog?.artworks),
    artists: list(catalog?.artists),
  };
}
function searchable(item) {
  return [item?.id, item?.slug, item?.title, item?.name, item?.status, item?.lifecycle, item?.artworkId, item?.artistId]
    .filter(Boolean).join(" ").toLocaleLowerCase();
}
function offeringCard(item) {
  const card = node("article", "", "card");
  const top = node("div", "", "card-top");
  top.append(node("h3", label(item)), node("span", display(value(item, ["status", "lifecycle"])), "status"));
  card.append(top);
  const facts = node("dl", "", "facts");
  for (const [title, keys] of [["기준일", ["asOfDate", "as_of", "updatedAt"]], ["단위 금액", ["unitPrice", "unit_price"]], ["최소 금액", ["minimumInvestment", "minimum_investment"]], ["데이터 범위", ["recordScope", "scope"]]]) {
    const row = node("div");
    row.append(node("dt", title), node("dd", display(value(item, keys))));
    facts.append(row);
  }
  card.append(facts, node("p", "이 항목은 기능 검증을 위한 합성 데이터입니다. 실제 거래나 추천을 뜻하지 않습니다.", "muted"));
  return card;
}
function historyCard(item) {
  const card = node("article", "", "history-card");
  card.append(node("h3", label(item)));
  card.append(node("p", `${display(value(item, ["date", "asOfDate", "as_of", "timestamp"]))} · ${display(value(item, ["status", "type", "kind"]))}`, "muted"));
  return card;
}
function renderCatalog() {
  const result = one("#result-list");
  if (!result) return;
  const { offerings } = collections(state.catalog);
  const filtered = offerings.filter((item) => !state.query || searchable(item).includes(state.query));
  result.replaceChildren(...filtered.map(offeringCard));
  const empty = one("#result-empty");
  if (empty) empty.hidden = filtered.length > 0;
  const summary = one("#result-summary");
  if (summary) summary.textContent = `${filtered.length}개 항목 · 합성 데이터 전용`;
}
function renderHistory() {
  const result = one("#history-list");
  if (!result) return;
  const history = list(state.history);
  result.replaceChildren(...history.map(historyCard));
  const empty = one("#history-empty");
  if (empty) empty.hidden = history.length > 0;
}
function renderSuitability() {
  const summary = one("#synthetic-summary");
  if (!summary) return;
  const { offerings, artworks, artists } = collections(state.catalog);
  summary.replaceChildren(
    node("p", `항목 ${offerings.length}개 · 작품 ${artworks.length}개 · 작성자 ${artists.length}명`, "summary-number"),
    node("p", "이 정적 화면에는 개인 답안, 계정 정보, 외부 조회 기능이 없습니다.", "muted"),
  );
}
async function start() {
  try {
    state.catalog = await loadCatalog();
    state.history = await loadHistory();
    const count = collections(state.catalog).offerings.length;
    const status = one("#load-state");
    if (status) status.textContent = `합성 저장본 ${count}개를 불러왔습니다.`;
    renderCatalog();
    renderHistory();
    renderSuitability();
  } catch {
    const status = one("#load-state");
    if (status) status.textContent = "합성 저장본을 불러오지 못했습니다.";
    const error = one("#load-error");
    if (error) error.hidden = false;
  }
}
const form = one("#search-form");
if (form) form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = one("#search-input");
  state.query = input?.value.trim().toLocaleLowerCase() || "";
  renderCatalog();
});
const input = one("#search-input");
if (input) input.addEventListener("input", () => {
  state.query = input.value.trim().toLocaleLowerCase();
  if (page === "search") renderCatalog();
});
if (["home", "search", "suitability"].includes(page)) start();
