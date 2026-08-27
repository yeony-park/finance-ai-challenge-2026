"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { categoryById } from "@/lib/content/categories";

import s from "./shell.module.css";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly match: string;
}

const UTILITY_ITEMS: readonly NavItem[] = [
  { href: "/offers", label: "검증 리포트", match: "/offers" },
  { href: "/methodology", label: "검증 방법", match: "/methodology" },
];

const NAV_CATEGORY_IDS = ["art", "cattle", "pig", "real-estate"] as const;

const NAV_ITEMS: readonly NavItem[] = [
  ...NAV_CATEGORY_IDS.map((categoryId) => {
    const entry = categoryById(categoryId);
    return {
      href: entry.href,
      label: entry.label,
      match: entry.href,
    };
  }),
  ...UTILITY_ITEMS,
];

const isCurrent = (pathname: string, match: string): boolean =>
  pathname === match || pathname.startsWith(`${match}/`);

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className={s.nav} aria-label="주요 메뉴">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={s.navLink}
          aria-current={isCurrent(pathname, item.match) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
