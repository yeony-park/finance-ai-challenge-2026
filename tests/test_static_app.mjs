import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  filterCatalog,
  filterHistory,
  filterOfferings,
  historyDateEntries,
  historyDates,
  historyDetailFields,
  normalizeUrlState,
  paginate,
  safeSyntheticImage,
  serializeUrlState,
  visibleReturn,
} from "../js/app.js";
import { fetchJson, loadCatalog, loadHistory } from "../js/api.js";

const fixture = JSON.parse(readFileSync(new URL("../data/synthetic/art-investment.json", import.meta.url), "utf8"));
const response = (body, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => body });

// URL state is decoded once and survives a search/filter round trip.
{
  const state = normalizeUrlState("?q=Prism%20Drift&platform=synthetic-platform-lumen&status=UPCOMING&scope=current");
  assert.deepEqual(state, {
    q: "Prism Drift", platform: "synthetic-platform-lumen", status: "upcoming", scope: "current",
    catalogPage: 1, historyPage: 1,
  });
  assert.equal(serializeUrlState(state), "q=Prism+Drift&platform=synthetic-platform-lumen&status=upcoming&scope=current");
  assert.deepEqual(normalizeUrlState("?catalogPage=2&historyPage=03"), {
    q: "", platform: "all", status: "all", scope: "all", catalogPage: 2, historyPage: 3,
  });
  assert.deepEqual(normalizeUrlState("?catalogPage=0&historyPage=-4.5"), {
    q: "", platform: "all", status: "all", scope: "all", catalogPage: 1, historyPage: 1,
  });
  assert.equal(serializeUrlState({ ...state, catalogPage: 2, historyPage: 3 }), "q=Prism+Drift&platform=synthetic-platform-lumen&status=upcoming&scope=current&catalogPage=2&historyPage=3");
}

const catalog = fixture;
const history = fixture.trackRecords;
{
  const platformState = { q: "", platform: "synthetic-platform-lumen", status: "all", scope: "current" };
  const current = filterOfferings(catalog, platformState);
  assert.ok(current.length > 0);
  assert.ok(current.every((item) => item.platformId === "synthetic-platform-lumen"));
  assert.equal(filterHistory(history, catalog, platformState).length, 0);
  const liquidated = filterHistory(history, catalog, { q: "", platform: "all", status: "liquidated", scope: "historical" });
  assert.ok(liquidated.length > 0);
  assert.ok(liquidated.every((item) => item.status === "liquidated" || item.lifecycle === "liquidated"));
  const searched = filterCatalog(catalog, history, { q: "clear lattice", platform: "all", status: "all", scope: "historical" });
  assert.ok(searched.history.length > 0);
  assert.equal(searched.offerings.length, 0);
}
{
  const page = paginate(history, 2, 12);
  assert.equal(page.currentPage, 2);
  assert.equal(page.items.length, 12);
  assert.equal(page.total, 318);
  assert.equal(paginate(history, 99, 12).currentPage, 27);
}

// Date rendering must use the four synthetic lifecycle fields, not a generic date.
{
  const sample = { date: "wrong", subscriptionStart: "2021-01-02", subscriptionEnd: "2021-01-06", soldAt: "2022-02-03", liquidatedAt: "2022-02-08" };
  assert.deepEqual(historyDates(sample), {
    subscriptionStart: "2021-01-02", subscriptionEnd: "2021-01-06", soldAt: "2022-02-03", liquidatedAt: "2022-02-08",
  });
  assert.deepEqual(historyDateEntries(sample), [["모집 시작", "2021-01-02"], ["모집 종료", "2021-01-06"], ["매각", "2022-02-03"], ["청산", "2022-02-08"]]);
  const detail = historyDetailFields({
    artistName: "합성 작가", artworkTitle: "합성 작품", artworkMedium: "캔버스",
    offeringAmount: 1000000, totalDistribution: 1000, exitAmount: 1100000,
    ...sample, status: "liquidated", actualHoldingMonths: 14, finalReturn: 10,
  });
  const detailMap = Object.fromEntries(detail);
  assert.equal(detailMap["작가"], "합성 작가");
  assert.equal(detailMap["재료"], "캔버스");
  assert.match(detailMap["공모 금액"], /1,000,000/);
  assert.equal(detailMap["매각일"], "2022-02-03");
  assert.equal(detailMap["청산일"], "2022-02-08");
  assert.match(detailMap["보유기간"], /14개월/);
  assert.match(detailMap["수익률"], /10%/);
}

