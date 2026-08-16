"use client";

import Link from "next/link";

import { CATEGORY_REGISTRY } from "@/lib/content/categories";
import {
  concernShort,
  levelShort,
  PROFILE_BAR_LABEL,
  PROFILE_CHANGE_LABEL,
  PROFILE_RESET_LABEL,
} from "@/lib/content/onboarding";
import { isProfileEmpty, resetProfile, useProfile } from "./profile";

import s from "./shell.module.css";

export function ProfileBar() {
  const profile = useProfile();

  if (isProfileEmpty(profile)) return null;

  const interestLabels = profile.interests
    .map((id) => CATEGORY_REGISTRY.find((entry) => entry.id === id)?.label ?? id)
    .join("·");

  return (
    <aside className={s.profileBar} aria-label={PROFILE_BAR_LABEL}>
      <div className={`${s.inner} ${s.profileBarRow}`}>
        {profile.level ? (
          <span>
            눈높이 <b>{levelShort(profile.level)}</b>
          </span>
        ) : null}
        {profile.concern ? (
          <span>
            걱정 <b>{concernShort(profile.concern)}</b>
          </span>
        ) : null}
        {interestLabels.length > 0 ? (
          <span>
            관심 <b>{interestLabels}</b>
          </span>
        ) : null}
        <span className={s.profileBarActions}>
          <Link href="/#start" className={s.profileBarAction}>
            {PROFILE_CHANGE_LABEL}
          </Link>
          <button
            type="button"
            className={s.profileBarAction}
            onClick={resetProfile}
          >
            {PROFILE_RESET_LABEL}
          </button>
        </span>
      </div>
    </aside>
  );
}
