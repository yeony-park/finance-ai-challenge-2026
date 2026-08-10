"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/real-estate", label: "부동산" },
  { href: "/livestock/cattle", label: "한우" },
  { href: "/livestock/pig", label: "돼지" },
  { href: "/art", label: "미술품" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="JeomJeom 홈">
          <span className="brand-mark" aria-hidden="true">·</span>
          <strong>JeomJeom</strong>
        </Link>
        <nav className="main-nav" aria-label="주요 메뉴">
          {navigation.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                className={isActive ? "active" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <span className="prototype-pill">UI prototype</span>
      </div>
    </header>
  );
}
