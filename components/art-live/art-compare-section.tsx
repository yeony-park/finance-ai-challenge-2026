"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ArtFact } from "./art-view-model";
import s from "./art.module.css";
const money = (value: number | null) => { if (value == null) return "공개되지 않음"; const eok = value / 100_000_000; const short = eok >= 1 ? `${Number(eok.toFixed(2))}억원` : `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`; return `${short} (${value.toLocaleString("ko-KR")}원)`; };

const maxItems = 3;
function readSelection(search: string, permitted: Set<string>) {
  const raw = new URLSearchParams(search).get("compare");
  if (!raw) return [] as string[];
  const selected: string[] = [];
  for (const id of raw.split(",")) { if (permitted.has(id) && !selected.includes(id)) selected.push(id); if (selected.length === maxItems) break; }
  return selected;
}
export function ArtCompareSection({ facts }: { facts: ArtFact[] }) {
  const permitted = new Set(facts.map((fact) => fact.id));
  // The server snapshot prevents a hydration mismatch; the browser snapshot then restores a shared URL.
  const search = useSyncExternalStore(
    (notify) => { window.addEventListener("popstate", notify); return () => window.removeEventListener("popstate", notify); },
    () => window.location.search,
    () => "",
  );
  const selected = readSelection(search, permitted);
  const canonicalSelection = selected.join(",");
  useEffect(() => {
    if (search !== window.location.search) return;
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("compare");
    if (raw === null || raw === canonicalSelection) return;
    if (canonicalSelection) url.searchParams.set("compare", canonicalSelection);
    else url.searchParams.delete("compare");
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [canonicalSelection, search]);
  const update = (next: string[]) => { const url = new URL(window.location.href); if (next.length) url.searchParams.set("compare", next.join(",")); else url.searchParams.delete("compare"); window.history.replaceState(null, "", url); window.dispatchEvent(new PopStateEvent("popstate")); };
  const choices = facts.filter((fact) => selected.includes(fact.id));
  const difference = (fact: ArtFact) => fact.acquisition == null || fact.issuanceCost == null || fact.offeringAmount == null ? "분리 기재 없음" : `${(fact.offeringAmount - fact.acquisition - fact.issuanceCost).toLocaleString("ko-KR")}원`;
  return <div><div className={s.comparePicker}>{facts.map((fact) => { const pressed = selected.includes(fact.id); return <button key={fact.id} type="button" className={s.compareChip} aria-pressed={pressed} disabled={!pressed && selected.length >= maxItems} onClick={() => update(pressed ? selected.filter((id) => id !== fact.id) : selected.length < maxItems ? [...selected, fact.id] : selected)}>{fact.label}</button>; })}</div><p className={s.compareHint}>최소 2개, 최대 3개까지 고를 수 있습니다.</p>{choices.length >= 2 ? <div className={s.tableWrap}><table className={s.compareTable}><thead><tr><th scope="col">항목</th>{choices.map((fact) => <th scope="col" key={fact.id}>{fact.label}</th>)}</tr></thead><tbody><tr><th scope="row">공모금액</th>{choices.map((fact) => <td key={fact.id}>{money(fact.offeringAmount)}</td>)}</tr><tr><th scope="row">취득가</th>{choices.map((fact) => <td key={fact.id}>{fact.acquisition == null ? "미확인" : money(fact.acquisition)}</td>)}</tr><tr><th scope="row">발행비용</th>{choices.map((fact) => <td key={fact.id}>{fact.issuanceCost == null ? "기재 없음" : money(fact.issuanceCost)}</td>)}</tr><tr><th scope="row">구성 검산 차액</th>{choices.map((fact) => <td key={fact.id}>{difference(fact)}</td>)}</tr><tr><th scope="row">기준일</th>{choices.map((fact) => <td key={fact.id}>{fact.asOf}</td>)}</tr><tr><th scope="row">상태</th>{choices.map((fact) => <td key={fact.id}>{fact.statusNote}</td>)}</tr><tr><th scope="row">공시 문서</th>{choices.map((fact) => <td key={fact.id}>{fact.sources.length ? fact.sources.map((source) => <span className={s.detailMono} key={source.rcpNo}>{source.label} {source.rcpNo}<br /></span>) : "미확인"}</td>)}</tr><tr><th scope="row">근거 상태</th>{choices.map((fact) => <td key={fact.id}><span className={`${s.compareVerdict} ${fact.verdict === "match" ? s.verdictMatch : s.verdictUnknown}`}>{fact.verdict === "match" ? "일치" : "대조 불가"}</span></td>)}</tr></tbody></table></div> : <p className={s.compareEmpty}>상품을 2개 이상 고르면 비교표가 나타납니다.</p>}</div>;
}
