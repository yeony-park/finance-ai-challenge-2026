import Link from "next/link";

import s from "./report.module.css";

export function ReportBreadcrumb({ href, title, className }: {
  readonly href: string;
  readonly title: string;
  readonly className?: string;
}) {
  return (
    <div className={[s.breadcrumbBar, className].filter(Boolean).join(" ")}>
      <nav className={`${s.wrap} ${s.breadcrumb}`} aria-label="현재 위치">
        <Link href={href} className={s.breadcrumbBack}>
          <span aria-hidden="true">←</span>
          공시
        </Link>
        <span className={s.breadcrumbDivider} aria-hidden="true">/</span>
        <span className={s.breadcrumbCurrent} aria-current="page">{title}</span>
      </nav>
    </div>
  );
}
