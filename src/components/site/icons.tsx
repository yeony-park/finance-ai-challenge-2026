import type { SVGProps } from "react";

import type { CategoryId } from "@/lib/content/categories";

type IconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function MotifCattle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M7.2 5.1C5.7 5.3 4.5 4.6 3.9 3c1.8-.1 3.2.5 4.1 1.7" />
      <path d="M16.8 5.1c1.5.2 2.7-.5 3.3-2.1-1.8-.1-3.2.5-4.1 1.7" />
      <path d="M8 4.7c1.2-.6 2.5-.9 4-.9s2.8.3 4 .9c.9 2 1.2 4.1.9 6.3-.2 1.6-.7 3.1-1.5 4.5-.9 1.6-2 2.8-3.4 3.7-1.4-.9-2.5-2.1-3.4-3.7-.8-1.4-1.3-2.9-1.5-4.5-.3-2.2 0-4.3.9-6.3Z" />
      <path d="M9.2 14.4h5.6" />
      <path d="M10.4 16.8h.01M13.6 16.8h.01" />
      <path d="M9.5 9.6h.01M14.5 9.6h.01" />
    </svg>
  );
}

export function MotifPig(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M7 7.6 5.2 4.4l3.6.8" />
      <path d="M17 7.6l1.8-3.2-3.6.8" />
      <circle cx="12" cy="13" r="7" />
      <ellipse cx="12" cy="14" rx="3" ry="2.1" />
      <path d="M10.9 14h.01M13.1 14h.01" />
      <path d="M8.9 10.2h.01M15.1 10.2h.01" />
    </svg>
  );
}

export function MotifArt(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M12 3.4V6" />
      <rect x="4.2" y="6" width="15.6" height="12.4" rx="1.6" />
      <rect x="7.2" y="9" width="9.6" height="6.4" />
    </svg>
  );
}

export function MotifRealEstate(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <rect x="6.2" y="3.8" width="11.6" height="16.4" rx="1.2" />
      <path d="M9.3 7.5h1.6M13.1 7.5h1.6M9.3 11h1.6M13.1 11h1.6" />
      <path d="M10.6 20.2v-3.6h2.8v3.6" />
    </svg>
  );
}

export function CategoryMotif({
  id,
  ...props
}: IconProps & { readonly id: CategoryId }) {
  if (id === "cattle") return <MotifCattle {...props} />;
  if (id === "pig") return <MotifPig {...props} />;
  if (id === "art") return <MotifArt {...props} />;
  return <MotifRealEstate {...props} />;
}
