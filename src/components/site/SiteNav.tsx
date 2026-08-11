"use client";

/**
 * 상단 내비 — 현재 위치 표시(aria-current)만을 위해 클라이언트 컴포넌트다.
 * 링크 목록은 상수라 서버에서 그대로 프리렌더되고, 하이드레이션 이후 현재 경로만 갱신된다.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

import s from "./shell.module.css";

interface NavItem {
  readonly href: string;
  readonly label: string;
  /** 현재 위치로 볼 경로 — 해시 링크는 경로만 비교한다 */
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
