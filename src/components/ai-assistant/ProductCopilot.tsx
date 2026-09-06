"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AiPanel } from "./AiPanel";
import { adjustCopilotFrame, defaultCopilotFrame, fitCopilotFrame, type CopilotAction, type CopilotFrame } from "./copilot-window";
import s from "./ai-assistant.module.css";

export function ProductCopilot({ children }: { readonly children?: ReactNode }) {
  const panelId = useId();
  const [frame, setFrame] = useState<CopilotFrame | null>(null);
  const gesture = useRef<{ action: CopilotAction; x: number; y: number; frame: CopilotFrame } | null>(null);
  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const resize = () => setFrame((current) => current ? fitCopilotFrame(current, viewport()) : null);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const start = (event: PointerEvent<HTMLButtonElement>, action: CopilotAction) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { action, x: event.clientX, y: event.clientY, frame: frame ?? defaultCopilotFrame(viewport()) };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current) return;
    setFrame(adjustCopilotFrame(current.frame, current.action, event.clientX - current.x, event.clientY - current.y, viewport()));
  };
  const stop = () => { gesture.current = null; };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, action: CopilotAction) => {
    const step = event.shiftKey ? 32 : 16;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
    if (!delta) return;
    event.preventDefault();
    setFrame((current) => adjustCopilotFrame(current ?? defaultCopilotFrame(viewport()), action, delta[0], delta[1], viewport()));
  };
  return (
    <>
      <button className={s.copilotLauncher} type="button" popoverTarget={panelId} aria-label="Copilot 열기" aria-haspopup="dialog">
        <span aria-hidden="true">✦</span> Copilot
      </button>
      <div id={panelId} popover="auto" role="dialog" aria-label="상품 Copilot" className={s.copilotPopover}
        style={frame ? { left: frame.x, top: frame.y, width: frame.width, height: frame.height, right: "auto", bottom: "auto" } : undefined}
        onToggle={(event) => {
          if (event.newState === "open") setFrame((current) => current ? fitCopilotFrame(current, viewport()) : defaultCopilotFrame(viewport()));
          else stop();
        }}
      >
        <div className={s.copilotHeader}>
          <button className={s.copilotDrag} type="button" aria-label="Copilot 창 이동" title="드래그하거나 방향키로 창 이동"
            onPointerDown={(event) => start(event, "move")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
            onKeyDown={(event) => keyboard(event, "move")}
          ><span aria-hidden="true">⠿</span> Copilot</button>
          <button className={s.copilotClose} type="button" popoverTarget={panelId} popoverTargetAction="hide" aria-label="Copilot 닫기">×</button>
        </div>
        <div key="content" className={s.copilotBody}>{children ?? (
          <AiPanel title="Copilot">
            <p className={s.lead}>이 상품은 아직 질문할 수 있는 자료가 연결되지 않았습니다.</p>
          </AiPanel>
        )}</div>
        <button className={s.copilotResize} type="button" aria-label="Copilot 창 크기 조절" title="드래그하거나 방향키로 크기 조절"
          onPointerDown={(event) => start(event, "resize")} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
          onKeyDown={(event) => keyboard(event, "resize")}
        ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20 20 8M14 20l6-6" /></svg></button>
      </div>
    </>
  );
}
