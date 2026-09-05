"use client";

import { useId, type ReactNode } from "react";
import { AiPanel } from "./AiPanel";
import s from "./ai-assistant.module.css";

export function ProductCopilot({ children }: { readonly children?: ReactNode }) {
  const panelId = useId();
  return (
    <>
      <button className={s.copilotLauncher} type="button" popoverTarget={panelId} aria-label="Copilot 열기" aria-haspopup="dialog">
        <span aria-hidden="true">✦</span> Copilot
      </button>
      <div id={panelId} popover="auto" role="dialog" aria-label="상품 Copilot" className={s.copilotPopover}>
        <button className={s.copilotClose} type="button" popoverTarget={panelId} popoverTargetAction="hide" aria-label="Copilot 닫기">×</button>
        <div key="content">{children ?? (
          <AiPanel title="Copilot">
            <p className={s.lead}>이 상품은 아직 질문할 수 있는 자료가 연결되지 않았습니다.</p>
          </AiPanel>
        )}</div>
      </div>
    </>
  );
}
