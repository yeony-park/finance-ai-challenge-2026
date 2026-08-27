import Link from "next/link";

import type { CategoryTab } from "@/lib/content/category-tabs";

import s from "./category.module.css";

interface CategoryPageNavProps {
  readonly title: string;
  readonly href: string;
  readonly activeTab: CategoryTab;
}

export function CategoryPageNav({
  title,
  href,
  activeTab,
}: CategoryPageNavProps) {
  return (
    <nav className={s.pageNav} aria-label={`${title} 하위 메뉴`}>
      <Link
        href={`${href}?tab=about`}
        className={activeTab === "about" ? `${s.pageNavLink} ${s.pageNavLinkCurrent}` : s.pageNavLink}
        aria-current={activeTab === "about" ? "page" : undefined}
      >
        설명
      </Link>
      <Link
        href={`${href}?tab=analysis`}
        className={activeTab === "analysis" ? `${s.pageNavLink} ${s.pageNavLinkCurrent}` : s.pageNavLink}
        aria-current={activeTab === "analysis" ? "page" : undefined}
      >
        분석
      </Link>
    </nav>
  );
}
