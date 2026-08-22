"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./shell.module.css";

const items = [
  { href: "/cattle", label: "한우" },
  { href: "/pig", label: "한돈" },
  { href: "/art", label: "미술품" },
  { href: "/real-estate", label: "부동산" },
  { href: "/offers", label: "검증 리포트" },
  { href: "/methodology", label: "검증 방법" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <nav className={s.nav} aria-label="주요 메뉴">{items.map((item) => {
    const current = item.href === "/offers"
      ? pathname === "/offers" || pathname.startsWith("/offers/") || pathname === "/products" || pathname.startsWith("/products/")
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return <Link key={item.label} href={item.href} className={s.navLink} aria-current={current ? "page" : undefined}>{item.label}</Link>;
  })}</nav>;
}
