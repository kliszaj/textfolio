import { cappedCanvasDpr, INTERACTIVE_CANVAS_DPR_CAP } from "./canvasResolution";

test("caps high-density interactive canvases at 1.5x", () => {
  expect(INTERACTIVE_CANVAS_DPR_CAP).toBe(1.5);
  expect(cappedCanvasDpr(1)).toBe(1);
  expect(cappedCanvasDpr(2)).toBe(1.5);
  expect(cappedCanvasDpr(3)).toBe(1.5);
});

test("falls back safely for invalid pixel ratios", () => {
  expect(cappedCanvasDpr(Number.NaN)).toBe(1);
  expect(cappedCanvasDpr(0)).toBe(1);
});
