import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function IconDoc(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M4 1.8h5.2L12.5 5v9.2H4V1.8Z" />
      <path d="M9 1.8V5h3.5M6 8h4.5M6 10.5h4.5" />
    </svg>
  );
}

export function IconDb(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <ellipse cx="8" cy="3.6" rx="5" ry="1.9" />
      <path d="M3 3.6v8.8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V3.6M3 8c0 1 2.2 1.9 5 1.9S13 9 13 8" />
    </svg>
  );
}
export function IconUndo(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M6.5 3 3 6.5 6.5 10" />
      <path d="M3 6.5h6a4 4 0 0 1 0 8H7" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M3 8.6 6.4 12 13 4.5" />
    </svg>
  );
}

export function IconList(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8" />
      <path d="M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeWidth={2} />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 2a4 4 0 0 0-4 4v2.6L2.8 11h10.4L12 8.6V6a4 4 0 0 0-4-4ZM6.5 13.2a1.6 1.6 0 0 0 3 0" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="6.3" />
      <path d="M8 7.2v3.6" />
      <path d="M8 4.9h.01" strokeWidth={2} />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M8 2.2 14.6 13H1.4L8 2.2Z" />
      <path d="M8 6.6v3" />
      <path d="M8 11.6h.01" strokeWidth={2} />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" {...props}>
      <path d="M2.5 1.8v8.4L10 6 2.5 1.8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
