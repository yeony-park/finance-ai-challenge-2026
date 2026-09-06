import { describe, expect, test } from "vitest";
import { adjustCopilotFrame, defaultCopilotFrame, fitCopilotFrame } from "./copilot-window";

describe("Copilot 창 위치와 크기", () => {
  const viewport = { width: 1440, height: 900 };
  const frame = defaultCopilotFrame(viewport);

  test("기본 크기는 560×640이고 오른쪽 아래에 열린다", () => {
    expect(frame).toEqual({ x: 864, y: 244, width: 560, height: 640 });
  });
  test("모바일에서는 화면 너비에 맞춰 열린다", () => {
    expect(defaultCopilotFrame({ width: 390, height: 844 })).toEqual({ x: 16, y: 188, width: 358, height: 640 });
  });
  test("드래그는 크기를 유지하고 화면 가장자리에서 멈춘다", () => {
    expect(adjustCopilotFrame(frame, "move", -2000, -2000, viewport)).toEqual({ ...frame, x: 16, y: 16 });
    expect(adjustCopilotFrame(frame, "move", 2000, 2000, viewport)).toEqual(frame);
  });
  test("크기를 줄여도 최소 크기를 유지한다", () => {
    expect(adjustCopilotFrame(frame, "resize", -2000, -2000, viewport)).toEqual({ ...frame, width: 320, height: 280 });
  });
  test("크기를 늘릴 때 위치를 유지하고 화면 안에서 멈춘다", () => {
    const moved = { ...frame, x: 100, y: 100 };
    expect(adjustCopilotFrame(moved, "resize", 2000, 2000, viewport)).toEqual({ x: 100, y: 100, width: 1324, height: 784 });
  });
  test("브라우저가 작아지면 창 크기와 위치도 화면에 맞춘다", () => {
    expect(fitCopilotFrame(frame, { width: 300, height: 250 })).toEqual({ x: 16, y: 16, width: 268, height: 218 });
  });
});
