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
  { href: "/#reports", label: "검증 리포트", match: "/" },
  { href: "/methodology", label: "검증 방법", match: "/methodology" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className={s.nav} aria-label="주요 메뉴">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={s.navLink}
          aria-current={pathname === item.match ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
