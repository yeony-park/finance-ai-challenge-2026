"use client";

import { useSyncExternalStore } from "react";

export const PROFILE_STORAGE_KEY = "jeomjeom.profile.v1";

export const PROFILE_LEVELS = ["easy", "pro"] as const;
export type ProfileLevel = (typeof PROFILE_LEVELS)[number];

export const PROFILE_CONCERNS = [
  "asset-existence",
  "return-structure",
  "protection-scope",
  "exit-structure",
] as const;
export type ProfileConcern = (typeof PROFILE_CONCERNS)[number];

export const PROFILE_CATEGORY_IDS = [
  "cattle",
  "pig",
  "art",
  "real-estate",
] as const;
export type ProfileCategoryId = (typeof PROFILE_CATEGORY_IDS)[number];

export interface BeginnerProfile {
  readonly version: 1;
  readonly level: ProfileLevel | null;
  readonly concern: ProfileConcern | null;
  readonly interests: readonly ProfileCategoryId[];
}

export const EMPTY_PROFILE: BeginnerProfile = {
  version: 1,
  level: null,
  concern: null,
  interests: [],
};

const isLevel = (value: unknown): value is ProfileLevel =>
  PROFILE_LEVELS.includes(value as ProfileLevel);

const isConcern = (value: unknown): value is ProfileConcern =>
  PROFILE_CONCERNS.includes(value as ProfileConcern);

const isCategoryId = (value: unknown): value is ProfileCategoryId =>
  PROFILE_CATEGORY_IDS.includes(value as ProfileCategoryId);

export const parseProfile = (raw: string | null): BeginnerProfile => {
  if (!raw) return EMPTY_PROFILE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return EMPTY_PROFILE;
    }
    const record = parsed as Record<string, unknown>;
    const interests = Array.isArray(record.interests)
      ? [...new Set(record.interests.filter(isCategoryId))]
      : [];
    return {
      version: 1,
      level: isLevel(record.level) ? record.level : null,
      concern: isConcern(record.concern) ? record.concern : null,
      interests,
    };
  } catch {
    return EMPTY_PROFILE;
  }
};

export const isProfileEmpty = (profile: BeginnerProfile): boolean =>
  profile.level === null &&
  profile.concern === null &&
  profile.interests.length === 0;

export const orderByConcern = <T extends { readonly id: string }>(
  items: readonly T[],
  concern: ProfileConcern | null,
): readonly T[] => {
  if (!concern) return items;
  return [
    ...items.filter((item) => item.id === concern),
    ...items.filter((item) => item.id !== concern),
  ];
};

export const orderByInterests = <T extends { readonly id: string }>(
  entries: readonly T[],
  interests: readonly string[],
): readonly T[] => {
  if (interests.length === 0) return entries;
  const rank = (id: string): number => {
    const index = interests.indexOf(id);
    return index === -1 ? interests.length : index;
  };
  return [...entries].sort((a, b) => rank(a.id) - rank(b.id));
};

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedProfile: BeginnerProfile = EMPTY_PROFILE;
let memoryProfile: BeginnerProfile = EMPTY_PROFILE;
let isStorageBlocked = false;

const readProfile = (): BeginnerProfile => {
  if (isStorageBlocked) return memoryProfile;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedProfile = parseProfile(raw);
    }
    return cachedProfile;
  } catch {
    isStorageBlocked = true;
    return memoryProfile;
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

const writeProfile = (next: BeginnerProfile): void => {
  memoryProfile = next;

  if (!isStorageBlocked) {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      isStorageBlocked = true;
    }
  }

  for (const listener of listeners) listener();
};

export const patchProfile = (
  patch: Partial<Omit<BeginnerProfile, "version">>,
): void => writeProfile({ ...readProfile(), ...patch, version: 1 });

export const resetProfile = (): void => writeProfile(EMPTY_PROFILE);

export const useProfile = (): BeginnerProfile =>
  useSyncExternalStore(subscribe, readProfile, () => EMPTY_PROFILE);