// A zero or negative return is valid. Use source-reported, then final, then calculated.
assert.equal(visibleReturn({ sourceReportedReturnPct: 8.5, finalReturn: 9, calculatedSettlementReturnPct: 10 }), 8.5);
assert.equal(visibleReturn({ sourceReportedReturnPct: null, finalReturn: 0, calculatedSettlementReturnPct: 10 }), 0);
assert.equal(visibleReturn({ sourceReportedReturnPct: null, finalReturn: null, calculatedSettlementReturnPct: -4.25 }), -4.25);
assert.equal(visibleReturn({ sourceReportedReturnPct: null, finalReturn: null, calculatedSettlementReturnPct: null }), null);
assert.equal(safeSyntheticImage("/synthetic-art/history/synthetic-track-01-001.svg"), "/synthetic-art/history/synthetic-track-01-001.svg");
assert.equal(safeSyntheticImage("https://not-local.invalid/image.svg"), "");

// Malformed 200 responses are treated like API failures and use the fixture.
{
  const calls = [];
  const result = await loadCatalog(async (url) => {
    calls.push(url);
    return url === "/api/catalog" ? response({ ok: true }) : response(fixture);
  });
  assert.equal(result.trackRecords.length, 318);
  assert.deepEqual(calls, ["/api/catalog", "/data/synthetic/art-investment.json"]);
}
{
  const calls = [];
  const result = await loadHistory(async (url) => {
    calls.push(url);
    if (url === "/api/synthetic/history") return response({ history: {} });
    return response(fixture);
  });
  assert.equal(result.length, 318);
  assert.deepEqual(calls, ["/api/synthetic/history", "/api/catalog"]);
}
{
  await assert.rejects(
    () => fetchJson("/api/catalog", () => new Promise(() => {}), 5),
    /synthetic request timeout/,
  );
}


// A small DOM harness exercises the real module event handlers without adding a
// browser dependency to the static test suite. It models only DOM operations
// used by js/app.js.
class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event) {
    event.target ??= this;
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    return !event.defaultPrevented;
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = {};
    this.hidden = false;
    this.disabled = false;
    this.open = false;
    this.isConnected = true;
    this._textContent = "";
  }

  get options() {
    return this.children.filter((child) => child.tagName === "OPTION");
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  append(...children) {
    this._textContent = "";
    for (const child of children.flat()) {
      if (!child) continue;
      child.parentNode = this;
      this.children.push(child);
    }
  }

  replaceChildren(...children) {
    this.children.forEach((child) => { child.parentNode = null; child.isConnected = false; });
    this.children = [];
    this._textContent = "";
    this.append(...children);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent({ type: "close" }); }

  click() {
    if (this.disabled) return;
    this.dispatchEvent({ type: "click", preventDefault() { this.defaultPrevented = true; } });
  }

  matches(selector) {
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith(".")) return this.className?.split(/\s+/).includes(selector.slice(1));
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const result = [];
    const visit = (element) => {
      if (element.matches(selector)) result.push(element);
      element.children.forEach(visit);
    };
    this.children.forEach(visit);
    return result;
  }
}

class FakeDocument extends FakeEventTarget {
  constructor() {
    super();
    this.readyState = "complete";
    this.body = new FakeElement("body");
  }

  createElement(tagName) { return new FakeElement(tagName); }
  querySelector(selector) {
    if (this.body.matches(selector)) return this.body;
    return this.body.querySelector(selector);
  }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
}

class FakeWindow extends FakeEventTarget {
  constructor(search) {
    super();
    this.location = { pathname: "/search.html", search, hash: "" };
    this.history = new FakeHistory(this);
  }
}

class FakeHistory {
  constructor(window) {
    this.window = window;
    this.entries = [this.currentTarget()];
    this.index = 0;
  }

  currentTarget() {
    return `${this.window.location.pathname}${this.window.location.search}${this.window.location.hash}`;
  }

  update(target) {
    const parsed = new URL(target, "http://static.test");
    this.window.location.pathname = parsed.pathname;
    this.window.location.search = parsed.search;
    this.window.location.hash = parsed.hash;
  }

  replaceState(_state, _title, target) {
    this.entries[this.index] = target;
    this.update(target);
  }

  pushState(_state, _title, target) {
    this.entries.splice(this.index + 1);
    this.entries.push(target);
    this.index += 1;
    this.update(target);
  }

  back() {
    if (this.index === 0) return;
    this.index -= 1;
    this.update(this.entries[this.index]);
    this.window.dispatchEvent({ type: "popstate" });
  }

  forward() {
    if (this.index >= this.entries.length - 1) return;
    this.index += 1;
    this.update(this.entries[this.index]);
    this.window.dispatchEvent({ type: "popstate" });
  }
}

