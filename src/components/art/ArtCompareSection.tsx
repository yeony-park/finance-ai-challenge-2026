"use client";

import { useEffect, useState } from "react";

import { unexplainedDifference } from "@/lib/art/calculations";
import { formatKrw } from "@/lib/art/calculations";
import {
  ART_CELL_CHECK_NONE,
  ART_CELL_NOT_DISCLOSED,
  ART_CELL_UNVERIFIED,
  ART_COMPARE_EMPTY,
  ART_COMPARE_HINT,
  ART_PRODUCT_FACTS,
  ART_ROW_ACQUISITION,
  ART_ROW_ASOF,
  ART_ROW_CHECK,
  ART_ROW_COST,
  ART_ROW_DOC,
  ART_ROW_OFFERING,
  ART_ROW_STATUS,
  ART_ROW_VERDICT,
  type ArtProductFact,
} from "@/lib/content/art";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import s from "./art.module.css";

const MAX_COMPARE = 3;
const VALID_IDS = new Set(ART_PRODUCT_FACTS.map((fact) => fact.id));
const VERDICT_CLASS: Record<ArtProductFact["verdict"], string> = {
  match: s.verdictMatch,
  mismatch: s.verdictMiss,
  unverifiable: s.verdictUnknown,
};

function parseCompareParam(search: string): string[] {
  const raw = new URLSearchParams(search).get("compare");
  if (!raw) return [];
  const seen: string[] = [];
  for (const id of raw.split(",")) {
    if (VALID_IDS.has(id) && !seen.includes(id)) seen.push(id);
    if (seen.length >= MAX_COMPARE) break;
  }
  return seen;
}

function checkCell(fact: ArtProductFact): string {
  if (fact.acquisition === null || fact.issuanceCost === null)
    return ART_CELL_CHECK_NONE;
  const diff = unexplainedDifference(fact.offeringAmount, fact.acquisition, [
    { category: "issuance", label: "발행비용", amount: fact.issuanceCost },
  ]);
  return `${(diff ?? 0).toLocaleString("ko-KR")}원`;
}

export function ArtCompareSection() {
  const [selected, setSelected] = useState<readonly string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(parseCompareParam(window.location.search));
  }, []);

  const sync = (next: readonly string[]) => {
    setSelected(next);
    const url = new URL(window.location.href);
    if (next.length > 0) url.searchParams.set("compare", next.join(","));
    else url.searchParams.delete("compare");
    window.history.replaceState(null, "", url);
  };

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      sync(selected.filter((x) => x !== id));
    } else if (selected.length < MAX_COMPARE) {
      sync([...selected, id]);
    }
  };

  const chosen = ART_PRODUCT_FACTS.filter((fact) => selected.includes(fact.id));

  return (
    <div>
      <div className={s.comparePicker}>
        {ART_PRODUCT_FACTS.map((fact) => {
          const isOn = selected.includes(fact.id);
          return (
            <button
              key={fact.id}
              type="button"
              className={s.compareChip}
              aria-pressed={isOn}
              disabled={!isOn && selected.length >= MAX_COMPARE}
              onClick={() => toggle(fact.id)}
            >
              {fact.label}
            </button>
          );
        })}
      </div>
      <p className={s.compareHint}>{ART_COMPARE_HINT}</p>
      {chosen.length >= 2 ? (
        <div className={s.tableWrap}>
          <table className={s.compareTable}>
            <thead>
              <tr>
                <th scope="col">항목</th>
                {chosen.map((fact) => (
                  <th key={fact.id} scope="col">
                    {fact.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{ART_ROW_OFFERING}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>{formatKrw(fact.offeringAmount)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_ACQUISITION}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>
                    {fact.acquisition === null
                      ? ART_CELL_UNVERIFIED
                      : formatKrw(fact.acquisition)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_COST}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>
                    {fact.issuanceCost === null
                      ? ART_CELL_NOT_DISCLOSED
                      : formatKrw(fact.issuanceCost)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_CHECK}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>{checkCell(fact)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_ASOF}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>{fact.asOf}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_STATUS}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>{fact.statusNote}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_DOC}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>
                    {fact.sources.length > 0
                      ? fact.sources.map((source) => (
                          <span key={source.rcpNo} className={s.detailMono}>
                            {source.label} {source.rcpNo}
                            <br />
                          </span>
                        ))
                      : ART_CELL_UNVERIFIED}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_VERDICT}</th>
                {chosen.map((fact) => (
                  <td key={fact.id}>
                    <span
                      className={`${s.compareVerdict} ${VERDICT_CLASS[fact.verdict]}`}
                    >
                      {VERDICT_LABEL[fact.verdict]}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className={s.compareEmpty}>{ART_COMPARE_EMPTY}</p>
      )}
    </div>
  );
}
