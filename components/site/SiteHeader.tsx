import Link from "next/link";
import { SiteNav } from "./SiteNav";
import s from "./shell.module.css";

export function SiteHeader() {
  return <header className={s.header}><div className={`${s.inner} ${s.headerRow}`}>
    <Link href="/" className={s.wordmark}><span className={s.wordmarkName}>JeomJeom</span><span className={s.wordmarkRole}>조각투자 공시 대조 검증</span></Link>
    <SiteNav />
  </div></header>;
}
