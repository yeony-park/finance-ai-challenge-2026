"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  isProfileEmpty,
  patchProfile,
  useProfile,
  type CategoryId,
  type ProfileConcern,
  type ProfileLevel,
} from "@/components/site/profile";
import { CATEGORY_REGISTRY, categoryDisplayLabel } from "@/lib/content/categories";
import {
  CONCERN_OPTIONS,
  CONCERN_QUESTION,
  INTEREST_HINT,
  INTEREST_QUESTION,
  LEVEL_OPTIONS,
  LEVEL_QUESTION,
  ONBOARDING_DONE_LABEL,
  ONBOARDING_LEAD,
  ONBOARDING_OPEN_EVENT,
  ONBOARDING_SKIP_LABEL,
  ONBOARDING_TITLE,
  STORAGE_NOTE,
} from "@/lib/content/onboarding";

import controls from "./home-controls.module.css";
import s from "./OnboardingDialog.module.css";

const SEEN_KEY = "jeomjeom.onboarding.v1";

const readSeen = (): boolean => {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return true;
  }
};

const markSeen = (): void => {
  try {
    window.localStorage.setItem(SEEN_KEY, "seen");
  } catch {
    return;
  }
};

const toggleLevel = (current: ProfileLevel | null, next: ProfileLevel): void =>
  patchProfile({ level: current === next ? null : next });

const toggleConcern = (
  current: ProfileConcern | null,
  next: ProfileConcern,
): void => patchProfile({ concern: current === next ? null : next });

const toggleInterest = (
  current: readonly CategoryId[],
  id: CategoryId,
): void =>
  patchProfile({
    interests: current.includes(id)
      ? current.filter((entry) => entry !== id)
      : [...current, id],
  });

export function OnboardingDialog() {
  const profile = useProfile();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const attemptedRef = useRef(false);

  const close = useCallback(() => {
    markSeen();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (attemptedRef.current || pathname !== "/") return;
    if (readSeen() || !isProfileEmpty(profile)) return;
    const id = window.setTimeout(() => {
      attemptedRef.current = true;
      setIsOpen(true);
    }, 300);
    return () => window.clearTimeout(id);
  }, [pathname, profile]);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(ONBOARDING_OPEN_EVENT, open);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    titleRef.current?.focus({ preventScroll: true });
    if (dialogRef.current) dialogRef.current.scrollTop = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className={s.obOverlay} onClick={close} role="presentation">
      <div
        ref={dialogRef}
        className={s.obDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          ref={titleRef}
          id="onboarding-dialog-title"
          className={s.obDialogTitle}
          tabIndex={-1}
        >
          {ONBOARDING_TITLE}
        </h2>
        <p className={s.obDialogLead}>{ONBOARDING_LEAD}</p>

        <div className={s.obGroup} role="group" aria-label={LEVEL_QUESTION}>
          <p className={s.obQuestion}>{LEVEL_QUESTION}</p>
          <div className={controls.chipRow}>
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.level}
                type="button"
                className={controls.chip}
                aria-pressed={profile.level === option.level}
                onClick={() => toggleLevel(profile.level, option.level)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.obGroup} role="group" aria-label={CONCERN_QUESTION}>
          <p className={s.obQuestion}>{CONCERN_QUESTION}</p>
          <div className={controls.chipRow}>
            {CONCERN_OPTIONS.map((option) => (
              <button
                key={option.concern}
                type="button"
                className={controls.chip}
                aria-pressed={profile.concern === option.concern}
                onClick={() => toggleConcern(profile.concern, option.concern)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.obGroup} role="group" aria-label={INTEREST_QUESTION}>
          <p className={s.obQuestion}>{INTEREST_QUESTION}</p>
          <p className={s.obHint}>{INTEREST_HINT}</p>
          <div className={controls.chipRow}>
            {CATEGORY_REGISTRY.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={controls.chip}
                aria-pressed={profile.interests.includes(entry.id)}
                onClick={() => toggleInterest(profile.interests, entry.id)}
              >
                {categoryDisplayLabel(entry)}
              </button>
            ))}
          </div>
        </div>

        <div className={s.obDialogFoot}>
          <button
            type="button"
            className={s.obDone}
            onClick={close}
          >
            {isProfileEmpty(profile) ? ONBOARDING_SKIP_LABEL : ONBOARDING_DONE_LABEL}
          </button>
        </div>
        <p className={s.obStorage}>{STORAGE_NOTE}</p>
      </div>
    </div>
  );
}
