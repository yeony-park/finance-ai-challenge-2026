import type { MethodologyAnchor } from "@/app/methodology/anchors";

import { MethodologyLink } from "./MethodologyLink";
import s from "./report.module.css";

export function ReportSectionFooter({
  sources,
  anchor,
  label,
}: {
  readonly sources: readonly string[];
  readonly anchor: MethodologyAnchor;
  readonly label?: string;
}) {
  return (
    <footer className={s.sectionFooter}>
      <p className={s.sectionSources}>
        {sources.map((source) => (
          <span key={source}>{source}</span>
        ))}
      </p>
      <div className={s.sectionMethod}>
        <MethodologyLink anchor={anchor} label={label} />
      </div>
    </footer>
  );
}
