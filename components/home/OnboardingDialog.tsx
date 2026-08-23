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

import s from "./home.module.css";

const SEEN_KEY = "jeomjeom.onboarding.v1";

const CATEGORIES: readonly { readonly id: CategoryId; readonly label: string }[] = [
  { id: "cattle", label: "한우" },
  { id: "pig", label: "한돈" },
  { id: "art", label: "미술품" },
  { id: "real-estate", label: "부동산" },
];

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

const getFocusable = (dialog: HTMLElement): HTMLElement[] =>
  Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));

export function OnboardingDialog() {
  const profile = useProfile();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const attemptedRef = useRef(false);

  const open = useCallback(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    markSeen();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (attemptedRef.current || pathname !== "/") return;
    if (readSeen() || !isProfileEmpty(profile)) return;
    const id = window.setTimeout(() => {
      attemptedRef.current = true;
      open();
    }, 300);
    return () => window.clearTimeout(id);
  }, [open, pathname, profile]);

  useEffect(() => {
    window.addEventListener(ONBOARDING_OPEN_EVENT, open);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, open);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusable(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus({ preventScroll: true });
      restoreFocusRef.current = null;
    };
  }, [close, isOpen]);

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
        <h2 id="onboarding-dialog-title" className={s.obDialogTitle}>
          {ONBOARDING_TITLE}
        </h2>
        <p className={s.obDialogLead}>{ONBOARDING_LEAD}</p>

        <div className={s.obGroup} role="group" aria-label={LEVEL_QUESTION}>
          <p className={s.obQuestion}>{LEVEL_QUESTION}</p>
          <div className={s.chipRow}>
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.level}
                type="button"
                className={s.chip}
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
          <div className={s.chipRow}>
            {CONCERN_OPTIONS.map((option) => (
              <button
                key={option.concern}
                type="button"
                className={s.chip}
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
          <div className={s.chipRow}>
            {CATEGORIES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={s.chip}
                aria-pressed={profile.interests.includes(entry.id)}
                onClick={() => toggleInterest(profile.interests, entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.obDialogFoot}>
          <button
            ref={closeRef}
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
