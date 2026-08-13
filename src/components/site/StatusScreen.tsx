import type { ReactNode } from "react";

import s from "./status.module.css";

interface StatusScreenProps {
  readonly code: string;
  readonly title: string;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}

export function StatusScreen({ code, title, children, actions }: StatusScreenProps) {
  return (
    <section className={s.wrap} aria-labelledby="status-title">
      <p className={s.code}>{code}</p>
      <h1 id="status-title" className={s.title}>
        {title}
      </h1>
      {children}
      {actions ? <div className={s.actions}>{actions}</div> : null}
    </section>
  );
}
