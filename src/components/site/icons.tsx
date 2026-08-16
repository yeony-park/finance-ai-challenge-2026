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
      <circle cx="12" cy="4.6" r="2.1" />
      <path d="M12 6.7v2.1" />
      <rect x="5.8" y="8.8" width="12.4" height="10.6" rx="2" />
      <path d="M8.6 13.2h6.8M8.6 16h4.2" />
    </svg>
  );
}

export function MotifPig(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M3.6 11.3 12 4.8l8.4 6.5" />
      <path d="M5.7 9.9v9.3h12.6V9.9" />
      <path d="M9.9 19.2v-4.6h4.2v4.6" />
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
