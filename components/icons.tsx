import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 21V7l8-4v18M12 9h8v12M8 8v1M8 13v1M8 18v1M16 13v1M16 18v1M2 21h20" />
    </svg>
  );
}

export function CattleIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 8 3 5M18 8l3-3M5 12c0-3.3 2.7-6 7-6s7 2.7 7 6v3c0 3.3-2.7 6-7 6s-7-2.7-7-6v-3Z" />
      <path d="M9 14h.01M15 14h.01M10 18h4" />
    </svg>
  );
}

export function PigIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M5 11c0-3.6 3.1-6 7-6 4.4 0 7 2.3 7 6v2c0 3.6-3.1 6-7 6s-7-2.4-7-6v-2Z" />
      <path d="M7 7 5 3l5 2M17 7l2-4-5 2M9 11h.01M15 11h.01M9 15c1.4-1.3 4.6-1.3 6 0v2H9v-2ZM3 12H1" />
    </svg>
  );
}

export function ArtIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="m7 17 4-5 3 3 2-2 2 4M8 8h.01" />
    </svg>
  );
}

export function EvidenceIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 3h8l4 4v14H7zM15 3v5h5M10 12h6M10 16h6" />
      <path d="m3 12 2 2 3-4" />
    </svg>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="m12 3 .8 2.7A5 5 0 0 0 16.3 9l2.7.8-2.7.8a5 5 0 0 0-3.5 3.5L12 17l-.8-2.9a5 5 0 0 0-3.5-3.5L5 9.8 7.7 9a5 5 0 0 0 3.5-3.3L12 3Z" />
      <path d="m19 16 .4 1.2a2.3 2.3 0 0 0 1.4 1.4l1.2.4-1.2.4a2.3 2.3 0 0 0-1.4 1.4L19 22l-.4-1.2a2.3 2.3 0 0 0-1.4-1.4L16 19l1.2-.4a2.3 2.3 0 0 0 1.4-1.4L19 16Z" />
    </svg>
  );
}
