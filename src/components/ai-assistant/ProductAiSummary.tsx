import type { ReactNode } from "react";
import { AiSummary } from "@/components/ai-summary/AiSummary";
import s from "./ai-assistant.module.css";

export function ProductAiSummary({ children }: { readonly children?: ReactNode }) {
  return <div className={s.summaryWrap}>{children ?? <AiSummary summary={null} />}</div>;
}
