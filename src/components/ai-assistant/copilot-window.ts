export interface CopilotFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CopilotViewport { width: number; height: number }
export type CopilotAction = "move" | "resize";

const MARGIN = 16;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function fitCopilotFrame(frame: CopilotFrame, viewport: CopilotViewport): CopilotFrame {
  const maxWidth = Math.max(1, viewport.width - MARGIN * 2);
  const maxHeight = Math.max(1, viewport.height - MARGIN * 2);
  const width = clamp(frame.width, Math.min(320, maxWidth), maxWidth);
  const height = clamp(frame.height, Math.min(280, maxHeight), maxHeight);
  return {
    width,
    height,
    x: clamp(frame.x, MARGIN, viewport.width - MARGIN - width),
    y: clamp(frame.y, MARGIN, viewport.height - MARGIN - height),
  };
}

export function defaultCopilotFrame(viewport: CopilotViewport): CopilotFrame {
  return fitCopilotFrame({ x: viewport.width - 576, y: viewport.height - 656, width: 560, height: 640 }, viewport);
}

export function adjustCopilotFrame(frame: CopilotFrame, action: CopilotAction, dx: number, dy: number, viewport: CopilotViewport): CopilotFrame {
  if (action === "move") return fitCopilotFrame({ ...frame, x: frame.x + dx, y: frame.y + dy }, viewport);
  return fitCopilotFrame({
    ...frame,
    width: Math.min(frame.width + dx, viewport.width - MARGIN - frame.x),
    height: Math.min(frame.height + dy, viewport.height - MARGIN - frame.y),
  }, viewport);
}
