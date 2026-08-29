import { computeCursorFanProgress, computeScrollFanProgress, FAN_THRESHOLD_PX } from "./fanProgress";

describe("computeCursorFanProgress", () => {
  test("returns 0 when far from the bottom edge", () => {
    expect(computeCursorFanProgress(0, 800)).toBe(0);
  });

  test("returns 1 when the cursor is at the very bottom", () => {
    expect(computeCursorFanProgress(800, 800)).toBe(1);
  });

  test("returns a mid value within the threshold band", () => {
    const mouseY = 800 - FAN_THRESHOLD_PX / 2;
    expect(computeCursorFanProgress(mouseY, 800)).toBeCloseTo(0.5);
  });
});

describe("computeScrollFanProgress", () => {
  test("returns 0 at scrollY 0", () => {
    expect(computeScrollFanProgress(0, 800)).toBe(0);
  });

  test("returns 1 at max scroll", () => {
    expect(computeScrollFanProgress(800, 800)).toBe(1);
  });

  test("returns 0 when scrollableHeight is 0 (no scroll possible)", () => {
    expect(computeScrollFanProgress(0, 0)).toBe(0);
  });
});
