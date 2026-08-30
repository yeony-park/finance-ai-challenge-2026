"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { unexplainedDifference } from "@/lib/art/calculations";
import { formatKrw } from "@/lib/art/calculations";
import type { ArtProduct } from "@/lib/art/product-model";
import {
  ART_CELL_CHECK_NONE,
  ART_CELL_NOT_DISCLOSED,
  ART_CELL_UNVERIFIED,
  ART_COMPARE_EMPTY,
  ART_COMPARE_HINT,
  ART_ROW_ACQUISITION,
  ART_ROW_ASOF,
  ART_ROW_CHECK,
  ART_ROW_COST,
  ART_ROW_DOC,
  ART_ROW_OFFERING,
  ART_ROW_STATUS,
  ART_ROW_VERDICT,
} from "@/lib/content/art";
import { VERDICT_LABEL } from "@/lib/verify/report/view-model/labels";

import s from "./art.module.css";

const MAX_COMPARE = 3;
const VERDICT_CLASS: Record<
  ArtProduct["assessment"]["verdict"],
  string
> = {
  match: s.verdictMatch,
  mismatch: s.verdictMiss,
  unverifiable: s.verdictUnknown,
};

export function parseCompareParam(
  search: string,
  validIds: ReadonlySet<string>,
): string[] {
  const raw = new URLSearchParams(search).get("compare");
  if (!raw) return [];
  const seen: string[] = [];
  for (const id of raw.split(",")) {
    if (validIds.has(id) && !seen.includes(id)) seen.push(id);
    if (seen.length >= MAX_COMPARE) break;
  }
  return seen;
}

function checkCell(product: ArtProduct): string {
  if (
    product.art.acquisitionWon === null ||
    product.art.issuanceCostWon === null
  )
    return ART_CELL_CHECK_NONE;
  const diff = unexplainedDifference(
    product.offering.amountWon,
    product.art.acquisitionWon,
    [
      {
        category: "issuance",
        label: "발행비용",
        amount: product.art.issuanceCostWon,
      },
    ],
  );
  return `${(diff ?? 0).toLocaleString("ko-KR")}원`;
}

const subscribeToLocation = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
};

const serverCompareSnapshot = () => "";

export function canonicalCompareUrl(href: string, next: string): string {
  const url = new URL(href);
  if (next) url.searchParams.set("compare", next);
  else url.searchParams.delete("compare");
  return `${url.pathname}${url.search}${url.hash}`;
}

function replaceCompareParam(next: string): void {
  window.history.replaceState(
    window.history.state,
    "",
    canonicalCompareUrl(window.location.href, next),
  );
}

interface ArtCompareSectionProps {
  readonly products: readonly ArtProduct[];
}

export function ArtCompareSection({ products }: ArtCompareSectionProps) {
  const validIds = useMemo(
    () => new Set(products.map((product) => product.id)),
    [products],
  );
  const compareSnapshot = useSyncExternalStore(
    subscribeToLocation,
    () => parseCompareParam(window.location.search, validIds).join(","),
    serverCompareSnapshot,
  );
  const selected = compareSnapshot ? compareSnapshot.split(",") : [];

  useEffect(() => {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("compare") ?? "";
    if (
      raw !== compareSnapshot ||
      (!compareSnapshot && url.searchParams.has("compare"))
    ) {
      replaceCompareParam(compareSnapshot);
    }
  }, [compareSnapshot]);

  const sync = (next: readonly string[]) => {
    replaceCompareParam(next.join(","));
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      sync(selected.filter((x) => x !== id));
    } else if (selected.length < MAX_COMPARE) {
      sync([...selected, id]);
    }
  };

  const chosen = products.filter((product) => selected.includes(product.id));

  return (
    <div>
      <div className={s.comparePicker}>
        {products.map((product) => {
          const isOn = selected.includes(product.id);
          return (
            <button
              key={product.id}
              type="button"
              className={s.compareChip}
              aria-pressed={isOn}
              disabled={!isOn && selected.length >= MAX_COMPARE}
              onClick={() => toggle(product.id)}
            >
              {product.label}
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
                {chosen.map((product) => (
                  <th key={product.id} scope="col">
                    {product.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{ART_ROW_OFFERING}</th>
                {chosen.map((product) => (
                  <td key={product.id}>
                    {formatKrw(product.offering.amountWon)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_ACQUISITION}</th>
                {chosen.map((product) => (
                  <td key={product.id}>
                    {product.art.acquisitionWon === null
                      ? ART_CELL_UNVERIFIED
                      : formatKrw(product.art.acquisitionWon)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_COST}</th>
                {chosen.map((product) => (
                  <td key={product.id}>
                    {product.art.issuanceCostWon === null
                      ? ART_CELL_NOT_DISCLOSED
                      : formatKrw(product.art.issuanceCostWon)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_CHECK}</th>
                {chosen.map((product) => (
                  <td key={product.id}>{checkCell(product)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_ASOF}</th>
                {chosen.map((product) => (
                  <td key={product.id}>{product.art.asOf}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_STATUS}</th>
                {chosen.map((product) => (
                  <td key={product.id}>{product.assessment.statusNote}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{ART_ROW_DOC}</th>
                {chosen.map((product) => (
                  <td key={product.id}>
                    {product.evidence.length > 0
                      ? product.evidence.map((source) => (
                          <span key={source.id} className={s.detailMono}>
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
                {chosen.map((product) => (
                  <td key={product.id}>
                    <span
                      className={`${s.compareVerdict} ${VERDICT_CLASS[product.assessment.verdict]}`}
                    >
                      {VERDICT_LABEL[product.assessment.verdict]}
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
