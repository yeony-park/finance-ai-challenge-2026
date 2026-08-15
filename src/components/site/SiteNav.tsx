"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import s from "./shell.module.css";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly match: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/cattle", label: "한우", match: "/cattle" },
  { href: "/pig", label: "돼지", match: "/pig" },
  { href: "/art", label: "미술품", match: "/art" },
  { href: "/real-estate", label: "부동산", match: "/real-estate" },
  { href: "/offers", label: "검증 리포트", match: "/offers" },
  { href: "/methodology", label: "검증 방법", match: "/methodology" },
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
