/**
 * 앱 셸 헤더 — 워드마크 + 내비. 서비스명이 미확정(가칭)이라 로고 이미지 없이 텍스트로 세운다.
 */
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
