"use client";

import {
  isProfileEmpty,
  patchProfile,
  resetProfile,
  useProfile,
  type CategoryId,
  type ProfileConcern,
  type ProfileLevel,
} from "@/components/site/profile";
import { CATEGORY_REGISTRY, categoryDisplayLabel } from "@/lib/content/categories";
import {
  CHECKLIST_LINK_LABEL,
  CONCERN_OPTIONS,
  CONCERN_QUESTION,
  concernShort,
  INTEREST_HINT,
  INTEREST_QUESTION,
  LEVEL_OPTIONS,
  LEVEL_QUESTION,
  levelShort,
  ONBOARDING_LEAD,
  ONBOARDING_TITLE,
  PROFILE_RESET_LABEL,
  STORAGE_NOTE,
} from "@/lib/content/onboarding";

import s from "./home.module.css";

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

export function OnboardingBand() {
  const profile = useProfile();

  const summaryParts = [
    profile.level ? `눈높이 ${levelShort(profile.level)}` : null,
    profile.concern ? `걱정 ${concernShort(profile.concern)}` : null,
    profile.interests.length > 0
      ? `관심 ${profile.interests
          .map((id) => CATEGORY_REGISTRY.find((entry) => entry.id === id)?.label ?? id)
          .join("·")}`
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <section id="start" className={s.section} aria-labelledby="onboarding-title">
      <div className={s.wrap}>
        <h2 id="onboarding-title" className={s.sectionTitle}>
          {ONBOARDING_TITLE}
        </h2>
        <p className={s.sectionLead}>{ONBOARDING_LEAD}</p>

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
            {CATEGORY_REGISTRY.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={s.chip}
                aria-pressed={profile.interests.includes(entry.id)}
                onClick={() => toggleInterest(profile.interests, entry.id)}
              >
                {categoryDisplayLabel(entry)}
              </button>
            ))}
          </div>
        </div>

        <div className={s.obFoot}>
          <a href="#checklist" className={s.bandLink}>
            {CHECKLIST_LINK_LABEL}
          </a>
          {summaryParts.length > 0 ? (
            <span className={s.obSummary} aria-live="polite">
              적용됨: {summaryParts.join(" · ")}
            </span>
          ) : null}
          {!isProfileEmpty(profile) ? (
            <button type="button" className={s.chip} onClick={resetProfile}>
              {PROFILE_RESET_LABEL}
            </button>
          ) : null}
        </div>
        <p className={s.obStorage}>{STORAGE_NOTE}</p>
      </div>
    </section>
  );
}
