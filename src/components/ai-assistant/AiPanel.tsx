import type { ReactNode } from "react";

import s from "./ai-assistant.module.css";

export function AiPanel({ title, children, busy = false }: {
  readonly title: "AI 요약" | "Copilot";
  readonly children: ReactNode;
  readonly busy?: boolean;
}) {
  return (
    <section className={s.panel} aria-label={title} aria-busy={busy}>
      <h2 className={s.title}>{title}</h2>
      {children}
    </section>
  );
}