function makeSearchDocument() {
  const document = new FakeDocument();
  document.body.dataset.page = "search";
  const add = (tag, id, parent = document.body, className = "") => {
    const element = document.createElement(tag);
    element.id = id;
    element.className = className;
    parent.append(element);
    return element;
  };
  add("form", "search-form");
  add("input", "search-input");
  add("select", "platform-filter");
  add("select", "status-filter");
  add("select", "scope-filter");
  add("p", "load-state");
  add("p", "load-error");
  add("section", "catalog-section");
  add("div", "result-list");
  add("p", "result-empty");
  const catalogPager = add("nav", "catalog-pagination");
  add("button", "catalog-prev", catalogPager);
  add("span", "catalog-page-state", catalogPager);
  add("button", "catalog-next", catalogPager);
  add("section", "history-section");
  add("div", "history-list");
  add("p", "history-empty");
  const historyPager = add("nav", "history-pagination");
  add("button", "history-prev", historyPager);
  add("span", "history-page-state", historyPager);
  add("button", "history-next", historyPager);
  add("dialog", "history-detail");
  add("button", "history-detail-close");
  add("div", "history-detail-content");
  return document;
}

async function flushStaticStart() {
  // loadCatalog/loadHistory each use promise chains; two turns are enough and
  // keep this test deterministic without a polling loop.
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

// Actual DOM regression: historical page 2 is represented in the URL, and a
// fresh document initialized from that URL renders the same records. Browser
// history also restores page 1/page 2 through the module's popstate handler.
{
  const original = {
    document: globalThis.document,
    window: globalThis.window,
    location: globalThis.location,
    fetch: globalThis.fetch,
  };
  const responseFor = (url) => {
    if (url === "/api/catalog") return response(fixture);
    if (url === "/api/synthetic/history") return response({ dataMode: "synthetic", synthetic: true, history });
    throw new Error(`unexpected URL ${url}`);
  };
  try {
    const firstWindow = new FakeWindow("?scope=historical");
    const firstDocument = makeSearchDocument();
    globalThis.window = firstWindow;
    globalThis.document = firstDocument;
    globalThis.location = firstWindow.location;
    globalThis.fetch = async (url) => responseFor(url);
    await import(`../js/app.js?dom-regression-first=${Date.now()}`);
    await flushStaticStart();

    const historyNext = firstDocument.querySelector("#history-next");
    assert.equal(firstDocument.querySelector("#history-page-state").textContent, "1 / 27페이지");
    historyNext.click();
    assert.equal(firstWindow.location.search, "?scope=historical&historyPage=2");
    assert.equal(firstDocument.querySelector("#history-page-state").textContent, "2 / 27페이지");
    assert.equal(firstDocument.querySelector("#history-list").children.length, 12);
    assert.equal(firstDocument.querySelector("#history-list").children[0].children[0].dataset.historyId, history[12].id);

    firstWindow.history.back();
    assert.equal(firstWindow.location.search, "?scope=historical");
    assert.equal(firstDocument.querySelector("#history-page-state").textContent, "1 / 27페이지");
    firstWindow.history.forward();
    assert.equal(firstDocument.querySelector("#history-page-state").textContent, "2 / 27페이지");

    const reloadWindow = new FakeWindow(firstWindow.location.search);
    const reloadDocument = makeSearchDocument();
    globalThis.window = reloadWindow;
    globalThis.document = reloadDocument;
    globalThis.location = reloadWindow.location;
    globalThis.fetch = async (url) => responseFor(url);
    await import(`../js/app.js?dom-regression-reload=${Date.now()}`);
    await flushStaticStart();
    assert.equal(reloadDocument.querySelector("#history-page-state").textContent, "2 / 27페이지");
    assert.equal(reloadDocument.querySelector("#history-list").children[0].children[0].dataset.historyId, history[12].id);

    // Changing a filter resets both independent lists to page 1 while keeping
    // the active scope in the URL.
    const statusFilter = reloadDocument.querySelector("#status-filter");
    statusFilter.value = "liquidated";
    statusFilter.dispatchEvent({ type: "change" });
    assert.equal(reloadDocument.querySelector("#history-page-state").textContent, "1 / 12페이지");
    assert.equal(reloadWindow.location.search, "?status=liquidated&scope=historical");
  } finally {
    globalThis.document = original.document;
    globalThis.window = original.window;
    globalThis.location = original.location;
    globalThis.fetch = original.fetch;
  }
}

console.log("PASS: synthetic static explorer behavior");
