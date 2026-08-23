import Link from "next/link";

import type { MethodologyAnchor } from "@/app/methodology/anchors";

import s from "./report.module.css";

const DEFAULT_LABEL = "이 판정은 어떻게 나왔나요?";

interface MethodologyLinkProps {
  readonly anchor: MethodologyAnchor;
  readonly label?: string;
}

export function MethodologyLink({ anchor, label = DEFAULT_LABEL }: MethodologyLinkProps) {
  return (
    <Link href={`/methodology#${anchor}`} className={s.methodLink}>
      {label}
      <span className={s.methodLinkArrow} aria-hidden="true">
        →
      </span>
    </Link>
  );
}
