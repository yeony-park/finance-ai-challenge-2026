import type { ReactNode, Ref } from "react";

import s from "./home.module.css";

interface HomeSectionFrameProps {
  readonly id?: string;
  readonly labelledBy: string;
  readonly className?: string;
  readonly containerClassName?: string;
  readonly sectionRef?: Ref<HTMLElement>;
  readonly children: ReactNode;
}

export function HomeSectionFrame({
  id,
  labelledBy,
  className,
  containerClassName,
  sectionRef,
  children,
}: HomeSectionFrameProps) {
  return (
    <section
      ref={sectionRef}
      id={id}
      className={`${s.section} ${className ?? ""}`}
      aria-labelledby={labelledBy}
    >
      <div className={`${s.wrap} ${containerClassName ?? ""}`}>{children}</div>
    </section>
  );
}

interface HomeSectionHeaderProps {
  readonly titleId: string;
  readonly title: ReactNode;
  readonly lead?: ReactNode;
  readonly aside?: ReactNode;
  readonly className?: string;
  readonly titleClassName?: string;
  readonly titleRowClassName?: string;
  readonly children?: ReactNode;
}

export function HomeSectionHeader({
  titleId,
  title,
  lead,
  aside,
  className,
  titleClassName,
  titleRowClassName,
  children,
}: HomeSectionHeaderProps) {
  return (
    <header className={`${s.sectionHead} ${className ?? ""}`}>
      {aside ? (
        <div className={`${s.sectionTitleRow} ${titleRowClassName ?? ""}`}>
          <h2 id={titleId} className={`${s.sectionTitle} ${titleClassName ?? ""}`}>
            {title}
          </h2>
          {aside}
        </div>
      ) : (
        <h2 id={titleId} className={`${s.sectionTitle} ${titleClassName ?? ""}`}>
          {title}
        </h2>
      )}
      {lead ? <p className={s.sectionLead}>{lead}</p> : null}
      {children}
    </header>
  );
}
