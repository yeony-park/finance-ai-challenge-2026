import type { ReactNode } from "react";

import { CATEGORY_TAB_COPY } from "@/lib/content/category-tabs";

import s from "./category-shell.module.css";

interface CategoryPageNavProps {
  readonly title: string;
  readonly analysisControls?: ReactNode;
}

export function CategoryPageNav({
  title,
  analysisControls,
}: CategoryPageNavProps) {
  if (!analysisControls) return null;

  return (
    <nav
      className={s.pageNav}
      aria-label={`${title} ${CATEGORY_TAB_COPY.statusGroup}`}
    >
      {analysisControls}
    </nav>
  );
}
