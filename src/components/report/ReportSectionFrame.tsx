import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";

import { reportSectionTitleId } from "./ids";
import s from "./report.module.css";

interface ReportSectionFrameProps {
  readonly headingId: string;
  readonly title: string;
  readonly lead?: ReactNode;
  readonly children: ReactNode;
  readonly additionalContent?: ReactNode;
  readonly footer?: ReactNode;
  readonly muted?: boolean;
  readonly compact?: boolean;
  readonly animated?: boolean;
  readonly wrapClassName?: string;
}

export function ReportSectionFrame({
  headingId,
  title,
  lead,
  children,
  additionalContent,
  footer,
  muted = false,
  compact = false,
  animated = true,
  wrapClassName,
}: ReportSectionFrameProps) {
  const titleId = reportSectionTitleId(headingId);
  const sectionClassName = [
    s.section,
    s.reportContentSection,
    muted ? s.sectionMuted : null,
  ]
    .filter(Boolean)
    .join(" ");
  const contentClassName = [
    s.wrap,
    compact ? s.compactSectionWrap : null,
    wrapClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <header className={`${s.layerHead} ${s.sectionHead}`}>
        <h2 id={titleId} className={s.layerTitle}>
          {title}
        </h2>
        {lead ? <p className={s.sectionLead}>{lead}</p> : null}
      </header>

      {children}
      {additionalContent ? (
        <div className={s.sectionExtension}>{additionalContent}</div>
      ) : null}
      {footer}
    </>
  );

  return (
    <section className={sectionClassName} aria-labelledby={titleId}>
      <span id={headingId} className={s.sectionAnchor} aria-hidden="true" />
      {animated ? (
        <Reveal className={contentClassName}>{content}</Reveal>
      ) : (
        <div className={contentClassName}>{content}</div>
      )}
    </section>
  );
}
