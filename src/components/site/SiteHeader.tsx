"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SiteNav } from "./SiteNav";
import { SERVICE_NAME } from "./service";
import s from "./shell.module.css";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const handleWordmarkClick = () => {
    if (isHome) window.dispatchEvent(new Event("jeomjeom:home-reset"));
  };

  return (
    <header
      className={`${s.header} ${isHome ? s.headerHome : ""}`}
      data-site-header
    >
      <div className={`${s.inner} ${s.headerRow}`}>
        <Link href="/" className={s.wordmark} onClick={handleWordmarkClick}>
          <Image
            src="/jeomjeom-mark.png"
            alt=""
            width={196}
            height={256}
            className={s.wordmarkMark}
            aria-hidden="true"
          />
          <span className={s.wordmarkName}>{SERVICE_NAME}</span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
