import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";

import content from "./home-content.module.css";
import s from "./IntroBand.module.css";

interface IntroRoadStepProps {
  readonly id?: string;
  readonly index: number;
  readonly title: string;
  readonly body: readonly string[];
  readonly sources?: readonly { readonly url: string; readonly label: string }[];
  readonly action?: ReactNode;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}

const stepNo = (index: number): string => String(index + 1).padStart(2, "0");

export function IntroRoadStep({
  id,
  index,
  title,
  body,
  sources = [],
  action = null,
  isActive,
  onSelect,
}: IntroRoadStepProps) {
  return (
    <Reveal
      as="li"
      id={id}
      className={`${s.roadStep} ${isActive ? s.roadStepActive : ""}`}
    >
      <span className={s.roadNo} aria-hidden="true">
        <svg className={s.roadNoRing} viewBox="0 0 48 48">
          <circle className={s.roadNoTrack} cx="24" cy="24" r="22" />
          <circle
            className={s.roadNoProgress}
            cx="24"
            cy="24"
            r="22"
            pathLength="1"
          />
        </svg>
        <span className={s.roadNoLabel}>{stepNo(index)}</span>
      </span>
      <div className={s.roadBody}>
        <h3 className={`${content.cardTitle} ${s.cardTitle}`}>{title}</h3>
        <div className={s.roadDetails}>
          <div className={`${content.cardBody} ${s.cardBody}`}>
            {body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
      <footer className={s.roadFooter}>
        {sources.length > 0 ? (
          <ul className={`${content.sourceList} ${s.sourceList}`}>
            {sources.map((source) => (
              <li key={source.url}>
                출처:{" "}
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {action}
      </footer>
      {!isActive ? (
        <button
          type="button"
          className={s.roadStepSelect}
          onClick={onSelect}
          aria-label={`${title} 카드 펼치기`}
        />
      ) : null}
    </Reveal>
  );
}
