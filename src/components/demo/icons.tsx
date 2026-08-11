/**
 * 데모 화면 전용 스트로크 아이콘 세트.
 * 스프라이트 대신 컴포넌트로 관리한다 — 트리셰이킹과 타입 안전을 위해.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function IconCrosscheck(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M2.2 5.6a5.9 5.9 0 0 1 11.1-1M13.8 10.4a5.9 5.9 0 0 1-11.1 1" />
      <path d="M13.6 1.6v3h-3M2.4 14.4v-3h3M5.4 8.3 7.3 10l3.3-3.7" />
    </svg>
  );
}

export function IconEartag(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M6 2.5h8a1.5 1.5 0 0 1 1.5 1.5v3.2L10 17.5 4.5 7.2V4A1.5 1.5 0 0 1 6 2.5Z" />
      <circle cx="10" cy="5.4" r="1.15" />
      <path d="M7.4 9.2h5.2" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M4 17.5V4.2A1.2 1.2 0 0 1 5.2 3h6.1a1.2 1.2 0 0 1 1.2 1.2v13.3M12.5 7.5H15a1.2 1.2 0 0 1 1.2 1.2v8.8M2.5 17.5h15" />
      <path d="M6.6 6h1.6M6.6 9h1.6M6.6 12h1.6M9.8 6h.9M9.8 9h.9M9.8 12h.9" />
    </svg>
  );
}

export function IconPig(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path d="M3.4 8.2C4.6 5.7 7.1 4.2 10 4.2s5.4 1.5 6.6 4c.5 1.1.5 2.5 0 3.6-1.2 2.5-3.7 4-6.6 4s-5.4-1.5-6.6-4a4.3 4.3 0 0 1 0-3.6Z" />
      <ellipse cx="10" cy="10" rx="2.6" ry="2.1" />
      <path d="M9.1 10h.01M10.9 10h.01M4.6 5.9 3.2 4.3M15.4 5.9l1.4-1.6" />
    </svg>
  );
}

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

export function IconArrow(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" {...props}>
      <path d="M2.5 8h10M9 4.5 12.9 8 9 11.5" />
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
