import Link from "next/link";

import { SiteNav } from "./SiteNav";
import { SERVICE_NAME, SERVICE_ROLE } from "./service";
import s from "./shell.module.css";

export function SiteHeader() {
  return (
    <header className={s.header}>
      <div className={`${s.inner} ${s.headerRow}`}>
        <Link href="/" className={s.wordmark}>
          <span className={s.wordmarkName}>{SERVICE_NAME}</span>
          <span className={s.wordmarkRole}>{SERVICE_ROLE}</span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
