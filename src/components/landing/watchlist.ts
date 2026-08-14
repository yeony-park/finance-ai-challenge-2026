"use client";

import { useSyncExternalStore } from "react";

export const WATCHLIST_STORAGE_KEY = "gongsi.watchlist.v1";

export const parseWatchlist = (raw: string | null): readonly string[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

export const toggleWatchlist = (
  ids: readonly string[],
  offerId: string,
): readonly string[] =>
  ids.includes(offerId) ? ids.filter((id) => id !== offerId) : [...ids, offerId];

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedIds: readonly string[] = [];
let memoryIds: readonly string[] = [];
let isStorageBlocked = false;

const readIds = (): readonly string[] => {
  if (isStorageBlocked) return memoryIds;
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedIds = parseWatchlist(raw);
    }
    return cachedIds;
  } catch {
    isStorageBlocked = true;
    return memoryIds;
  }
};

const subscribe = (onStoreChange: () => void): (() => void) => {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export const toggleWatched = (offerId: string): void => {
  const next = toggleWatchlist(readIds(), offerId);
  memoryIds = next;

  if (!isStorageBlocked) {
    try {
      window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      isStorageBlocked = true;
    }
  }

  for (const listener of listeners) listener();
};

export const useIsWatched = (offerId: string): boolean =>
  useSyncExternalStore(
    subscribe,
    () => readIds().includes(offerId),
    () => false,
  );
