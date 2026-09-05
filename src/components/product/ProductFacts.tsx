import type { ReactNode } from "react";
import s from "./product-facts.module.css";

export function ProductFacts({ children }: { readonly children: ReactNode }) {
  return <dl className={s.facts}>{children}</dl>;
}
