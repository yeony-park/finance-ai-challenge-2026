import type { SVGProps } from "react";

import type { CategoryId } from "@/lib/content/categories";
import type { GuideTarget } from "@/lib/content/home";
import type { VerificationLayer } from "@/lib/verify/contract/category";

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

export function IconLayerExistence(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M6 3.4h7.6L17 6.8v13.8H6V3.4Z" />
      <path d="M13.2 3.4v3.6H17" />
      <path d="m8.6 13.6 2.2 2.2 4.4-4.6" />
    </svg>
  );
}

export function IconLayerPrice(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M4.4 4.4v15.2h15.2" />
      <path d="m7 15.4 3.6-3.8 2.8 2.4 4.6-5.6" />
      <circle cx="18" cy="8.4" r="1.5" />
    </svg>
  );
}

export function IconLayerPerformance(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M18.4 9.6A6.8 6.8 0 0 0 6 8.2" />
      <path d="M6 4.6v3.8h3.8" />
      <path d="M5.6 14.4a6.8 6.8 0 0 0 12.4 1.4" />
      <path d="M18 19.4v-3.8h-3.8" />
    </svg>
  );
}

export function LayerIcon({
  layer,
  ...props
}: IconProps & { readonly layer: VerificationLayer }) {
  if (layer === "existence") return <IconLayerExistence {...props} />;
  if (layer === "price") return <IconLayerPrice {...props} />;
  return <IconLayerPerformance {...props} />;
}

export function IconGuideIntro(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <rect x="4.6" y="4" width="14.8" height="12.6" rx="1.6" />
      <path d="M8 8h8M8 11h5" />
      <circle cx="15.6" cy="15.2" r="2.6" />
      <path d="m14.6 17.4-.8 3 1.8-1.1 1.8 1.1-.8-3" />
    </svg>
  );
}

export function IconGuideProtection(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M4 11.6a8 8 0 0 1 16 0Z" />
      <path d="M12 11.6v6.2a2 2 0 0 0 4 0" />
      <path d="M12 2.8v1" />
    </svg>
  );
}

export function IconGuideLifecycle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <circle cx="5.2" cy="12" r="1.6" />
      <path d="M8.4 12h10.4" />
      <path d="m15.2 8.2 3.8 3.8-3.8 3.8" />
    </svg>
  );
}

export function IconGuideChecklist(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...strokeProps} {...props}>
      <path d="M9.4 6h10M9.4 12h10M9.4 18h10" />
      <path d="m4 5.4 1.2 1.2 2-2.2M4 11.4l1.2 1.2 2-2.2M4 17.4l1.2 1.2 2-2.2" />
    </svg>
  );
}

export function GuideIcon({
  target,
  ...props
}: IconProps & { readonly target: GuideTarget }) {
  if (target === "intro") return <IconGuideIntro {...props} />;
  if (target === "protection") return <IconGuideProtection {...props} />;
  if (target === "lifecycle") return <IconGuideLifecycle {...props} />;
  return <IconGuideChecklist {...props} />;
}
