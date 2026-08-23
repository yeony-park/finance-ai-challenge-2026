"use client";

import {
  ONBOARDING_OPEN_EVENT,
  ONBOARDING_OPEN_LABEL,
} from "@/lib/content/onboarding";

export function OnboardingOpenButton({
  className,
}: {
  readonly className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT))}
    >
      {ONBOARDING_OPEN_LABEL}
    </button>
  );
}
